# Weda

Weda es una plataforma para armar la experiencia digital de un casamiento: una página de invitación, una lista de regalos simbólicos, la gestión de invitados y mesas, y una vista previa de todo lo que van a recibir los invitados. Este repositorio es un **prototipo de frontend**: no tiene backend (ver [Limitaciones](#limitaciones-del-prototipo)).

## Qué incluye hoy

| Parte | Rutas | Descripción |
| --- | --- | --- |
| Landing | `/` | Presentación del producto. |
| Alta | `/crear/*` | Registro (sin cuenta real), nombres, fecha y lugar, foto y elección de plan. |
| Panel de la pareja | `/panel/*` | Inicio, lista de regalos, editor de la página, invitados y mesas, vista previa, perfil. |
| Página de cada pareja | `/sitio/:slug`, `/sitio/:slug/regalos` | La invitación y la lista de regalos con los datos cargados en el panel. |
| Ejemplo | `/ejemplo`, `/ejemplo/regalos` | Página de invitación de muestra. |
| Buscador de invitados | `/encontrar` | Demo con parejas ficticias. |

## Tecnologías

TanStack Start y TanStack Router (rutas por archivo), React 19, TypeScript, Vite, Tailwind CSS 4 (landing), CSS propio para el panel y el micrositio, Radix UI (diálogos), lucide-react (íconos), Vitest y Playwright.

## Requisitos

- Node.js 20.19 o superior y npm.

## Puesta en marcha

```sh
npm install
npm run dev
```

El servidor de desarrollo queda en http://localhost:8080.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (puerto 8080). |
| `npm run build` | Build de producción (`.output/`). |
| `npm run preview` | Sirve la build de producción. |
| `npm run typecheck` | Validación de tipos con TypeScript. |
| `npm run lint` | ESLint. |
| `npm test` | Tests unitarios (Vitest). |
| `npm run test:e2e` | Recorridos en celular con Playwright (necesita un Chromium; si no lo encuentra, exportá `CHROMIUM_PATH`). |

Antes de compartir un cambio: `npm run typecheck && npm run lint && npm test && npm run build`.

## Variables de entorno

Ninguna es obligatoria. Copiá `.env.example` a `.env.local` si querés usarlas.

- `VITE_SITE_URL`: URL pública del sitio (sin barra final), **se lee al compilar**. Con ella la landing emite `canonical`, `og:url` y `og:image` absolutos, y el servidor publica `/sitemap.xml` y la línea `Sitemap:` de `/robots.txt`. Sin ella no se inventa ningún dominio: rutas relativas y sin sitemap (404).
- `WEDA_DB_PATH`, `WEDA_DATA_DIR`, `WEDA_COOKIE_SECURE`, `WEDA_REQUIRE_PAID_ORDER`, `WEDA_ALLOWED_ORIGINS` (solo servidor): base SQLite, comprobantes privados y reglas de publicación. Ver [docs/backend-readiness.md](docs/backend-readiness.md). Necesita Node 22 o más (`node:sqlite`).
- `CHROMIUM_PATH`: ruta a un Chromium para las pruebas E2E.

## Estructura

```
src/
  routes/          Rutas y páginas (un archivo por ruta; ver src/routes/README.md)
  components/      Componentes: panel/ (administración), site/ (página pública), ui/ (button, dialog) y los de la landing
  lib/weda/        Estado y lógica del producto (store local, planes, regalos, invitados, publicación)
  lib/             Utilidades y datos de demostración
  *.css            Estilos: styles.css (landing), panel.css (panel), ejemplo.css / invitacion.css / demo.css (página pública), typography.css (tipografía)
  test/            Tests unitarios
e2e/               Pruebas E2E (Playwright)
public/            Imágenes, fuentes (Geist, local) y video
docs/              Criterio de producto, sistema de diseño, recorridos y auditorías (ver CLAUDE.md)
```

Hay tres contextos visuales que no se mezclan: la landing, el panel (blanco, grises neutros) y la página pública. Detalle en [docs/design-system.md](docs/design-system.md).

## Limitaciones del prototipo

- **Sin backend:** no hay cuentas, pagos, publicación, correos ni sincronización. Registrarse e ingresar solo recuerdan el correo; la clave nunca se guarda.
- Los datos se guardan en el navegador (`localStorage`, clave `weda-app`): cambiar de navegador o borrar los datos del sitio los pierde. «Reiniciar la demo» en el inicio del panel los borra.
- Publicar, el cobro con tarjeta y Mercado Pago no están conectados; la lista de regalos registra aportes simulados desde la vista de invitado.
- Las pruebas E2E (`e2e/`) requieren Chromium y algunas no están al día con los últimos cambios de la interfaz.

## Documentación

- [CLAUDE.md](CLAUDE.md): reglas permanentes del proyecto (también para agentes de IA).
- [docs/product-principles.md](docs/product-principles.md), [docs/design-system.md](docs/design-system.md), [docs/ux-flows.md](docs/ux-flows.md), [docs/panel-frontend.md](docs/panel-frontend.md).
- [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md): decisiones de mantenimiento y pendientes conocidos.
- [docs/auditorias/](docs/auditorias/): auditorías anteriores (históricas, con fecha).
