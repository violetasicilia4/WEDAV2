# Decisiones técnicas

Registro breve de decisiones de mantenimiento del repositorio (no de producto; para eso, ver `product-principles.md` y `ux-flows.md`).

## Limpieza del repositorio (2026-10-21)

- **Sin Prettier.** Estaba configurado (`.prettierrc`, plugin de ESLint, script `format`), pero el código nunca se formateó con él: 122 de ~130 archivos no cumplían (comillas simples y líneas largas escritas a mano), así que `npm run lint` mostraba ~7.000 errores de formato y tapaba los reales. Aplicarlo hubiera reescrito todo el repo. Se quitó Prettier y ESLint ahora solo marca problemas de lógica. Si el equipo quiere un formateador, conviene adoptarlo en un cambio aparte, sobre todo el repo de una vez.
- **`src/components/ui/` solo tiene `button` y `dialog`.** Eran los únicos componentes de shadcn en uso; los otros 44 (y 24 paquetes de Radix y otros 12 asociados) no tenían importadores. Se pueden volver a agregar con `npx shadcn add <componente>` (`components.json` se conserva).
- **CSS sin reglas muertas.** Se eliminaron los selectores cuyas clases no aparecen en ningún componente, test ni plantilla (restos del micrositio y de la landing anteriores). Se respetaron las clases armadas dinámicamente (`is-${estado}`, `pn-${tipo}`, etc.), los selectores `:not()/:is()/:where()/:has()` y las clases que agregan librerías (`right-scroll-bar-position`). La verificación fue una comparación de estilos computados de todos los elementos de 19 pantallas (más 3 pestañas de Regalos) en 2 anchos y 2 conjuntos de datos, antes y después: sin diferencias. `typography.css` y las fuentes no se tocaron. Quedan sin uso unas pocas variables CSS (`--olive`, `--forest`, `--line`, `--overlay`, …); no se quitaron por prudencia.
- **Imágenes sin referencias.** Se quitaron de `public/` 46 fotos del catálogo anterior (`lm-*`, `regalo-*`) y `fondo-registro.webp`, sin referencias literales ni armadas por prefijo. Siguen en el historial de Git.
- **Dos implementaciones de «Encontrá tu casamiento».** La ruta `/encontrar` usa `src/lib/demo-couples.ts`; el componente anterior (`find-wedding.tsx`, `lib/encontrar/`, `encontrar.css`, su test y su documento) no estaba conectado a ninguna ruta y se eliminó.
- **`AGENTS.md`** quedó como un puntero a `CLAUDE.md` (tenía instrucciones del clon original que contradecían el proyecto). `roadmap.md` (también del clon original) se eliminó.
- **Auditorías fechadas** movidas a `docs/auditorias/`; `docs/` queda con los documentos vigentes.
- **`.gitignore`:** se agregaron `.env*` (menos `.env.example`), `.claude/`, `.impeccable/*.local.json`, `.impeccable/hook.*` y `capturas/` (ya estaban excluidas de forma local en `.git/info/exclude`).

## Pendientes conocidos

- `npm run test:e2e` no se pudo ejecutar en este entorno (no hay navegadores de Playwright instalados) y varios recorridos de `e2e/` están desactualizados respecto de la interfaz actual (por ejemplo, el alta de mesas). Hay que ponerlos al día antes de usarlos como red de seguridad.
- 11 advertencias de ESLint que no son errores: `react-refresh/only-export-components` en archivos que mezclan proveedor de contexto y hook, y `exhaustive-deps` en el carrusel de testimonios de la landing (efectos que corren una sola vez a propósito).
- Parte de la documentación de auditorías es histórica y describe estados anteriores de la interfaz.
