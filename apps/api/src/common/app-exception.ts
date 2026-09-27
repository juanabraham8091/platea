import { HttpException } from '@nestjs/common';
import { ERROR_CATALOG, ErrorCode } from '@platea/shared';

/**
 * Excepción de dominio de PLATEA. Encapsula un `ErrorCode` del catálogo
 * compartido y traduce a HTTP + mensaje humano. Nunca expone detalle técnico.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, messageOverride?: string) {
    const meta = ERROR_CATALOG[code];
    super(
      { code, message: messageOverride ?? meta.message },
      meta.httpStatus,
    );
    this.code = code;
  }
}
