# Weda · Frontend de creación y gestión de casamientos (MVP sin backend)

**Alcance:** recorrido `Landing → Crear mi evento → Datos del casamiento → Plan → Panel → Configuración → Vista previa`.
Todo funciona **sin backend**: el estado vive en `localStorage` de este navegador. No hay cuentas, pagos, correos ni publicación reales.

## 1. Arquitectura que ya existía (auditoría)

- TanStack Start/Router (rutas por archivo) + React 19 + Vite + Tailwind 4 + Radix/shadcn (`src/components/ui`).
- `/` landing; `/ejemplo`, `/ejemplo/regalos` casamiento ficticio (Ignacio & Martina); `/encontrar` buscador de invitados.
- Datos de la demo en `src/lib/demo-wedding.ts` (catálogo de 26 regalos, 4 categorías, menús, eventos, dress code…).
- Planes (landing, `src/routes/index.tsx`): **Regalos** (lista), **Completo** (lista + confirmación + sitio), **Premium** (todo Completo + sitio premium). No hay precios.
- No existía ningún flujo de registro ni de creación de evento, ni panel.

## 2. Rutas

| Ruta | Qué es |
|---|---|
| `/crear/cuenta` | Paso 1 de 3: cuenta (solo interfaz, no guarda nada). Acepta `?plan=`. |
| `/crear` | Paso 2 de 3: nombres, fecha (opcional), foto (opcional). También «Probar con Tomás y Martina» (datos de ejemplo). Acepta `?plan=regalos\|completo\|premium` (viene de los botones «Elegir plan» de la landing). |
| `/crear/plan` | Paso 3 de 3: elegir plan. Sin checkout. |
| `/panel` | Resumen y próximo paso. |
| `/panel/regalos` | Tres pestañas: **Mi lista** (orden, edición, quitar), **Agregar regalos** (sets + catálogo en una sola vista, con la tarjeta «Crear un regalo propio» al principio) y **Recibidos** (quién regaló qué, monto, medio, fecha y mensaje). Arriba, «Cobro y portada»: alias, preferencia de tarjeta (sin cobro real) y portada. |
| `/panel/invitados` | Invitados (tabla en la compu, tarjetas en el celular), búsqueda, filtros, alta manual. |
| `/panel/mesas` | Grupos y mesas. |
| `/panel/sitio` | Editor del sitio por bloques con vista previa en vivo. |
| `/panel/vista-previa` | «Ver como invitado»: la página pública real en celular o compu. |
| `/sitio/$slug`, `/sitio/$slug/regalos` | Página pública **simulada** de la pareja (ej.: `/sitio/tomas-y-martina`). Mismos componentes que `/ejemplo`. |

Modificadas: `/ejemplo*` (ahora usan los componentes compartidos; se ve y funciona igual), landing (los CTA «Crear mi evento», «Crear mi lista de regalos» y «Elegir plan» llevan a `/crear`), barra flotante.
`/crear`, `/panel` y `/sitio` llevan `noindex` (meta + cabecera `X-Robots-Tag`).
Se eligió `/sitio/$slug` y no `/$slug` para no chocar con las rutas existentes; el slug se normaliza (`Tomás & Martina` → `tomas-y-martina`).

## 3. Componentes reutilizados / compartidos

- **Página pública**: `ejemplo.index.tsx`, `ejemplo.regalos.tsx` y el layout de `/ejemplo` se movieron a `src/components/site/` (`invitation.tsx`, `gifts-page.tsx`, `site-shell.tsx`, `site-cover.tsx`). Leen todo de un contexto (`useSite()`); `/ejemplo` le pasa los datos de la demo y `/sitio/$slug` los de la pareja. No hay una segunda página de regalos.
- `rsvp-dialog.tsx` (formulario de confirmación) se reutiliza tal cual; ahora toma menús y fecha límite del sitio y avisa al panel al enviar.
- Estilos del ejemplo (`ejemplo.css`, `invitacion.css`, `demo.css`) sin cambios de diseño.
- Administración: identidad de la landing (Arial, azul `#707d87`, `#5A646C`, `#8A959E`, papel `#f5f2eb`, botones en píldora) en `src/panel.css`.

## 4. Estado local y preparación para backend

```
src/lib/weda/
  types.ts       modelos (AppState, ListGift, Guest, Group, SiteConfig, …)
  plans.ts       planes y matriz de funciones
  catalog.ts     sets de regalos (salen del catálogo existente)
  logic.ts       lógica pura: validaciones, regalos, invitados, RSVP, grupos, avance
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

| Función | Regalos | Completo | Premium |
|---|---|---|---|
| Lista de regalos | ✓ | ✓ | ✓ |
| Sitio del casamiento (editor y página) | – | ✓ | ✓ |
| Confirmación de asistencia | – | ✓ | ✓ |
| Invitados y grupos/mesas | – | ✓ | ✓ |
| Música de la fiesta (configuración y vista previa; sin conexión real a Spotify) | – | – | ✓ |

Premium = todo Completo + música. No hay otra personalización avanzada implementada ni documentada, así que no se declara. Las restricciones se aplican al mostrar: al bajar de plan los datos (temas, invitados, grupos) se conservan y reaparecen al volver a subir. La primera parte sale de la landing. **El repositorio no define qué bloques del sitio son «premium».** Se asumió que solo la música (playlist) lo es; está declarado en `plans.ts` y se cambia en un lugar. Los módulos que el plan no incluye se muestran bloqueados con el plan que los trae. Al cambiar de plan los datos se conservan.

## 6. Qué es real en el frontend y qué depende del backend

| Real (local) | Depende de un backend |
|---|---|
| Crear evento, elegir/cambiar plan, panel, lista de regalos, invitados, grupos, editor, vista previa, persistencia en el navegador | Cuentas y autenticación; publicación del sitio y dirección pública; cobro y precios; enviar correos o mensajes (RSVP, regalos); recibir dinero (el alias es solo texto); subir imágenes a un servidor; que las respuestas de invitados reales lleguen al panel desde otros dispositivos |

El RSVP público y el regalo público **actualizan el estado local**; no avisan a nadie. «Publicar» explica que se habilitará cuando el servicio esté conectado: no simula una contratación.

## 7. Decisiones y pendientes

- **Registro:** no existía ningún formulario de cuenta, así que el alta es solo «datos del casamiento» (nombres, fecha, foto). No se pide email ni contraseña porque no habría nada que autenticar; se aclara que es una demostración.
- **Restricción alimentaria:** el formulario existente usa una sola lista (`menus`) que cumple de menú y de restricción; se mantiene un único campo.
- **Precios:** no definidos → «El precio se informa al publicar».
- **Moneda:** solo pesos argentinos (como el catálogo existente).
- **Sin definir en el repositorio (quedó conservador):** límites de capacidad de mesas, comisiones, qué incluye exactamente «sitio premium», eventos adicionales (solo ceremonia, recepción y fiesta, como en `/ejemplo`).
- **Tarjeta como método de pago** en el pop-up de regalar: ya existía en la demo («Para este ejemplo, usá el alias»); no se tocó.
- Los invitados del plan «Regalos» no tienen invitación: `/sitio/$slug` redirige a la lista de regalos.

## 8. Mejoras de UX (auditoría de uso)

- **Inicio** (`/panel`): guía breve y ocultable («¿Cómo funciona?» la vuelve a abrir), barra de avance y pasos con estado **Sin empezar / En progreso / Completo** derivado de los datos reales (`tasks()` en `logic.ts`); el paso recomendado se marca. Los pasos dependen del plan. Se quitaron las métricas sueltas y la sección «Publicación» del resumen (queda en «Ver como invitado»).
- **Guardado:** aviso «Cambios guardados en este dispositivo» (o «No se pudieron guardar…»); no hay botón guardar y no se dice que haya nube ni cuenta.
- **Tu página web** (`/panel/sitio`): cada sección dice qué ve el invitado, su estado y tiene «Mostrar»; una sola abierta a la vez; al abrirla la vista previa se lleva a esa sección; «Ver cómo queda»; ocultar no borra lo cargado.
- **Vista previa:** vuelta directa al editor o a los regalos.
- **Invitados:** filtros por estado con cantidades (Confirmaron / Sin responder / No asisten). **Mesas:** primero quienes no tienen lugar.
- **Nombres:** «Inicio», «Tu página», «Tu página web».

## 9. Segunda ronda de UX

- **Tu página:** la vista previa del editor siempre es el celular, con «Ver como invitado en otra pestaña». Los momentos del día son hasta tres eventos opcionales con **nombre propio** («Evento 1, 2, 3» si no le ponen nombre). La portada tiene foto, nombres, fecha y un texto sobre los nombres que puede quedar vacío. La confirmación de asistencia es solo mostrar/ocultar. Corregido: sin ningún evento visible, «Save the date» salía con otra tipografía (las reglas serif dependían de que existiera la sección de eventos).
- **Invitados y mesas** son una sola pantalla (`/panel/invitados`, solapas «Invitados» y «Mesas y grupos»); `/panel/mesas` redirige. **Exportar** a .xlsx (todo, con grupo y origen) e **importar** .xlsx o .csv con las columnas Nombre, Apellido, Asistencia y Restricción alimentaria, con modelo descargable y vista previa de lo que se va a importar (sin dependencias nuevas: `lib/weda/xlsx.ts`, `guests-io.ts`).
- **Regalos:** solapas Mi lista / Agregar regalos / Recibidos / Cobro. Los sets son fichas con foto: tocarlas agrega o quita todo el set, y el ícono de lista abre una ventana para elegir de a uno. La lista se ordena arrastrando (mantener apretado en el celular; Alt + flechas con teclado). «Cobro» separa el alias bancario de Mercado Pago (marcado «Próximamente», sin conexión). La portada de la lista usa la foto del casamiento.
