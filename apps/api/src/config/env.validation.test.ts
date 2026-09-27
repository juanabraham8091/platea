import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
  INVOICE_HASH_SECRET: 'z'.repeat(16),
};

describe('validateEnv', () => {
  it('acepta una configuración mínima válida y aplica defaults', () => {
    const env = validateEnv({ ...base });
    expect(env.API_PORT).toBe(3010);
    expect(env.COMMISSION_AMOUNT_USD).toBe(0.3);
    expect(env.NODE_ENV).toBe('development');
  });

  it('rechaza secretos JWT cortos', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'corto' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rechaza DATABASE_URL ausente', () => {
    const { DATABASE_URL, ...rest } = base;
    void DATABASE_URL;
    expect(() => validateEnv({ ...rest })).toThrow(/DATABASE_URL/);
  });

  it('rechaza secretos de plantilla en producción', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'cambia-esto-por-un-secreto-largo-y-aleatorio-xx',
      }),
    ).toThrow(/producción/);
  });
});
