/**
 * Catálogo único de códigos de error de PLATEA 2.0 (Master Doc 6 §1, §10).
 *
 * Cada error tiene un `code` estable (usado por el frontend y los logs) y un
 * `httpStatus`. El `message` que se muestra al usuario es humano y en español;
 * los detalles técnicos NUNCA se exponen (van a logs).
 *
 * Este archivo es la fuente de verdad compartida entre API y web.
 */

export const ErrorCode = {
  // Genéricos
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',

  // Autenticación
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_MFA_INVALID: 'AUTH_MFA_INVALID',
  AUTH_MFA_ALREADY_ENABLED: 'AUTH_MFA_ALREADY_ENABLED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  AUTH_RESET_TOKEN_INVALID: 'AUTH_RESET_TOKEN_INVALID',

  // Tenancy / organización
  ORG_SUSPENDED: 'ORG_SUSPENDED',

  // QR / sesión de mesa (fases posteriores, definidos desde ya)
  QR_INVALID: 'QR_INVALID',
  TABLE_DISABLED: 'TABLE_DISABLED',
  SESSION_NOT_OPEN: 'SESSION_NOT_OPEN',
  SESSION_INVALID_TRANSITION: 'SESSION_INVALID_TRANSITION',

  // Pedidos
  ORDER_PRODUCT_UNAVAILABLE: 'ORDER_PRODUCT_UNAVAILABLE',
  SUBORDER_INVALID_TRANSITION: 'SUBORDER_INVALID_TRANSITION',

  // Facturación / cobros
  INVOICE_INVALID_TRANSITION: 'INVOICE_INVALID_TRANSITION',
  BREAKDOWN_ALREADY_CONFIRMED: 'BREAKDOWN_ALREADY_CONFIRMED',
  IDEMPOTENCY_IN_PROGRESS: 'IDEMPOTENCY_IN_PROGRESS',

  // Reseñas
  REVIEW_NOT_ELIGIBLE: 'REVIEW_NOT_ELIGIBLE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface AppErrorMeta {
  httpStatus: number;
  /** Mensaje por defecto para el usuario (español). Puede sobreescribirse por caso. */
  message: string;
}

export const ERROR_CATALOG: Record<ErrorCode, AppErrorMeta> = {
  VALIDATION_ERROR: { httpStatus: 400, message: 'Los datos enviados no son válidos.' },
  UNAUTHENTICATED: { httpStatus: 401, message: 'Debes iniciar sesión para continuar.' },
  FORBIDDEN: { httpStatus: 403, message: 'No tienes permiso para realizar esta acción.' },
  NOT_FOUND: { httpStatus: 404, message: 'No encontramos lo que buscas.' },
  CONFLICT: { httpStatus: 409, message: 'La operación no se puede completar en este momento.' },
  RATE_LIMITED: { httpStatus: 429, message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' },
  INTERNAL: { httpStatus: 500, message: 'Ocurrió un problema. Estamos trabajando en ello.' },

  AUTH_INVALID_CREDENTIALS: { httpStatus: 401, message: 'Correo o contraseña incorrectos.' },
  AUTH_MFA_REQUIRED: { httpStatus: 401, message: 'Se requiere verificación en dos pasos.' },
  AUTH_MFA_INVALID: { httpStatus: 401, message: 'El código de verificación no es válido.' },
  AUTH_MFA_ALREADY_ENABLED: { httpStatus: 409, message: 'La verificación en dos pasos ya está activada.' },
  AUTH_TOKEN_EXPIRED: { httpStatus: 401, message: 'Tu sesión expiró. Inicia sesión de nuevo.' },
  AUTH_TOKEN_INVALID: { httpStatus: 401, message: 'Tu sesión no es válida. Inicia sesión de nuevo.' },
  AUTH_ACCOUNT_DISABLED: { httpStatus: 403, message: 'Esta cuenta está deshabilitada.' },
  AUTH_RESET_TOKEN_INVALID: { httpStatus: 400, message: 'El enlace de recuperación no es válido o expiró.' },

  ORG_SUSPENDED: { httpStatus: 403, message: 'El acceso de esta organización está suspendido.' },

  QR_INVALID: { httpStatus: 404, message: 'Este código QR no es válido.' },
  TABLE_DISABLED: { httpStatus: 409, message: 'Esta mesa no está disponible en este momento.' },
  SESSION_NOT_OPEN: { httpStatus: 409, message: 'La cuenta de la mesa ya no admite cambios.' },
  SESSION_INVALID_TRANSITION: { httpStatus: 409, message: 'La cuenta no puede cambiar a ese estado.' },

  ORDER_PRODUCT_UNAVAILABLE: { httpStatus: 422, message: 'Algunos productos ya no están disponibles.' },
  SUBORDER_INVALID_TRANSITION: { httpStatus: 409, message: 'El pedido no puede cambiar a ese estado.' },

  INVOICE_INVALID_TRANSITION: { httpStatus: 409, message: 'La factura no puede cambiar a ese estado.' },
  BREAKDOWN_ALREADY_CONFIRMED: { httpStatus: 409, message: 'Este cobro ya fue confirmado.' },
  IDEMPOTENCY_IN_PROGRESS: { httpStatus: 409, message: 'La operación aún se está procesando. Espera un momento.' },

  REVIEW_NOT_ELIGIBLE: { httpStatus: 422, message: 'Solo puedes reseñar negocios donde recibiste tu pedido.' },
};
