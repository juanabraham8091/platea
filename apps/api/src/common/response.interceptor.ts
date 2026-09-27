import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

/**
 * Envuelve toda respuesta exitosa en el sobre estándar (Master Doc 6 §9):
 * { status: "success", data, request_id, timestamp }
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { id?: string }>();
    return next.handle().pipe(
      map((data) => ({
        status: 'success',
        data: data ?? null,
        request_id: req.id ?? null,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
