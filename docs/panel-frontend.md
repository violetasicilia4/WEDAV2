# Weda · Frontend de creación y gestión de casamientos (MVP sin backend)

**Alcance:** recorrido `Landing → Crear mi evento → Datos del casamiento → Plan → Panel → Configuración → Vista previa`.
Todo funciona **sin backend**: el estado vive en `localStorage` de este navegador. No hay cuentas, pagos, correos ni publicación reales.

## 1. Arquitectura que ya existía (auditoría)

- TanStack Start/Router (rutas por archivo) + React 19 + Vite + Tailwind 4 + Radix Dialog + shadcn (`src/components/ui` conserva solo `button` y `dialog`, que son los que se usan; el resto se puede volver a agregar con `npx shadcn add`).
- `/` landing; `/ejemplo`, `/ejemplo/regalos` casamiento ficticio (Ignacio & Martina); `/encontrar` buscador de invitados.
- Datos de la demo en `src/lib/demo-wedding.ts` (catálogo de 26 regalos, 4 categorías, menús, eventos, dress code…).
- Planes (`src/lib/weda/plans.ts`, única fuente; la landing los muestra en `src/components/landing-plans.tsx`): **Regalos** ARS 95.000, **Invitación** ARS 180.000, **Completo** ARS 320.000, por evento y acumulativos.
- No existía ningún flujo de registro ni de creación de evento, ni panel.

## 2. Rutas

| Ruta | Qué es |
|---|---|
| `/crear/cuenta` | Paso 1: cuenta (solo interfaz, no guarda nada). |
| `/crear` | Paso 2: nombres y fecha (opcional). |
| `/crear/foto` | Paso 3: foto de la pareja (omitible; se puede cambiar después desde el panel). |
| `/crear/plan` | Redirige a `/panel`: el plan se elige al publicar, en un diálogo del panel. |
| `/panel` | Resumen y próximo paso. |
| `/panel/regalos` | Tres pestañas: **Mi lista** (orden, edición, quitar), **Agregar regalos** (sets + catálogo en una sola vista, con la tarjeta «Crear regalo» al principio) y **Recibidos** (quién regaló qué, monto, medio, fecha y mensaje). Arriba, «Cobro y portada»: alias, preferencia de tarjeta (sin cobro real) y portada. |
| `/panel/invitados` | Invitados (tabla en la compu, tarjetas en el celular), búsqueda, filtros, alta manual. |
| `/panel/mesas` | Grupos y mesas. |
| `/panel/sitio` | Editor del sitio por bloques con vista previa en vivo. |
| `/panel/perfil` | Perfil: «Datos del casamiento» (nombres, fecha, lugar y foto; mismo formulario `CoupleForm` que el diálogo del inicio) y «Tu cuenta» (correo, clave, cerrar sesión). No está en el menú: se entra por el bloque de la pareja arriba del menú (web) o el avatar arriba a la derecha (celular). |
| `/panel/vista-previa` | «Vista previa»: la página pública real en celular o compu. |
| `/sitio/$slug`, `/sitio/$slug/regalos` | Página pública **simulada** de la pareja (ej.: `/sitio/tomas-y-martina`). Mismos componentes que `/ejemplo`. |

Modificadas: `/ejemplo*` (ahora usan los componentes compartidos; se ve y funciona igual), landing (los CTA «Crear mi evento», «Crear mi lista de regalos» y «Elegir plan» llevan a `/crear/cuenta`), barra flotante.
`/ejemplo`, `/encontrar`, `/crear`, `/panel` y `/sitio` llevan `noindex` (meta + cabecera `X-Robots-Tag`, que también se envía en cualquier 404). `/robots.txt` y `/sitemap.xml` los genera `src/server.ts` con `src/lib/site.ts`; los metadatos de cada página salen de `pageMeta()` (misma fuente). Estado de SEO y producción: [frontend-production-readiness.md](frontend-production-readiness.md).
Se eligió `/sitio/$slug` y no `/$slug` para no chocar con las rutas existentes; el slug se normaliza (`Tomás & Martina` → `tomas-y-martina`).

## 3. Componentes reutilizados / compartidos

- **Página pública**: `ejemplo.index.tsx`, `ejemplo.regalos.tsx` y el layout de `/ejemplo` se movieron a `src/components/site/` (`invitation.tsx`, `gifts-page.tsx`, `site-shell.tsx`, `site-cover.tsx`). Leen todo de un contexto (`useSite()`); `/ejemplo` le pasa los datos de la demo y `/sitio/$slug` los de la pareja. No hay una segunda página de regalos.
- `rsvp-dialog.tsx` (formulario de confirmación) se reutiliza tal cual; ahora toma menús y fecha límite del sitio y avisa al panel al enviar.
- Estilos del ejemplo (`ejemplo.css`, `invitacion.css`, `demo.css`) sin cambios de diseño.
- Administración: identidad de la landing (Geist, azul `#707d87`, `#5A646C`, `#8A959E`, papel `#f5f2eb`, botones en píldora) en `src/panel.css`.

## 4. Estado local y preparación para backend

```
src/lib/weda/
  types.ts       modelos (AppState, ListGift, Guest, Group, SiteConfig, …)
  plans.ts       planes y matriz de funciones
  catalog.ts     sets de regalos (salen del catálogo existente)
  logic.ts       lógica pura: validaciones, regalos, invitados, RSVP, grupos, avance
  journey.ts     recorrido del Inicio: etapas, progreso único y siguiente paso recomendado
  store.ts       almacén local (localStorage), sincronización entre pestañas/iframes, saneado de datos viejos
  images.ts      carga local de imágenes
  seed.ts        escenario Tomás y Martina
  site-model.tsx datos de la página pública (demo o pareja)
```

- Un solo `AppState` (versión 1). La lista de regalos, los invitados y la vista previa leen del mismo origen.
- **Persistencia:** `localStorage` clave `weda-app`. Se recupera al volver; datos ausentes, corruptos o de otra versión → arranca vacío sin errores. «Reiniciar la demo» borra todo.
- **Vista previa en vivo:** es un iframe con la página pública real (`/sitio/$slug`); comparte `localStorage` y se actualiza por el evento `storage`, sin recargar.
- **Imágenes:** se leen en el navegador, se reducen (máx. 1100–1600 px, JPEG 82 %) y se guardan como data URL. **Limitación:** `localStorage` admite ~5 MB; si se llena, el panel avisa y los cambios quedan solo en memoria. Con una API, se subirían a un bucket y se guardaría la URL.
- Reemplazar el almacenamiento por una API implica cambiar `store.ts` (`update`, `getState`, `reset`) y `images.ts`; los componentes no cambian.

## 5. Matriz de planes (y su supuesto)

| Función | Regalos | Invitación | Completo |
|---|---|---|---|
| Lista de regalos, alias/tarjeta y registro de regalos recibidos | sí | sí | sí |
| Micrositio (portada, eventos con Google Maps, foto principal, dress code, cuenta regresiva) | no | sí | sí |
| Confirmación de asistencia (RSVP) | no | sí | sí |
| Invitados (panel de respuestas) y mesas/grupos | no | sí | sí |
| Música de la fiesta (solo configuración y vista previa; sin conexión real a Spotify) | no | no | sí |
| Galería de fotos con hashtag e Instagram | no | no | sí |
| Mensaje final personalizado | no | no | sí |

Los precios son de referencia, **por evento**, y viven solo en `src/lib/weda/plans.ts`. No se afirma pago único, ausencia de suscripción ni duración de la publicación (sin definir). Los planes son acumulativos.

Sin plan elegido (prueba gratuita) `can()` devuelve verdadero para todo. Las restricciones se aplican al mostrar y solo con plan elegido: al bajar de plan los datos se conservan como borrador. Qué hay cargado y no se incluye: `draftsFor()`.

## 6. Qué es real en el frontend y qué depende del backend

| Real (local) | Depende de un backend |
|---|---|
| Crear evento, elegir/cambiar plan, panel, lista de regalos, invitados, grupos, editor, vista previa, persistencia en el navegador | Cuentas y autenticación; publicación del sitio y dirección pública; cobro y precios; enviar correos o mensajes (RSVP, regalos); recibir dinero (el alias es solo texto); subir imágenes a un servidor; que las respuestas de invitados reales lleguen al panel desde otros dispositivos |

El RSVP público y el regalo público **actualizan el estado local**; no avisan a nadie. «Publicar» recorre un pago **simulado** (sin cobro real, sin servicio): guarda `state.publication` localmente (`payments.ts`).

## 7. Decisiones y pendientes

- **Registro:** no existía ningún formulario de cuenta, así que el alta es solo «datos del casamiento» (nombres, fecha, foto). No se pide email ni contraseña porque no habría nada que autenticar; se aclara que es una demostración.
- **Restricción alimentaria:** el formulario existente usa una sola lista (`menus`) que cumple de menú y de restricción; se mantiene un único campo.
- **Precios:** no definidos → «El precio se informa al publicar».
- **Moneda:** solo pesos argentinos (como el catálogo existente).
- **Sin definir en el repositorio (quedó conservador):** límites de capacidad de mesas, comisiones, qué incluye exactamente «sitio premium», eventos adicionales (solo ceremonia, recepción y fiesta, como en `/ejemplo`).
- **Tarjeta como método de pago** en el pop-up de regalar: ya existía en la demo («Para este ejemplo, usá el alias»); no se tocó.
- Los invitados del plan «Regalos» no tienen invitación: `/sitio/$slug` redirige a la lista de regalos.

## 8. Mejoras de UX (auditoría de uso)

- **Inicio** (`/panel`): bienvenida, progreso único y cuatro etapas con estado Sin empezar / En progreso / Lista para revisar / Completada (`src/lib/weda/journey.ts`: `stages`, `progress`, `nextAction`), derivado de los datos reales. Detalle y supuestos en `ux-flows.md` §4.
- **Guardado:** aviso «Cambios guardados en este dispositivo» (o «No se pudieron guardar…»); no hay botón guardar y no se dice que haya nube ni cuenta.
- **Tu página web** (`/panel/sitio`): cada sección dice qué ve el invitado, su estado y tiene «Mostrar»; una sola abierta a la vez; al abrirla la vista previa se lleva a esa sección; «Ver cómo queda»; ocultar no borra lo cargado.
- **Vista previa:** vuelta directa al editor o a los regalos.
- **Invitados:** filtros por estado con cantidades (Confirmaron / Sin responder / No asisten). **Mesas:** primero quienes no tienen lugar.
- **Nombres:** «Inicio», «Tu página», «Tu página web».

## 9. Segunda ronda de UX

- **Tu página:** la vista previa del editor siempre es el celular (45/55 en desktop; en celular se abre la vista previa y se edita desde «Editar mi página»), con «Abrir vista limpia». Los momentos del día son hasta tres eventos opcionales con **nombre propio** («Evento 1, 2, 3» si no le ponen nombre). La portada tiene foto, nombres, fecha y un texto sobre los nombres que puede quedar vacío. La confirmación de asistencia es solo mostrar/ocultar. Corregido: sin ningún evento visible, «Save the date» salía con otra tipografía (las reglas serif dependían de que existiera la sección de eventos).
- **Invitados y mesas** son una sola pantalla (`/panel/invitados`, solapas «Invitados» y «Mesas y grupos»); `/panel/mesas` redirige. **Exportar** a .xlsx (todo, con grupo y origen) e **importar** .xlsx o .csv con las columnas Nombre, Apellido, Asistencia y Restricción alimentaria, con modelo descargable y vista previa de lo que se va a importar (sin dependencias nuevas: `lib/weda/xlsx.ts`, `guests-io.ts`).
- **Regalos:** solapas Elegí tus regalos / Cómo vas a recibirlos / Revisá tu lista / Recibidos (con resumen de la selección: `SelectionSummary`). Los sets son fichas con foto: tocarlas agrega o quita todo el set, y el ícono de lista abre una ventana para elegir de a uno. En «Mis regalos» las tarjetas se ordenan arrastrando (`SortableGrid`: mouse, o mantener apretado en el celular; Alt + flechas con teclado) y tocar una abre su edición. «Cobro» separa el alias bancario de Mercado Pago (marcado «Próximamente», sin conexión). La portada de la lista usa la foto del casamiento.

## 10. Pruebas

- Unitarias: `npx vitest run` (lógica y rutas).
- Recorridos en celular: `npm run test:e2e` (Playwright, viewport emulado de 390 px y anchos 320–430; levanta `vite dev` en el puerto 8080). Si no encuentra el navegador: `CHROMIUM_PATH=/ruta/a/chromium npm run test:e2e`. Incluyen `e2e/landing-mobile.spec.ts` (barra translúcida, hero, planes, anclas y escritorio sin cambios) y `e2e/global-setup.ts` (precalienta el servidor de desarrollo). Cubren Inicio → Regalos, cobro, editor con vista previa, secciones, invitados (alta, importación, exportación), mesas y resumen de publicación, y que no haya scroll horizontal. No reemplazan pruebas en dispositivos reales.
