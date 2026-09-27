import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCode } from '@platea/shared';
import { AppException } from './app-exception';

/**
 * Filtro global de errores. Produce el sobre estándar de error y garantiza que
 * NUNCA se filtren detalles internos al cliente (Master Doc 6 §10, Doc 9 §15).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL;
    let message = 'Ocurrió un problema. Estamos trabajando en ello.';

    if (exception instanceof AppException) {
      httpStatus = exception.getStatus();
      const body = exception.getResponse() as { code: string; message: string };
      code = body.code;
      message = body.message;
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const body = exception.getResponse();
      // Errores de validación de class-validator llegan como { message: string[] }
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const m = (body as { message: unknown }).message;
        message = Array.isArray(m) ? 'Los datos enviados no son válidos.' : String(m);
      }
      code = httpStatus === HttpStatus.BAD_REQUEST ? ErrorCode.VALIDATION_ERROR : mapStatusToCode(httpStatus);
    }

    // Log completo del detalle SOLO en servidor (nunca al cliente).
    if (httpStatus >= 500) {
      this.logger.error(
        { requestId: req.id, path: req.url, method: req.method, err: serializeError(exception) },
        'Error no controlado',
      );
    } else {
      this.logger.warn({ requestId: req.id, path: req.url, code, status: httpStatus }, 'Error de aplicación');
    }

    res.status(httpStatus).json({
      status: 'error',
      error: { code, message },
      request_id: req.id ?? null,
      timestamp: new Date().toISOString(),
    });
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.INTERNAL;
  }
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: String(err) };
}
