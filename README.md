# Weda

Weda es una plataforma para armar la experiencia digital de un casamiento: una página de invitación, una lista de regalos simbólicos, la gestión de invitados y mesas, y una vista previa de todo lo que van a recibir los invitados. El repositorio tiene el frontend y un servidor propio (API `/api/*` con SQLite). Todavía no está listo para producción: ver [Limitaciones](#limitaciones-actuales).

## Qué incluye hoy

| Parte | Rutas | Descripción |
| --- | --- | --- |
| Landing | `/` | Presentación del producto. |
| Alta | `/crear/*` | Registro e ingreso con correo y clave (sesión en el servidor), nombres, fecha y lugar, foto y elección de plan. |
| Clave | `/clave`, `/clave/nueva` | Recuperación de la clave por correo. |
| Panel de la pareja | `/panel/*` | Inicio, lista de regalos, editor de la página, invitados y mesas, vista previa, pago, perfil. |
| Página de cada pareja | `/sitio/:slug`, `/sitio/:slug/regalos` | La invitación y la lista de regalos, armadas en el servidor desde lo publicado. |
| Comprobante | `/comprobante` | El invitado adjunta el comprobante de su aporte desde el enlace del correo. |
| Legales | `/terminos`, `/privacidad` | Términos y privacidad (borradores sin revisión legal). |
| Ejemplo | `/ejemplo`, `/ejemplo/regalos` | Página de invitación de muestra. |
| Buscador de invitados | `/encontrar` | Demo con parejas ficticias. |

## Tecnologías

TanStack Start y TanStack Router (rutas por archivo), React 19, TypeScript, Vite, Tailwind CSS 4 (landing), CSS propio para el panel y el micrositio, Radix UI (diálogos), lucide-react (íconos), Vitest y Playwright.

## Requisitos

- Node.js 22.5 o superior (el servidor usa `node:sqlite`, todavía experimental) y npm.

## Puesta en marcha

```sh
npm install
npm run dev
```

El servidor de desarrollo queda en http://localhost:8080 e incluye la API. La primera vez crea la base en `.data/weda.db` (ignorada por git) y aplica las migraciones.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (puerto 8080). |
| `npm run build` | Build de producción (`.output/`). |
| `npm run preview` | Sirve la build de producción. |
| `npm run typecheck` | Validación de tipos con TypeScript. |
| `npm run lint` | ESLint. |
| `npm test` | Tests de Vitest: unitarios y de integración del servidor (SQLite real en un directorio temporal). |
| `npm run test:e2e` | Recorridos con Playwright en celular y compu (necesita un Chromium; si no lo encuentra, exportá `CHROMIUM_PATH`). Levanta el servidor de desarrollo. |
| `npm run test:explore` | Pruebas exploratorias largas con semilla (`WEDA_SEED`, `WEDA_EXPLORE_N`). |

Antes de compartir un cambio: `npm run typecheck && npm run lint && npm test && npm run build`.

## Variables de entorno

Ninguna es obligatoria. Copiá `.env.example` a `.env.local` si querés usarlas.

- `VITE_SITE_URL`: URL pública del sitio (sin barra final), **se lee al compilar**. Con ella la landing emite `canonical`, `og:url` y `og:image` absolutos, y el servidor publica `/sitemap.xml` y la línea `Sitemap:` de `/robots.txt`. Sin ella no se inventa ningún dominio: rutas relativas y sin sitemap (404).
- `VITE_GOOGLE_MAPS_KEY`: clave de navegador para el buscador de lugares. Vacía = campos de dirección comunes.
- `WEDA_DB_PATH`, `WEDA_DATA_DIR`, `WEDA_COOKIE_SECURE`, `WEDA_REQUIRE_PAID_ORDER`, `WEDA_ALLOWED_ORIGINS`, `WEDA_SECRET`, `WEDA_PUBLIC_URL`, `WEDA_PAYMENTS_PROVIDER`, `RESEND_API_KEY` (solo servidor): base SQLite, comprobantes privados, reglas de publicación, firma de enlaces, pagos de prueba y correo. Ver [.env.example](.env.example) y [docs/backend-readiness.md](docs/backend-readiness.md).
- `CHROMIUM_PATH`: ruta a un Chromium para las pruebas E2E.

## Estructura

```
src/
  routes/          Rutas y páginas (un archivo por ruta; ver src/routes/README.md)
  components/      Componentes: panel/ (administración), site/ (página pública), ui/ (button, dialog) y los de la landing
  lib/weda/        Estado y lógica del producto (store local, sincronización con el servidor, planes, regalos, invitados, publicación)
  lib/             Utilidades y datos de ejemplo
  server/          API, servicio con la autorización, base SQLite y migraciones, correo, pagos, archivos privados
  server.ts        Entrada del servidor: monta /api/*, robots y sitemap
  *.css            Estilos: styles.css (landing), panel.css (panel), ejemplo.css / invitacion.css / demo.css (página pública), typography.css (tipografía)
  test/            Tests unitarios; test/server/ son los de integración del servidor
e2e/               Pruebas E2E (Playwright)
public/            Imágenes, fuentes (Geist, local) y video
docs/              Criterio de producto, sistema de diseño, recorridos y auditorías (ver CLAUDE.md)
```

Hay tres contextos visuales que no se mezclan: la landing, el panel (blanco, grises neutros) y la página pública. Detalle en [docs/design-system.md](docs/design-system.md).

## Limitaciones actuales

Estado completo y decisiones pendientes en [docs/product-blueprint/](docs/product-blueprint/00-product-blueprint.md) (2026-10-31).

- **Sin hosting de producción** (DP-14): SQLite necesita un único servidor con disco persistente; en hosting sin disco (por ejemplo Vercel) la API responde 503 y las cuentas no funcionan.
- **Sin cobro real** (DP-15): solo existe un adaptador de pagos de prueba (`WEDA_PAYMENTS_PROVIDER=test`, nunca cobra). Por defecto publicar no exige pago.
- La vigencia de la publicación en el código es de 6 meses; la decisión de 12 meses con «pagar = activar + publicar» (2026-10-30) todavía no está implementada.
- Sin sesión, el borrador vive solo en el navegador (`localStorage`, clave `weda-app`); con sesión se sincroniza con el servidor.
- El correo sale por Resend solo si hay `RESEND_API_KEY`; sin clave cada intento queda registrado y no se envía. «Ingresar con Google» todavía no está habilitado.
- Los términos y la privacidad son borradores sin revisión legal.
- Las pruebas E2E (`e2e/`) requieren Chromium y algunas no están al día con los últimos cambios de la interfaz.

## Documentación

- [CLAUDE.md](CLAUDE.md) y [.claude/](.claude/): reglas permanentes, reglas por área y permisos para agentes de IA.
- [docs/product-blueprint/](docs/product-blueprint/00-product-blueprint.md): estado real, reglas de negocio, decisiones abiertas y roadmap. [docs/data-architecture/](docs/data-architecture/06-consolidation-report.md): modelo de datos decidido.
- [docs/product-principles.md](docs/product-principles.md), [docs/design-system.md](docs/design-system.md), [docs/ux-flows.md](docs/ux-flows.md), [docs/panel-frontend.md](docs/panel-frontend.md).
- [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md): decisiones de mantenimiento y pendientes conocidos.
- [docs/auditorias/](docs/auditorias/): auditorías anteriores (históricas, con fecha).
