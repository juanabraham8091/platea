import { z } from 'zod';

/**
 * Validación de variables de entorno (Doc 11 §5).
 * La API NO arranca si la configuración es inválida.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),

  API_PORT: z.coerce.number().int().positive().default(3010),
  CORS_ORIGINS: z.string().default('http://localhost:3011'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  INVOICE_HASH_SECRET: z.string().min(16),

  MFA_ISSUER: z.string().default('PLATEA 2.0'),

  COMMISSION_AMOUNT_USD: z.coerce.number().positive().default(0.3),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  // Refuerzo: en producción, los secretos por defecto de la plantilla no son válidos.
  if (parsed.data.NODE_ENV === 'production') {
    const insecure = [parsed.data.JWT_ACCESS_SECRET, parsed.data.JWT_REFRESH_SECRET].some((s) =>
      s.includes('cambia-esto'),
    );
    if (insecure) throw new Error('Debes definir secretos reales en producción (no los de la plantilla).');
  }
  return parsed.data;
}
