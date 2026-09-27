import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from '../common/app-exception';
import { ErrorCode } from '@platea/shared';
import { TokenService } from './jwt.strategy';

/** Marca una ruta como pública (sin autenticación de staff). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Guard de autenticación para staff. Extrae el Bearer token, lo verifica y
 * adjunta la identidad a la request. Zero Trust: sin token válido, no pasa.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppException(ErrorCode.UNAUTHENTICATED);
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      req.user = await this.tokens.verifyAccess(token);
      return true;
    } catch {
      throw new AppException(ErrorCode.AUTH_TOKEN_INVALID);
    }
  }
}
