import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@platea/shared';
import type { AuthUser } from './current-user';

export interface AccessTokenPayload {
  sub: string;
  organizationId: string | null;
  roles: Role[];
  foodTruckId: string | null;
  type: 'access';
}

/**
 * Verificación de access tokens. Centraliza la firma/validación para que el
 * guard no repita lógica.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async verifyAccess(token: string): Promise<AuthUser> {
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
    if (payload.type !== 'access') {
      throw new Error('Tipo de token inválido');
    }
    return {
      userId: payload.sub,
      organizationId: payload.organizationId ?? null,
      roles: payload.roles ?? [],
      foodTruckId: payload.foodTruckId ?? null,
    };
  }
}
