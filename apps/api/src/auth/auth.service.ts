import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as crypto from 'node:crypto';
import * as QRCode from 'qrcode';
import { OrgStatus, UserStatus } from '@prisma/client';
import { Role } from '@platea/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCode } from '@platea/shared';
import type { AccessTokenPayload } from './jwt.strategy';

export interface RequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type LoginResult =
  | { mfaRequired: true; challengeToken: string }
  | ({ mfaRequired: false } & TokenPair);

/**
 * Servicio de autenticación (Doc 9, Libros II/VI).
 * - Contraseñas y refresh tokens con argon2id (nunca texto plano).
 * - Access token JWT corto + refresh token rotado y revocable.
 * - MFA TOTP para administradores (D7).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly argonOpts: argon2.Options = { type: argon2.argon2id };

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ── Password hashing ──────────────────────────────────────────────
  hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, this.argonOpts);
  }

  private verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain).catch(() => false);
  }

  // ── Login ─────────────────────────────────────────────────────────
  async login(email: string, password: string, ctx: RequestContext): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true, userRoles: true },
    });

    // Mensaje genérico para no revelar si el correo existe (Doc 9 §10: enumeración).
    if (!user) {
      await this.audit.record({ action: 'auth.login.failed', entity: 'user', ...ctx, newValue: { email } });
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    const valid = await this.verifyPassword(user.passwordHash, password);
    if (!valid) {
      await this.audit.record({ action: 'auth.login.failed', entity: 'user', entityId: user.id, ...ctx });
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    if (user.status === UserStatus.DISABLED) {
      throw new AppException(ErrorCode.AUTH_ACCOUNT_DISABLED);
    }
    if (user.organization && user.organization.status !== OrgStatus.ACTIVE) {
      throw new AppException(ErrorCode.ORG_SUSPENDED);
    }

    // MFA: si está activada, emitir challenge y NO tokens todavía.
    if (user.mfaEnabled) {
      const challengeToken = await this.jwt.signAsync(
        { sub: user.id, type: 'mfa_challenge' },
        { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '5m' },
      );
      return { mfaRequired: true, challengeToken };
    }

    const tokens = await this.issueTokens(user.id);
    await this.afterLogin(user.id, ctx);
    return { mfaRequired: false, ...tokens };
  }

  async verifyMfa(challengeToken: string, code: string, ctx: RequestContext): Promise<TokenPair> {
    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(challengeToken, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'mfa_challenge') throw new Error('tipo inválido');
      userId = payload.sub;
    } catch {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new AppException(ErrorCode.AUTH_MFA_INVALID);
    }
    const ok = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!ok) {
      await this.audit.record({ action: 'auth.mfa.failed', entity: 'user', entityId: user.id, ...ctx });
      throw new AppException(ErrorCode.AUTH_MFA_INVALID);
    }
    const tokens = await this.issueTokens(user.id);
    await this.afterLogin(user.id, ctx);
    return tokens;
  }

  // ── MFA setup / activate (D7) ─────────────────────────────────────
  async setupMfa(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled) throw new AppException(ErrorCode.AUTH_MFA_ALREADY_ENABLED);

    const secret = authenticator.generateSecret();
    const issuer = this.config.getOrThrow<string>('MFA_ISSUER');
    const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Guardar el secreto provisionalmente (aún no habilitado hasta confirmar código).
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    return { secret, otpauthUrl, qrDataUrl };
  }

  async activateMfa(userId: string, code: string, ctx: RequestContext): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled) throw new AppException(ErrorCode.AUTH_MFA_ALREADY_ENABLED);
    if (!user.mfaSecret) throw new AppException(ErrorCode.AUTH_MFA_INVALID);
    if (!authenticator.verify({ token: code, secret: user.mfaSecret })) {
      throw new AppException(ErrorCode.AUTH_MFA_INVALID);
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await this.audit.record({ action: 'auth.mfa.activated', entity: 'user', entityId: userId, ...ctx });
  }

  // ── Tokens ────────────────────────────────────────────────────────
  private async issueTokens(userId: string): Promise<TokenPair> {
    const roles = await this.prisma.userRole.findMany({ where: { userId } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const roleNames = roles.map((r) => r.role as unknown as Role);
    const foodTruckId = roles.find((r) => r.foodTruckId)?.foodTruckId ?? null;

    const payload: AccessTokenPayload = {
      sub: userId,
      organizationId: user.organizationId,
      roles: roleNames,
      foodTruckId,
      type: 'access',
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow('JWT_ACCESS_TTL'),
    });

    // Refresh token: valor aleatorio opaco; en BD se guarda solo su hash.
    const refreshRaw = crypto.randomBytes(48).toString('base64url');
    const refreshToken = `${userId}.${refreshRaw}`;
    const tokenHash = this.hashToken(refreshToken);
    const ttlDays = this.parseDays(this.config.getOrThrow('JWT_REFRESH_TTL'));
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  /** Rotación segura: valida el refresh, lo revoca y emite un par nuevo. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const [userId] = refreshToken.split('.');
    if (!userId) throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({ where: { tokenHash, userId } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppException(ErrorCode.AUTH_TOKEN_EXPIRED);
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(userId);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revocar todas las sesiones del usuario.
      await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
  }

  // ── Recuperación de contraseña ────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // Respuesta idéntica exista o no el usuario (no enumeración).
    if (!user) return;
    const raw = crypto.randomBytes(32).toString('base64url');
    const token = `${user.id}.${raw}`;
    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: this.hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    // TODO(fase infra): enviar email real con el enlace. En dev va a MailHog.
    this.logger.log(`[dev] Enlace de recuperación para ${email}: token=${token}`);
  }

  async resetPassword(token: string, newPassword: string, ctx: RequestContext): Promise<void> {
    const [userId] = token.split('.');
    if (!userId) throw new AppException(ErrorCode.AUTH_RESET_TOKEN_INVALID);
    const reset = await this.prisma.passwordReset.findFirst({ where: { tokenHash: this.hashToken(token), userId } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new AppException(ErrorCode.AUTH_RESET_TOKEN_INVALID);
    }
    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      // Invalidar todas las sesiones tras cambiar la contraseña.
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.record({ action: 'auth.password.reset', entity: 'user', entityId: userId, ...ctx });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  private async afterLogin(userId: string, ctx: RequestContext): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ action: 'auth.login.success', entity: 'user', entityId: userId, ...ctx });
  }

  private hashToken(token: string): string {
    // HMAC-SHA256 con secreto de servidor: rápido y suficiente para tokens
    // opacos de alta entropía (no son contraseñas de usuario).
    return crypto
      .createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET'))
      .update(token)
      .digest('hex');
  }

  private parseDays(ttl: string): number {
    const m = /^(\d+)d$/.exec(ttl);
    return m ? parseInt(m[1], 10) : 7;
  }
}
