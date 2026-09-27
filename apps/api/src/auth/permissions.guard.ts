import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { anyRoleHasPermission, Permission } from '@platea/shared';
import { AppException } from '../common/app-exception';
import { ErrorCode } from '@platea/shared';
import type { AuthUser } from './current-user';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Exige uno o más permisos para acceder a la ruta (Master Doc 6 §7). */
export const RequirePermissions = (...perms: Permission[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, perms);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user) throw new AppException(ErrorCode.UNAUTHENTICATED);

    const ok = required.every((perm) => anyRoleHasPermission(user.roles, perm));
    if (!ok) throw new AppException(ErrorCode.FORBIDDEN);
    return true;
  }
}
