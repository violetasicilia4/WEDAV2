---
paths:
  - "src/server/**"
  - "src/server.ts"
  - "src/lib/weda/remote.ts"
  - "src/lib/weda/public-api.ts"
  - "src/lib/weda/payments.ts"
  - "src/lib/weda/publish.ts"
  - "src/lib/weda/plans.ts"
  - "src/test/server/**"
  - "e2e/backend.spec.ts"
  - "e2e/payments.spec.ts"
---

# Servidor, datos y dinero

Weda tiene un servidor real: API `/api/*` (`src/server/api.ts` → `service.ts`). Con las variables `SUPABASE_*` usa **Supabase** (OPS-08): PostgreSQL (`pg.ts`), cuentas con Supabase Auth (`accounts.ts`) y archivos en Storage (`storage.ts`); sin ellas, SQLite con `node:sqlite` (`db.ts`), cuentas propias y disco, hasta la limpieza final de OPS-08. Todo pasa por el adaptador asincrónico `Db` (`get`, `all`, `run`, `tx(clave, fn)`). Sesiones por cookie, publicación, aportes con comprobante, correo (Resend) y un adaptador de pagos **de prueba**. Estado vigente, reglas y decisiones: [docs/product-blueprint/](../../docs/product-blueprint/00-product-blueprint.md) y [docs/data-architecture/](../../docs/data-architecture/06-consolidation-report.md). Detalle técnico (fechado): [docs/backend-readiness.md](../../docs/backend-readiness.md).

## Aislamiento y autorización
- La autorización vive en `service.ts` y **toda** consulta filtra por el usuario autenticado. Las rutas de `api.ts` solo parsean, autentican y delegan.
- La API pública no devuelve datos privados (importes, nombres de quien regaló, invitados) ni agregados.
- Todo cambio que toque permisos o filtros por usuario lleva o actualiza una prueba en `src/test/server/auth-isolation.test.ts`.

## Esquema y migraciones
- Las migraciones corren **solas al abrir la base**: en Postgres, `PG_MIGRATIONS` en `pg.ts` (tabla `weda_migrations`); en SQLite, `MIGRATIONS` en `db.ts` (`PRAGMA user_version`). Son de solo agregado: nunca edites ni reordenes una existente; una nueva va al final. Mientras convivan los dos motores, un cambio de esquema va en los dos.
- Toda consulta lleva `await` y las transacciones van con `this.db.tx(clave, async () => …)`, con la clave del casamiento o del usuario: en Postgres es un candado (`pg_advisory_xact_lock`).
- Cambiar el esquema es una decisión difícil de revertir: se propone y se aprueba antes (ver el modelo decidido en `docs/data-architecture/`). No ejecutes SQL a mano ni abras `.data/` ni el proyecto de Supabase por fuera del servidor.

## Dinero, alias y pagos
- Los importes salen del servidor (`plans.ts` y el snapshot publicado), nunca del cliente.
- Weda no verifica transferencias: un aporte queda pendiente hasta que la pareja lo confirma a mano.
- No hay proveedor de pagos real (DP-15). `WEDA_PAYMENTS_PROVIDER=test` y `/pago-de-prueba` existen solo para pruebas automáticas y locales: nunca se enlazan desde la interfaz ni se activan en producción.
- No cambies precios, planes, el trial (14 días, BR-63), la pausa (BR-64), la permanencia sin vencimiento (BR-65) ni reglas de publicación sin una decisión documentada. Planes vigentes: BR-13; permisos por plan y estado: BR-62 y `access()` en `service.ts` (no solo en la interfaz). Pagar publica en el mismo momento (BR-01, PAY-07).

## Secretos y configuración
- Solo las variables `VITE_*` llegan al navegador. Las demás (`WEDA_*`, `RESEND_API_KEY`, `SUPABASE_*`) son de servidor; la clave secreta de Supabase nunca va al cliente; documentá las nuevas en `.env.example` sin valores reales.
- Nunca leas `.env*` ni `.data*/` (bloqueado en `.claude/settings.json`).

## Decisiones abiertas
No implementes nada que dependa de una decisión pendiente (DP-01 a DP-31, en `docs/product-blueprint/03-open-decisions-and-risks.md`) sin la aprobación de la dueña: hosting, proveedor de pagos, reembolsos, requisitos para publicar, condiciones, precios, controles del alias, retención y borrado.
