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

Weda tiene un servidor real: API `/api/*` (`src/server/api.ts` → `service.ts`), base SQLite con `node:sqlite` (`db.ts`), sesiones por cookie, publicación, aportes con comprobante, correo (Resend) y un adaptador de pagos **de prueba**. Estado vigente, reglas y decisiones: [docs/product-blueprint/](../../docs/product-blueprint/00-product-blueprint.md) y [docs/data-architecture/](../../docs/data-architecture/06-consolidation-report.md). Detalle técnico (fechado): [docs/backend-readiness.md](../../docs/backend-readiness.md).

## Aislamiento y autorización
- La autorización vive en `service.ts` y **toda** consulta filtra por el usuario autenticado. Las rutas de `api.ts` solo parsean, autentican y delegan.
- La API pública no devuelve datos privados (importes, nombres de quien regaló, invitados) ni agregados.
- Todo cambio que toque permisos o filtros por usuario lleva o actualiza una prueba en `src/test/server/auth-isolation.test.ts`.

## Esquema y migraciones
- Las migraciones corren **solas al abrir la base** (`MIGRATIONS` en `db.ts`, `PRAGMA user_version`). Son de solo agregado: nunca edites ni reordenes una existente; una nueva va al final.
- Cambiar el esquema es una decisión difícil de revertir: se propone y se aprueba antes (ver el modelo decidido en `docs/data-architecture/`). No ejecutes SQL a mano ni abras `.data/`.

## Dinero, alias y pagos
- Los importes salen del servidor (`plans.ts` y el snapshot publicado), nunca del cliente.
- Weda no verifica transferencias: un aporte queda pendiente hasta que la pareja lo confirma a mano.
- No hay proveedor de pagos real (DP-15). `WEDA_PAYMENTS_PROVIDER=test` y `/pago-de-prueba` existen solo para pruebas automáticas y locales: nunca se enlazan desde la interfaz ni se activan en producción.
- No cambies precios, planes, vigencia (hoy 6 meses en el código; la decisión de 12 meses todavía no está implementada) ni reglas de publicación sin una decisión documentada.

## Secretos y configuración
- Solo las variables `VITE_*` llegan al navegador. Las demás (`WEDA_*`, `RESEND_API_KEY`) son de servidor; documentá las nuevas en `.env.example` sin valores reales.
- Nunca leas `.env*` ni `.data*/` (bloqueado en `.claude/settings.json`).

## Decisiones abiertas
No implementes nada que dependa de una decisión pendiente (DP-01 a DP-22, en `docs/product-blueprint/03-open-decisions-and-risks.md`) sin la aprobación de la dueña: hosting, proveedor de pagos, reembolsos, requisitos para publicar, condiciones, precios, controles del alias, retención y borrado.
