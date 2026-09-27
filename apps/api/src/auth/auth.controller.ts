import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService, RequestContext } from './auth.service';
import { CurrentUser, AuthUser } from './current-user';
import { Public } from './jwt-auth.guard';
import {
  ForgotPasswordDto,
  LoginDto,
  MfaActivateDto,
  MfaVerifyDto,
  RefreshDto,
  ResetPasswordDto,
} from './dto';

function ctxOf(req: Request): RequestContext {
  return { ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // Doc 12 §6: 5/min
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, ctxOf(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('mfa/verify')
  @HttpCode(200)
  verifyMfa(@Body() dto: MfaVerifyDto, @Req() req: Request) {
    return this.auth.verifyMfa(dto.challengeToken, dto.code, ctxOf(req));
  }

  @Post('mfa/setup')
  @HttpCode(200)
  setupMfa(@CurrentUser() user: AuthUser) {
    return this.auth.setupMfa(user.userId);
  }

  @Post('mfa/activate')
  @HttpCode(200)
  async activateMfa(@CurrentUser() user: AuthUser, @Body() dto: MfaActivateDto, @Req() req: Request) {
    await this.auth.activateMfa(user.userId, dto.code, ctxOf(req));
    return { activated: true };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser, @Body() dto: Partial<RefreshDto>) {
    await this.auth.logout(user.userId, dto.refreshToken);
    return { loggedOut: true };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    // Respuesta genérica siempre (no enumeración).
    return { message: 'Si el correo existe, enviamos instrucciones de recuperación.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.auth.resetPassword(dto.token, dto.newPassword, ctxOf(req));
    return { message: 'Contraseña actualizada. Inicia sesión de nuevo.' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
