import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@platea/shared';

/**
 * Identidad autenticada adjuntada a la request por el JwtAuthGuard.
 */
export interface AuthUser {
  userId: string;
  organizationId: string | null;
  roles: Role[];
  /** Truck al que pertenece (si el rol es de food truck). */
  foodTruckId: string | null;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  return req.user;
});
