# PLATEA 2.0

Plataforma SaaS para Food Truck Parks. Monorepo (pnpm) con API (NestJS) y web (Next.js/PWA).

> **Documentación oficial:** `docs/`. Empieza por [`docs/INDEX.md`](docs/INDEX.md).
> Las decisiones vinculantes están en [`docs/DECISIONES.md`](docs/DECISIONES.md) (prevalece sobre todo lo demás).

## Estado

**Fase 1 — Fundación** (en curso): monorepo, base de datos + migraciones, autenticación (argon2 + JWT con rotación de refresh + MFA TOTP), roles y permisos, auditoría, salud. Siguientes fases en `docs/master-documents/02-MVP-PLAN-CONSTRUCCION.md`.

## Requisitos

- **Node.js ≥ 20.11** y **pnpm 9** (`corepack enable` activa pnpm).
- **Docker** (para PostgreSQL y Redis locales).

> ⚠️ **Nota de entorno (Windows):** al preparar este proyecto, Windows Defender bloqueó la instalación de Node.js marcándola como software no deseado (falso positivo conocido con la distribución de Node). Instala Node.js desde https://nodejs.org (instalador LTS oficial, firmado) y, si Defender vuelve a bloquearlo, resuelve el falso positivo desde la propia interfaz de Windows Seguridad. No modificamos ajustes de seguridad automáticamente.

## Estructura

```
apps/
  api/        NestJS — REST /api/v1 + (WebSocket en fases siguientes)
  web/        Next.js — PWA cliente + paneles (scaffold en Fase 1)
packages/
  shared/     Dominio puro: errores, roles/permisos, máquinas de estado, cálculo de cuenta
docs/         Documentación oficial (constitución, master docs, diseño, decisiones)
```

## Puesta en marcha (desarrollo)

```bash
# 1. Instalar dependencias
corepack enable
pnpm install

# 2. Variables de entorno
cp .env.example .env            # y ajusta los secretos

# 3. Servicios locales (Postgres 5433, Redis 6380, MailHog 8025)
pnpm docker:up

# 4. Base de datos: generar cliente + migrar + datos de prueba
pnpm --filter @platea/shared build          # el shared debe compilarse antes que la API
pnpm --filter @platea/api prisma:generate
pnpm --filter @platea/api prisma:migrate     # crea la migración inicial
pnpm --filter @platea/api prisma:seed

# 5. Arrancar
pnpm dev:api                    # http://localhost:3010/api/v1
pnpm dev:web                    # http://localhost:3011
```

Puertos elegidos para no chocar con otros proyectos locales: API 3010, web 3011, Postgres 5433, Redis 6380.

## Verificación (lo que debe pasar)

```bash
pnpm --filter @platea/shared build && pnpm --filter @platea/shared test   # dominio + finanzas
pnpm --filter @platea/api prisma:generate
pnpm -r typecheck
pnpm test
curl http://localhost:3010/api/v1/health/live     # {"status":"success","data":{"status":"ok",...}}
curl http://localhost:3010/api/v1/health/ready    # {"status":"success","data":{"status":"ok","db":"up"}}
```

Usuarios de prueba tras el seed (contraseña `Platea2026!`):
`admin@platea.do` (SUPER_ADMIN), `parque@platea.do` (PARK_ADMIN), `owner1..3@platea.do` (dueños de food truck).

### Prueba rápida de login

```bash
curl -X POST http://localhost:3010/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@platea.do","password":"Platea2026!"}'
# → { status:"success", data:{ mfaRequired:false, accessToken, refreshToken } }
```

## Calidad

- `pnpm typecheck` — TypeScript estricto en todo el monorepo.
- `pnpm test` — Vitest. El dominio financiero (`packages/shared`) exige ≥90% de cobertura (Doc 12).
- `pnpm lint` — ESLint.
- CI en `.github/workflows/ci.yml` (build → lint → typecheck → migraciones → tests).
