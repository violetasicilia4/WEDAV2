# Weda · Flujos de usuario (lo que hoy existe en el código)

Describe los recorridos **implementados**. No describe objetivos futuros.

> **Cómo leerlo (2026-10-31).** Las secciones 1 a 11 se escribieron cuando Weda no tenía servidor: donde dicen «sin backend», «no hay cuentas» o «simulación» describen ese momento. Desde el 2026-10-26 hay servidor (cuentas, sincronización, publicación, aportes con comprobante): mandan las secciones fechadas posteriores, y la más reciente gana. Estado vigente y decisiones abiertas: [product-blueprint/](product-blueprint/00-product-blueprint.md). Criterios de decisión: [product-principles.md](product-principles.md). Detalle técnico y rutas: [panel-frontend.md](panel-frontend.md). Estilos y componentes: [design-system.md](design-system.md).

## 1. Mapa de rutas

| Ruta | Función |
|---|---|
| `/` | Landing. Los botones «Crear mi evento», «Crear mi lista de regalos» y «Empezar gratis» (en cada plan) llevan a `/crear/cuenta`. La sección de planes (`src/components/landing-plans.tsx`) muestra nombre, precio, 4–5 funciones y «Ver todo lo que incluye» sin pedir elegir plan. |
| `/ejemplo`, `/ejemplo/regalos` | Casamiento de demostración (invitación y lista de regalos). |
| `/encontrar` | Buscador de invitados (demo: cuatro parejas de ejemplo en `src/lib/demo-couples.ts`, que abren la lista de regalos de ejemplo; no consulta ningún servicio ni directorio real). |
| `/crear/cuenta` | Paso 1: registro o ingreso con correo y clave, o con Google / Apple. Es solo la interfaz: sin backend no se crea ninguna cuenta ni se guarda la clave, (la pantalla no lo anuncia). Encabezado «¡Bienvenidos!», línea de términos y privacidad (sin páginas todavía: es texto, no enlaces) y «¿Ya sos miembro? Ingresá». **Registrarse o ingresar (correo, Google o Apple) nunca borra el evento guardado en el navegador** (`src/lib/weda/account.ts`): con el onboarding terminado se sigue a `/panel`; con nombres cargados pero sin terminar, o sin evento, a `/crear` (que conserva lo cargado). La pantalla no muestra ningún aviso sobre el evento guardado ni ofrece borrarlo (para empezar de cero está «Reiniciar la demo» en el Inicio del panel). |
| `/crear` | Paso 2: nombres y fecha (opcional). |
| `/crear/foto` | Paso 3: la foto de la pareja (portada de la página), con la foto a la vista. Se puede omitir («Omitir por ahora»). Sin nombres cargados vuelve a `/crear`. |
| `/crear/plan` | Ya no existe como paso: redirige a `/panel`. El plan se elige al publicar (diálogo «Elegí tu plan para publicar»). |
| `/panel` | Inicio: avance y pasos. |
| `/panel/regalos` | Lista de regalos. |
| `/panel/invitados` | Invitados y, en la misma pantalla, Mesas y grupos (`?vista=mesas`). `/panel/mesas` redirige. |
| `/panel/sitio` | Tu página web. |
| `/panel/vista-previa` | Vista previa. |
| `/sitio/$slug`, `/sitio/$slug/regalos` | Página pública simulada de la pareja. Solo existe en el navegador de quien la creó. |

## 2. Crear el evento (el plan se elige al publicar)

0. `/crear/cuenta` (supuesto documentado: sin backend no hay cuentas reales; Google y Apple no autentican y no hay OAuth). Los botones de la landing y del menú llevan acá primero.
1. `/crear`: pantalla centrada y sin encabezado (solo una «X» que vuelve al inicio): tu nombre y el nombre de tu pareja. La fecha y el lugar van en la pantalla siguiente (`/crear/fecha`, 2026-10-23): **ambos son opcionales y se dejan vacíos**, sin interruptores «Todavía no tenemos…» (antes, continuar vacío daba dos errores). Si se escribe una fecha, se valida (que exista y no haya pasado). «Datos del casamiento» del panel funciona igual. «Continuar» guarda los datos y pasa a la foto.
1b. `/crear/foto` («Sumá una foto de ustedes» · «Podés cambiarla cuando quieras.»): la foto le da identidad a la página, por eso se pide en el onboarding. La pantalla muestra **solo la foto**, sin textos encima (ni «¡Nos casamos!», ni nombres, ni fecha), chica y centrada dentro de la tarjeta (alto `min(36dvh, 280px)`, proporción 4:5); sobre la imagen de muestra hasta que suban la suya. En el celular **entra en una sola pantalla, sin scroll**, con el título en un renglón. La acción principal es «Subir una foto de ustedes» y, ya subida, «Continuar» (con «Cambiar la foto»). **Supuesto (a confirmar): no es obligatoria**; «Ahora no, la subo después» sigue con la imagen de muestra y la pareja la cambia desde el panel (`CoupleDialog`/`PhotoPicker` o «Editar datos»). Si se quisiera exigirla, es una decisión comercial: hoy no bloquea. La foto se reduce y se guarda en este navegador; la pantalla no lo explica (no hay cuentas ni servidor, y el resto de la interfaz ya lo dice donde importa).
2. Desde la foto entra a `/panel` con todo habilitado para probar (planId vacío = «Prueba gratuita»). Sin evento el panel redirige a `/crear`. No se pide plan ni tarjeta.
3. Al tocar «Publicar» (o «Elegir plan» / «Ver los planes») se abre el diálogo con los tres planes, precio por evento y qué incluye cada uno. Elegir **no cobra ni publica** (no hay servicio conectado) y se puede cambiar cuando se quiera. Si ya se cargó algo que el plan elegido no incluye (música, galería, mensaje final, página, invitados, mesas), se conserva como **borrador**: no se publica y el diálogo y la pantalla bloqueada dicen en qué plan sí (`draftsFor` en `logic.ts`).

## 3. Planes (fuente: `src/lib/weda/plans.ts`)

| Función | Regalos (ARS 95.000) | Celebración (ARS 140.000) | Celebración Plus (ARS 150.000) |
|---|---|---|---|
| Lista de regalos, alias/tarjeta y registro de regalos recibidos | sí | sí | sí |
| Sitio (portada, eventos con Google Maps, foto principal, dress code, cuenta regresiva) | no | sí | sí |
| Confirmación de asistencia (RSVP) | no | sí | sí |
| Invitados (panel de respuestas) y mesas/grupos | no | sí | sí |
| Música de la fiesta (solo configuración y vista previa; sin conexión real a Spotify) | no | no | sí |
| Galería de fotos con hashtag e Instagram | no | no | sí |
| Mensaje final personalizado | no | no | sí |

Los precios son de referencia, **por evento**, y viven solo en `src/lib/weda/plans.ts`. No se afirma pago único, ausencia de suscripción ni duración de la publicación (sin definir). Los planes son acumulativos.

Una función fuera del plan muestra qué es y en qué plan está (`Locked`), sin bloquear el resto de la navegación. En el menú, lo que el plan no incluye lleva un candado (con texto para lectores de pantalla) y se explica al entrar.

## 4. Inicio (`/panel`)

- Bienvenida personalizada («¡Empecemos a crear su casamiento!» al empezar; después, un titular según el avance) con un único CTA primario: el siguiente paso recomendado (al empezar, «Elegí los primeros regalos»). Los botones de cada etapa son secundarios; la etapa recomendada se marca con «· Siguiente paso». En «Sin empezar» se muestra la descripción y no el estado repetido.
- **Un solo progreso general** (0–100 %) sobre tres etapas de armado. «Revisá y publicá» no suma: la publicación todavía no existe.
- Cuatro etapas: **Prepará tu lista de regalos**, **Diseñá tu invitación**, **Organizá a tus invitados**, **Revisá y publicá**. Estado **Sin empezar / En progreso / Lista para revisar / Completada**, derivado de los datos reales (`stages()` en `src/lib/weda/journey.ts`; `tasks()` de `logic.ts` sigue alimentando el resto del panel). Acción principal: Empezar / Continuar / Revisar / Editar. Se navega libremente.
- Supuestos (definición propia, a confirmar): regalos queda «Lista para revisar» con regalos pero sin alias (el cobro **no bloquea**) y «Completada» con alias; la invitación queda «Lista para revisar» si hay una sección prendida sin datos mínimos (`incompleteSections`); invitados queda «Completada» con al menos una persona; mesas y grupos no entran en el progreso.
- Siguiente paso recomendado (`nextAction`): primeros regalos → configurar cobro → terminar la invitación → cargar invitados → revisar cómo lo verán.
- Etapas fuera del plan elegido: se avisa «Se publica desde el plan X» y el contenido se conserva.
- «Publicar mi casamiento» (secundario) abre la elección de plan; una sola frase dice que es una demostración y que no se publica ni se cobra nada. Las etapas fuera del plan muestran «No está en tu plan». Sin botón extra de vista previa: el acceso es el de arriba y el paso 4. «Editar datos» abre nombres, fecha y foto. «Reiniciar la demo» pide confirmación.

## 5. Lista de regalos (`/panel/regalos`)

- Título «Armá tu lista de regalos». Solapas en orden de uso: **Elegí tus regalos → Revisá tu lista → Cómo vas a recibirlos (opcional) → Recibidos**. En pantallas de hasta 560 px las cuatro entran en el ancho con etiqueta corta (Elegir · Tu lista · Cobro · Recibidos); un punto indica que el cobro está pendiente sin tratarlo como obligatorio. Se abre en «Elegí tus regalos» si la lista está vacía y en «Revisá tu lista» si ya hay regalos.
- **Elegí tus regalos:** sets con foto (tocar agrega o quita todo el set; el ícono de lista abre una ventana para elegir de a uno), catálogo con búsqueda y categoría, y «Crear un regalo propio». El **resumen de la selección** (cantidad real, total y cada regalo con «Quitar») queda siempre a mano: panel lateral fijo desde 1024 px y barra inferior que abre un diálogo en el celular.
- **Cómo vas a recibirlos:** alias bancario (se guarda solo) con vista de cómo lo ven los invitados, con estado «Sin configurar» / «Configurado» (aviso «Pendiente» en la solapa). **No bloquea** nada: se explica que para activar los regalos reales al publicar hará falta completarlo. Mercado Pago figura como «Próximamente» (no hay integración); preferencia de mostrar tarjeta. No se mueve dinero. CBU/CVU no está implementado (solo alias).
- **Revisá tu lista:** cantidad y una vista de **tarjetas** (foto, monto y nombre en el mismo orden que la página pública, con «Editar» y «Quitar» en cada una) que se arrastran para ordenar (ver «Mis regalos: ordenar y editar»). «Ver cómo la ven tus invitados» despliega, en la misma pantalla, la página pública de regalos real (mismo estado, sin publicar); no hay otra pantalla ni teléfono simulado aparte. Tres cosas distintas: revisar la selección (resumen), ver la lista (tarjetas) y ver la página de regalos (desplegable). La URL pública todavía no existe. Al pie: «Agregar más regalos» y «Cómo vas a recibirlos · opcional».
- **Recibidos:** tablero (regalos, total, personas, último regalo) y lista con quién, cuándo, medio y mensaje. Es local: se registra cuando se regala desde la vista de invitado.
- Todo lo que se cambia aparece en la página pública (`/sitio/$slug/regalos`) porque usa el mismo estado.

## 6. Tu página web (`/panel/sitio`)

- Una lista de secciones: Portada, Evento 1, 2 y 3 (opcionales, con nombre que elige la pareja; sin nombre se llaman «Evento 1/2/3»), Confirmación de asistencia, Dress code, Fotos, Mensaje final y Música (plan Celebración Plus). Cada una muestra su estado y tiene «Mostrar». Ocultar no borra lo cargado. Solo hay una sección abierta a la vez.
- Portada: foto, nombres, fecha y «texto sobre los nombres» (puede quedar vacío).
- Confirmación de asistencia: solo mostrar u ocultar.
- Desktop (≥1100 px): dos áreas, edición al 45 % y vista previa al 55 %, con la página pública real en formato celular y scroll propio; al abrir una sección la vista previa se desplaza hasta ella (también si la sección aparece después, por ejemplo un evento recién cargado) y cada cambio se ve al instante (mismo estado). Celular (<1100 px): la vista previa queda **fija arriba** (≈34 % del alto, entre 170 y 280 px) y las secciones se editan debajo; al abrir una se la acerca bajo la vista previa. «Ampliar vista» la agranda y oculta los campos; «Seguir editando» vuelve sin perder nada. Cada sección termina con «Listo» (vuelve a la vista general) y «Ver en la vista previa». Con menos de 520 px de alto (apaisado) la vista previa no queda fija. En eventos, «Nota» y «Enlace de Maps» van en «Más opciones» (se abre solo si ya tienen contenido). Un solo acceso a la **vista limpia** («Abrir vista limpia», pestaña nueva, sin controles). «Vista previa» (arriba) abre la vista previa a pantalla completa; el cambio celular/compu es una herramienta secundaria ahí.
- Cada sección muestra su descripción, estado y «Mostrar». Etiqueta discreta «Incluido en Celebración Plus» solo en Fotos, Mensaje final y Música (lo que diferencia los planes, derivado de `planFor`).
- Cambios guardados al instante y aviso «Cambios guardados en este dispositivo». Si falta algo, un renglón discreto «Falta completar: …» lleva a cada sección. Una sección «lista» no es solo «Mostrar» prendido: la regla vive en `sectionGaps` (`journey.ts`) y la usan el editor y el Inicio: un momento necesita nombre propio y lugar o dirección; dress code, título o texto; fotos, al menos una; música, al menos un tema. El mensaje final vacío no es pendiente (usa el cierre por defecto).
- Contenido incompleto en la página pública: sin fecha, «Fecha a confirmar» aparece solo en la portada; sin regalos no se muestran «Regalá» ni «Ver lista de regalos» y la lista pública muestra «Esta lista todavía se está armando».

## 7. Invitados, mesas y planillas (`/panel/invitados`)

- **Confirmaciones:** cuatro totales reales (Total de invitados, Confirmados, Rechazados, Sin responder) que además filtran la lista; búsqueda, edición, eliminación y asignación de grupo. Columna «Origen»: «Cargado por ustedes» o «Respondió en el sitio»; un aviso cuenta cuántas personas respondieron desde el sitio y permite verlas.
- **Cargar (2026-10-21):** un botón «Agregar invitado» abre el formulario completo (nombre, apellido, asistencia, restricción alimentaria, grupo o mesa); no hay campo de alta rápida en la lista. Alternativa: «Importar desde Excel» (y «Exportar a Excel»). Los cuatro cuadrados de resumen (total, confirmados, sin responder, con restricción) están siempre, también en cero. El estado vacío es un bloque centrado que llena el ancho, con «Agregar invitado» e «Importar desde Excel».
- **Mesas y grupos** (misma pantalla, solapa aparte; no es obligatoria ni bloquea nada): crear, renombrar, eliminar, asignar y mover con un selector; primero aparecen las personas sin lugar y cada mesa muestra cuántas personas tiene. Sin límites de capacidad.
- **Exportar a Excel** (.xlsx, con grupo y origen). **Importar** .xlsx o .csv con las columnas Nombre, Apellido, Asistencia y Restricción alimentaria; hay un modelo descargable y, antes de confirmar, una vista previa de lo que se va a importar (primeras filas), las filas con error con su motivo y los duplicados nombrados (ya estaban en la lista o están repetidos en la planilla: se saltean y **nunca se pisan** datos existentes). Nada cambia hasta tocar «Importar».
- Eliminar un invitado y importar una planilla no piden confirmación: se pueden deshacer desde el aviso. El aviso se cierra al cambiar de pantalla (para que un «Deshacer» viejo no pise cambios nuevos) y, con un diálogo abierto, aparece arriba para no tapar sus botones.
- Las respuestas del formulario público se suman solas a la lista (sin duplicar al enviar dos veces).

Nota de la mejora visual (2026-10): en celular la lista de invitados es una fila compacta y la edición (asistencia, restricción, grupo) pasa por la hoja «Editar invitado». Cambiar asistencia o grupo ya no es de un toque en la lista; es una decisión de densidad. **Mejora futura (no implementada):** acciones masivas (marcar confirmados, mover varios a una mesa, eliminar), filtro por mesa y capacidad por mesa (hoy el modelo no tiene capacidad; hay que definirla comercialmente antes de mostrarla).

## 8. Vista previa y publicación

- `/panel/vista-previa`: la página pública real, con alternancia Celular / Compu (sin selector de página: se recorre con la barra del propio micrositio), y vuelta directa al editor. Sin banners de estado: el subtítulo dice «Todavía no está publicada» y el botón de la cabecera no se repite en esa pantalla.
- «Publicar mi casamiento» abre el diálogo de planes y, al elegir uno, un **resumen de publicación**, que **no cambia el sitio**: solo «Ver mi sitio con este plan» lo aplica y «Volver a probar todo» lo deshace (`publishSummary` en `src/lib/weda/publish.ts`): qué se publica con ese plan, qué está incluido pero vacío y qué queda como borrador (con el plan que lo habilita), más avisos sin bloqueo (falta el cobro, falta la fecha). Cambiar de plan no borra nada. El pago ahora es **simulado** (ver «Pago simulado y publicación» al final).
- Pendiente (necesita backend): borrador privado, vista previa compartible protegida, versión pública con URL estable, verificación real del pago antes de publicar y «publicar cambios» explícito.

- La vista previa («Vista previa») lista debajo, por función, si está **Configurada**, **Incluida pero falta cargar** o **Requiere plan X**, y los pendientes de completar con acceso al editor. Sin plan elegido se muestra como quedaría con el más completo.

## 9. Persistencia y comportamiento sin backend

- Estado único en `localStorage` (`weda-app`). Sobrevive a recargas; datos ausentes, corruptos o de versiones anteriores se leen sin romper. Las fotos se reducen y se guardan en el navegador (~5 MB; si se llena, el panel avisa).
- La vista previa (iframe) se sincroniza por el evento `storage`.
- No hay cuentas, correos, pagos, publicación real ni sincronización entre dispositivos.

## 10. Vacíos y supuestos (a confirmar con la autora antes de tratarlos como reglas)

- **Precios, comisiones, plazos y condiciones de publicación:** no definidos. La interfaz dice que el precio se informa al publicar.
- **Qué hay en «Celebración Plus»:** la diferencia con Celebración son música de la fiesta, galería de fotos con hashtag y mensaje final (las tres se restringen de verdad por plan). Spotify real y más secciones no existen todavía. Los datos guardados con los nombres viejos de plan se migran (versión 1 → 2: completo→invitacion, premium→completo).
- **Qué sucede después del pago** y qué incluye cada plan más allá de la matriz anterior: sin definir.
- **Mercado Pago y cobro con tarjeta:** sin desarrollar.
- **Analytics:** no existe infraestructura; no hay eventos definidos.
- **Estados de «página lista para publicar»:** hoy no hay una condición formal de publicación.
- **Pruebas con personas:** no se hicieron. Las conclusiones de UX son hipótesis de inspección experta. El arrastre táctil de la lista de regalos y la importación de planillas hechas en Excel no se probaron en dispositivos reales.
- **Capacidad de mesas, eventos adicionales (civil, brunch), múltiples menús por invitado:** no definidos.

## 11. Regalar como invitado (simulación)

- Pasos: elegir regalos → «Tu regalo» (total, quitar, agregar otro) → cómo pagar → datos → agradecimiento. Todo es una demostración y el paso de pago lo dice («Es una demostración: no se cobra ni se envía nada»).
- «Enviar» solo se habilita si el recorrido es coherente: con alias de los novios cargado, comprobante, nombre y apellido. El correo es opcional: vacío no bloquea y, si se completa, se valida el formato (hoy no se usa para nada). Sin alias o con «Tarjeta» (todavía no disponible) queda deshabilitado y explica por qué. No se muestra «Comprobante» cuando no hay alias.
- En el sitio de una pareja se puede regalar el mismo regalo más de una vez (no se bloquea tras enviar); en `/ejemplo` se conserva el comportamiento original.


## 12. Rediseño del panel (2026-10): cambios de flujo
- Inicio: el «avance» ya no es un porcentaje; se cuenta cuántos pasos de armado están completos según los datos reales (`stages()`). `progress()` sigue en `journey.ts` (tests) pero el Inicio no lo muestra.
- Editor de la página: ya no hay acordeón con todas las secciones; se elige una sección y se editan solo sus campos. La vista previa del celular es una pantalla completa que se abre y se cierra a pedido.
- Regalos: «Cobro» se llama «Aportes». Se puede entrar directo a esa solapa con `/panel/regalos?tab=cobro`.
- **Pendientes (no implementados, requieren definición):** capacidad por mesa, acciones masivas en Invitados, un ítem «Regalos» dentro del editor de la página (hoy la lista de regalos se edita en su propia sección del panel).

## Publicación: pendientes y estado (2026-10-20)
- **Inicio** muestra un bloque «Publicación»: siempre «Borrador», el plan elegido con su precio (de `plans.ts`) o «probás todo gratis», y la aclaración de que hoy no se publica ni se cobra nada.
- **Resumen de publicación** (diálogo de planes) suma «Antes de publicar»: pendientes reales con acceso directo (`publishSummary(...).todo`: sin regalos, falta alias de cobro, sin fecha, secciones activadas incompletas), solo de lo que el plan elegido incluye.
- **Supuesto:** no hay reglas de publicación definidas, así que ningún pendiente bloquea; son recomendaciones. Cuando la publicación real exista, habrá que decidir cuáles pasan a ser obligatorios.

## Inicio como panel de accesos (2026-10-21)
- Se quitaron los recuentos (confirmados, regalos, pasos listos), la barra de segmentos y el estado de publicación en bloque. Inicio muestra: la foto «Tu casamiento» con «Editar datos», el **siguiente paso** recomendado y «Adónde querés ir», con seis accesos: Lista de regalos, Tu página, Invitados, Mesas y grupos, Vista previa y Publicar (abre los planes y dice el plan y el precio si ya se eligió).
- Cada acceso lleva una frase de para qué sirve y, solo si ya hay avance, una etiqueta de estado (En progreso, Lista para revisar, Completada) calculada por `journey.ts`. Los accesos de funciones fuera del plan muestran «Desde el plan X» y siguen abriendo la pantalla explicativa.

## Vista previa en pop-up desde todas las secciones (2026-10-21)
- La cabecera del panel muestra **«Vista previa»** en todas las secciones. Abre la página pública real en un pop-up: en compu, en **formato web** (con opción de ver el celular); en el celular, en formato celular.
- Destino: **Regalos** abre directo la lista de regalos; **Inicio, Tu página e Invitados** abren el inicio de la invitación. Si el plan no incluye una de las dos páginas, se muestra la otra. Dentro del pop-up no hay selector de página (2026-10-21): es el micrositio completo, y la invitación, «Regalá» y «Confirmá asistencia» se recorren con la barra del propio micrositio; solo se elige Web o Celular.
- Cualquier pantalla puede abrirla con `openPreview('home' | 'gifts')` (`src/lib/weda/preview-event.ts`). La pantalla completa `/panel/vista-previa` sigue existiendo (con el resumen de lo configurado y «Publicar»). En el editor de «Tu página» en pantallas < 1100 px se mantiene su propia vista previa, que muestra la sección que se está editando.

## Tu página: edición con ventana de la página real (2026-10-21)
- La «ventana en vivo» (`LiveCard`) es **la página pública real** (`/sitio/…?ventana`, sin barra ni pie) en un iframe recortado y alineado a la sección que se edita (portada, eventos —con el evento abierto—, confirmación, dress code, fotos, mensaje final o música). No es una segunda implementación: lo escrito llega por el evento `storage` en ~150–185 ms. Es solo para mirar (no recibe toques). Una sección oculta se ve atenuada y avisa que los invitados no la ven. Con el teclado virtual abierto se achica (`compact`) o pasa a una tira (`tight`).
- La página completa sigue a un toque: «Ver completa» (en la ventana) abre el pop-up de vista previa anclado en esa sección, y «Vista previa» de la cabecera la abre desde el inicio.
- Las pruebas de `e2e/` se actualizaron al pop-up y a la tarjeta, pero no se pudieron ejecutar en este entorno (Playwright sin navegador instalado).

## Inicio en dos capas: construir y publicar / gestionar (2026-10-21)
- **Decisión de la autora:** el objetivo comercial es llevar a la pareja a publicar (y cobrar), así que Inicio guía ese recorrido y separa visualmente lo que es administración de fondo.
- **Sección 1 · «Lo que vas a publicar»** (2026-10-21, ajuste de la dueña): tres tarjetas iguales, sin números y sin estados: Lista de regalos, Diseñá tu página y Vista previa. **«Publicar» ya no es una tarjeta**: es un botón en gris oscuro arriba a la derecha, junto a «Vista previa», **en todas las pantallas del panel**, **No hay botón «Publicar» en el menú**, ni en la barra lateral ni en la barra inferior del celular: es una acción, no una sección, y vive solo arriba a la derecha. Los tres abren el mismo diálogo «¿Qué querés publicar?». Se puede entrar a cualquier tarjeta en cualquier orden.
- **Sección 2 · «Gestión de invitados»** (abajo de todo, separada por una línea): Invitados y Mesas y grupos, con las mismas tarjetas. Invitados y mesas **no se publican** (ya lo decía `publish.ts`) y no hacen falta para publicar; la lista se va armando de a poco, sin apuro.
- `journey.ts`: Invitados dejó de ser un paso de construcción. `nextAction()` ya no recomienda cargarlos (recorre regalos → aportes → página → revisar), `progress()` no los cuenta y `publishStage()` no los espera para estar «lista para revisar». `guestsStage()` sigue existiendo solo para la etiqueta de estado del acceso a Invitados.
- **Supuesto / pendiente:** la publicación no está conectada, así que no existe el estado «publicada» y Inicio no cambia después de publicar. Cuando exista, la intención de la autora es que, una vez publicado, Inicio pase a priorizar la administración (invitados, confirmaciones, regalos recibidos) y la capa de construcción baje de jerarquía. No se simuló ese estado.

## Publicar: tres cuadrados, uno por producto (2026-10-21)
- **Problema:** no se entendía qué se publica con cada plan (solo regalos, invitación, sitio completo) y las primeras versiones (lista de opciones, luego tarjetas con mucho texto y botones «Elegir …») se descartaron por indicación de la autora: tienen que ser **concretas, visuales y con detalle a pedido**.
- Al tocar **Publicar**, el diálogo **«¿Qué querés publicar?»** muestra **tres cuadrados lado a lado** (apilados en celular), pensados como producto y no como plan: **Regalos**, **Celebración** y **Celebración Plus**. Cada uno trae, en este orden: ícono y nombre con una frase corta (`product` en `plans.ts`), **precio**, **«Pago único» y «Publicada 1 año»**, entre 3 y 4 puntos con ícono (`highlights` en `plans.ts`), **«Ver más»** (plegado: el detalle completo de `items` y, si algo cargado quedaría como borrador, el aviso), **«Ver link»** y **«Publicar»**.
  - **Regalos:** lista de regalos, alias y tarjeta para recibir, regalos recibidos y quién los hizo, link para compartir. Nada más.
  - **Celebración:** «Todo lo de Regalos» + página con los datos de la fiesta, confirmación de asistencia, invitados, mesas y grupos.
  - **Celebración Plus:** «Todo lo de Celebración» + música de la fiesta, galería de fotos y mensaje final.
- **Definición comercial nueva (la autora, 2026-10-21): la página queda publicada 1 año con cualquiera de los tres** (`PUBLICATION_TERM` en `plans.ts`). Antes la duración no estaba definida. Hoy es solo un texto: no hay publicación real, así que nada se publica ni vence. No se definió qué pasa al cumplirse el año (renovación, baja, precio): no se afirma nada al respecto.
- **No se prometió «validar» regalos:** la app no verifica pagos (el panel de aportes lo dice). Se muestra «Regalos recibidos y quién los hizo», que es lo que existe.
- **«Publicar»** (en lugar de «Elegir {plan}», que se confundía con elegir regalos) lleva al resumen. Lo que se publica ya está armado: el resumen empieza con **«Se publica: …»** (`publishedPagesText()` en `publish.ts`, derivado de la matriz), lista pendientes sin bloquear y mantiene «Pagar y publicar (sin conexión)» deshabilitado. «Volver a las opciones» regresa a los tres cuadrados. «Ver mi sitio con este plan» sigue siendo lo único que aplica el plan.
- **«Ver link»** abre en otra pestaña la página pública REAL con los datos de la pareja, armada como se vería con ese producto (Regalos → solo `/regalos`; Celebración y Celebración Plus → la invitación). **No cambia el plan guardado.** Mecanismo: `/sitio/$slug[/regalos]?plan=…`; `AppSite` (`site-providers.tsx`) lee el parámetro una sola vez y llama a `siteFromState` con ese plan. Como todavía no hay publicación, el link vive solo en este navegador.
- **Supuesto a confirmar:** según `plans.ts`, Celebración incluye la lista de regalos (los planes son acumulativos). Si la intención es que Celebración NO incluya regalos, es una definición comercial que hay que decidir.

## Regalos: cuatro solapas, «Mis regalos» como entrada (2026-10-21)
- **Problema:** la pantalla abría en «1. Cómo funciona», un tutorial con cuatro pasos, y numeraba cinco solapas como si fueran un recorrido obligatorio. En el celular la quinta quedaba fuera de vista, y la pareja que volvía a editar su lista tenía que salir primero de la guía.
- **Decisión:** se entra siempre a **«Mis regalos»** (si está vacía, su estado vacío lleva al catálogo). Las solapas quedaron en cuatro y sin numerar: Mis regalos · Catálogo y packs · Aportes recibidos · Datos de cobro. La guía no se perdió: el paso que falta (cargar el alias) aparece como un aviso con su botón sobre la lista, y «¿Cómo funciona la lista de regalos?» es un desplegable al pie. `?tab=cobro` sigue funcionando.

## Menú lateral recogible en web (2026-10-21)
- En web (≥ 1024 px), un botón con ícono de panel, arriba a la izquierda y en la misma fila que el logo, **recoge o abre el menú** como la barra de YouTube. Abierto: logo, perfil de la pareja, las cuatro secciones con nombre y «Ayuda». Recogido: columna de 72 px solo con íconos (tooltip y nombre accesible para lectores de pantalla), la foto de la pareja y el ícono de ayuda; el contenido gana ese ancho. El estado se recuerda en este navegador (`weda-side`). En el celular no existe: manda la barra inferior.
- **Packs armados (2026-10-21):** tarjetas más chicas y parejas para ver varios sin desplazar: cuadrícula que se arma sola (3 por fila en web, 2 en tablet, 1 en el celular), foto de 150 px (112 px en el celular), descripción en dos renglones y botones alineados abajo. La forma de la tarjeta (foto con título, descripción, «Ver qué incluye» y «Agregar») no cambió.
- **Perfil (2026-10-21):** `/panel/perfil`, con dos tarjetas. (1) «Datos del casamiento»: el formulario real de nombres, apellidos, fecha, lugar y foto (se guarda en este navegador y se ve al instante en la página, los regalos y la vista previa). (2) «Tu cuenta»: correo (se carga al ingresar o desde el perfil; `AppState.email`, solo local), clave y «Cerrar sesión». **Supuesto (no hay backend):** la clave no se guarda nunca; el cambio de clave pide la clave actual (solo se exige que esté escrita: no hay contra qué verificarla), la clave nueva (mismas reglas que al registrarse, distinta de la actual) y su repetición, y al final avisa que no se aplicó. «Cerrar sesión» lleva a «Ingresá a Weda» sin borrar nada (ingresar conserva lo guardado). El acceso es el bloque de la pareja del menú (web; con el menú recogido queda la foto) o un avatar arriba a la derecha (celular); no es una sección del menú.
- **Regalos y mesas, ajustes (2026-10-21):**
  - **Mis regalos vacío:** bloque centrado: «Agregá de nuestro catálogo un montón de regalos o creá tus propios regalos para tu lista» con «Agregar del catálogo» y «Crear un regalo propio». «¿Cómo funciona la lista de regalos?» se mantiene.
  - **Aportes recibidos:** tres cuadrados siempre visibles (regalos recibidos, total en pesos, total en dólares), también en cero y antes del primer regalo. **Supuesto:** los regalos se cargan en pesos y no hay cotización conectada, así que el total en dólares muestra «—» con «Sin cotización conectada». No se inventa un tipo de cambio; cuando haya una fuente de cotización, se conecta ahí.
  - **Datos de cobro:** «Transferencia bancaria» sin configurar dice «Configurá los datos de tu cuenta para que tus invitados puedan transferirte a esta cuenta».
  - **Mesas:** los cuatro totales (mesas, lugares, sentados, sin mesa) están siempre, aunque no haya mesas. Todo evento nuevo arranca con una mesa creada y vacía, «Mesa 1» (`defaultGroup`), para que se entienda cómo funciona; se renombra, se borra o se suman más. Los datos guardados sin ninguna mesa reciben «Mesa 1» al cargarse (`sanitize`). Una «Mesa 1» sin cambios ni invitados no cuenta como contenido cargado (`tablesInUse`): no activa el paso «Mesas y grupos» ni las advertencias de plan.
- **«Ver qué incluye» de un pack (2026-10-21):** mini vista previa de los regalos con su foto cuadrada chica y el nombre (cuadrícula, 4 por fila en el celular), sin lista de precios y sin total del pack. Todos los regalos del catálogo tienen foto; el ícono queda solo de reserva si faltara.
- **Mis regalos: ordenar y editar (2026-10-21):** las tarjetas se **arrastran** para cambiar el orden, con el mouse (agarrar y llevar) o con el dedo (mantener apretado un instante y llevar; un movimiento rápido sigue siendo scroll). Reemplaza a las flechas de subir/bajar y a la vista «Ordenar»; con teclado, Alt + flechas. **Tocar una tarjeta abre su edición** (también el lápiz): nombre, monto, categoría y foto, que se puede cambiar, poner o quitar. El nuevo orden se guarda al soltar y se refleja en la página pública y la vista previa. Pendiente: probar el arrastre con el dedo en un dispositivo real (acá se probó con eventos táctiles simulados).

## Pago simulado y publicación (2026-10-22)
- **Decisión de la autora (excepción acotada a «no simular pagos»):** aunque no haya conexión, «Publicar» recorre un flujo de pago **de prueba** para dejar armado el recorrido. La interfaz lo dice en cada paso («Pago de prueba: no se cobra nada ni se guardan datos de pago») y todo vive en este navegador (`state.publication`, `src/lib/weda/payments.ts`, diálogo en `src/components/panel/publish-dialog.tsx`).
- **Recorrido:** elegir producto (los tres cuadrados) → **revisar y pagar** (plan, qué se publica, duración, total) → «Procesando el pago…» (≈1,4 s, no se puede cerrar) → **«¡Pagaste tu plan X!»** con monto, total pagado, vigencia, link, «Ver mi página» y «Copiar link».
- **Con una publicación hecha**, el botón de la cabecera pasa a «Publicada» (o «Despublicada») y abre **«Tu publicación»**: estado, plan, desde/hasta, total pagado, link, **mejorar de plan** (se paga solo la diferencia de precio entre planes) y **bajar la página** (con confirmación) o **volver a publicar**.
- **Supuestos conservadores (a confirmar comercialmente):** vigencia de 1 año desde el pago (coherente con «Publicada 1 año»); un mejora no extiende la vigencia; bajar la página **no devuelve el pago** y se puede volver a publicar sin pagar de nuevo hasta que venza; solo se puede mejorar a un plan de mayor precio; no hay bajar de plan ni reembolsos. Una página dada de baja muestra «Esta página no está publicada» a quien la abre por su link; el dueño la sigue viendo en la vista previa del panel. Mientras no se publique, el link sigue abriéndose como demostración.
- Sigue pendiente (necesita backend): cobro real, comprobantes, renovación, reembolsos, dominio propio.


## 13. Auditoría de recorridos (2026-10-23)

Detalle en [product-journey-audit.md](product-journey-audit.md), [conversion-opportunities.md](conversion-opportunities.md) y [e2e-coverage.md](e2e-coverage.md). Cambios de flujo:
- **Fecha y lugar opcionales** en el alta y en «Datos del casamiento» (vacío = «todavía no»). Consecuencias verificadas por prueba: la portada del panel dice «Fecha por definir»; el editor marca la portada como «Falta la fecha»; la vista previa y el sitio público dicen «Fecha a confirmar», sin cuenta regresiva ni «Guardar la fecha»; el diálogo de publicar lista «Definí la fecha del casamiento» entre los pendientes (solo con planes que publican la invitación); el siguiente paso del Inicio y los pasos de armado no dependen de ellos.
- **Pendiente «Definí la fecha» del diálogo de publicar:** el botón «Definir la fecha» lleva a `/panel?editar=datos`, que abre «Datos del casamiento» (el parámetro se limpia al cerrar).
- **Ejemplo (`/ejemplo`, `/ejemplo/regalos`):** el pie ofrece «Empezar gratis» (→ `/crear/cuenta`). Solo en la demo: los sitios de las parejas no lo muestran.
- **Pendiente (decisión comercial):** la interfaz de publicar dice «pago único» y «publicada 1 año», que §3 y §10 dicen que no están definidos; se puede pagar una página sin contenido; los testimonios de la landing tienen nombres y fotos inventados.

## Cuenta, guardado y sitio publicado reales (2026-10-26)

Hay servidor y base de datos (detalle en [backend-readiness.md](backend-readiness.md)). Cambios de recorrido:

- **Registrarse / ingresar con correo y clave es real** (sesión en el servidor). «Google» y «Apple» siguen siendo botones de simulación: continúan sin cuenta, en modo demostración.
- **Sin cuenta, todo sigue como antes** (borrador solo en este navegador). Con cuenta, el panel guarda en segundo plano y muestra el estado: avisa si no pudo guardar (con «Reintentar ahora»), y si otro dispositivo guardó antes ofrece «Recargar lo guardado» en vez de pisarlo.
- **Primer ingreso con un borrador en este navegador:** si la cuenta no tenía casamiento, se sube. Si ya tenía uno, se abre ese y el borrador local queda guardado aparte (con un aviso). Cerrar sesión borra del navegador la copia del casamiento.
- **Publicar con cuenta publica de verdad** (`/sitio/{slug}` abierto para cualquiera con el link). El cobro sigue siendo de prueba; el cartel lo aclara. Si el servidor falla, no se marca como publicada. Bajar la página la cierra para los invitados; «Volver a publicar» la abre de nuevo.
- **Vista previa ≠ publicado:** la vista previa del panel usa el borrador (`?borrador`); la dirección sin parámetros muestra solo lo publicado.
- **Invitados:** la confirmación desde el sitio publicado llega al servidor; si falla la red, no se marca como enviada y se puede reintentar. El correo/teléfono del formulario no se guarda.
- **Regalos en un sitio publicado:** el invitado informa su regalo y sube el comprobante; queda **«pendiente de revisión»** (no es dinero recibido). Un regalo ya elegido por otra persona se muestra como «Ya elegido». **Pendiente:** el panel de la pareja todavía no lista estos aportes reales ni permite confirmarlos o rechazarlos (hoy solo por API).
- **Supuestos que siguen abiertos (decisión comercial):** vigencia de la publicación (el servidor no la aplica; el año del flujo de prueba es solo visual), reembolsos, qué significa «confirmado» en un aporte, tarjeta (no disponible), indexación de invitaciones (siguen `noindex`).

## Tu página: estructura de la invitación y vista previa completa (2026-10-27)

**Problema:** el editor era una lista de secciones al costado de un formulario y una ventana recortada de la página. No se veía la invitación entera ni su orden, «ocultar» era un interruptor escondido en cada formulario, no se podía reordenar y la vista previa no se podía mirar en compu dentro del editor.

**Decisión (alternativas evaluadas):** (a) mantener lista + formulario y agregar solo el orden; (b) editor «sobre la página» (clic y edición dentro de la preview); (c) **estructura + edición por sección + vista previa completa conectada**. Se eligió (c): es la que resuelve «ver la estructura», «agregar/quitar/ordenar» y «ver el resultado fiel» con la menor complejidad; (b) exige un editor de bloques en vivo que Weda no necesita (la pareja aporta contenido, la estructura ya está diseñada).

- **Estructura («Tu invitación»):** la lista numerada de lo que ve hoy un invitado, de arriba abajo: Portada (siempre primera), **Save the date** (la fecha con su cuenta regresiva; solo si hay fecha), Eventos, Lista de regalos (informativa: «va con los eventos», se arma en Regalos), Confirmación, Dress code, Fotos, Música y Mensaje final (siempre al final). Cada fila muestra su estado con ícono y texto (nunca solo color).
- **Reordenar:** botones «Subir» / «Bajar» por fila (accesibles con teclado y tacto; el foco queda en el botón; se anuncia la nueva posición). Se pueden mover Save the date, Eventos, Confirmación, Dress code, Fotos y Música; las ocultas no cuentan como lugar. El orden se guarda en `site.order` (`BlockId[]`, con todas las secciones siempre, también las ocultas, para que al volver conserven su lugar) y lo respeta la página pública, la vista previa y lo publicado (`SiteData.order`).
- **Agregar / quitar:** «Para agregar» lista las secciones que no están, con su propósito y «Agregar» (abre su edición). «Quitar» (en la fila y dentro de la edición) las saca de la página **sin borrar lo cargado** y muestra «Deshacer». Las que no incluye el plan aparecen con «Plan Celebración Plus» y «Ver plan». Eventos no se quita (cada momento se muestra u oculta dentro de Eventos).
- **Edición:** tocar una fila abre solo los campos de esa sección, con «← Tu invitación», «Quitar de la invitación» y «Listo». Ya no hay interruptor «Mostrar» por sección.
- **Vista previa:** la página pública real (`?borrador`), a su tamaño lógico (celular 390 px o compu 1280 px) escalado para entrar, con selector **Celular / Compu**. Se actualiza al instante (evento `storage`, ≈150 ms) y se desplaza hasta la sección que se edita, que queda **marcada** con un borde. **Tocar una sección en la vista previa la abre en el editor**; dentro de la vista previa no navega ni abre diálogos. «Ver completa» abre el pop-up de siempre.
- **Desktop (≥ 1100 px):** estructura/edición a la izquierda y vista previa fija a la derecha, siempre a la vista. **Celular:** se alternan «Editar» y «Cómo queda» (la vista previa a pantalla completa); al editar una sección, la ventana en vivo sigue fija arriba. Tocar una sección en «Cómo queda» vuelve a «Editar» en esa sección.
- **Pendiente / no incluido:** arrastrar y soltar (hoy botones), editar el texto directamente sobre la vista previa, reordenar Regalos y Portada, y plantillas de orden.

## Tu página: dirección en la tarjeta, colores del dress code, sección de regalos y texto libre (2026-10-27)

- **Dirección en la tarjeta de eventos:** la tarjeta muestra solo la calle y la altura (`shortAddress` en `logic.ts`): se cortan ciudad, código postal (también el argentino tipo C1425 o B1640ABC), país y coordenadas (una coordenada sola no se muestra). **«Cómo llegar» abre Google Maps con el nombre del lugar y la dirección completa**, o con el enlace propio si la pareja lo pegó. En el editor, debajo de la dirección, un texto dice qué se verá en la tarjeta, hay un botón **«Buscar el lugar en Google Maps»** (abre Maps con lo escrito) y el campo **«Enlace de Google Maps»** ya no está escondido en «Más opciones» (ahí queda solo la nota): se busca el lugar en Maps, «Compartir» → «Copiar enlace», y se pega. Sin ese enlace se genera uno a partir de nombre + dirección.
- **Dress code:** los círculos de colores se pueden **mostrar u ocultar** («Mostrar círculos de colores sugeridos», por defecto sí, como hasta ahora) y **cada color se elige** con un selector (más un nombre opcional por círculo); «Volver a los colores sugeridos» restablece los cuatro de siempre. Se guardan en `site.dressCode.showColors` y `colors` (1–6 colores hexadecimales válidos; si no hay datos válidos, los de fábrica).
- **Sección de regalos:** pasó a ser una sección propia del editor («Regalos», con orden, agregar y quitar como las demás). La pareja elige el **título** (por defecto «¿Querés regalarnos algo?»), un **texto** y el **texto del botón**; el botón lleva a la página de regalos (`/sitio/…/regalos`). Es **solo título, texto y botón**: no muestra regalos de la lista (decisión de la dueña, 2026-10-27). Solo aparece si hay regalos cargados y el plan los incluye. **Quitarla de la invitación no desactiva la lista**: los invitados siguen pudiendo regalar desde la barra («Regalá»); por eso `blocks.giftsSection` es independiente de `blocks.gifts`. Los regalos se siguen armando en «Regalos» (el panel).
- **Texto libre:** una caja con **título** y **mensaje** opcionales para lo que la pareja quiera contar (aviso, anécdota, indicaciones). Es una sección más (se agrega, quita y mueve), viene apagada, y si está prendida y vacía cuenta como pendiente («Falta completar») y no se muestra en la página.
- **Orden:** `BlockId` ahora son siete secciones reordenables: eventos, regalos, rsvp, dress, texto, fotos, música. Los órdenes guardados antes de existir «regalos» y «texto» reciben cada sección nueva justo después de la que la antecede en el orden de fábrica (`normalizeOrder`), así nadie ve su invitación cambiada de lugar de golpe, salvo que los regalos ahora son una sección y no un apéndice de los eventos.
- **Cambio visible para sitios existentes:** el título de la sección de regalos pasó de «Lista de regalos» a «¿Querés regalarnos algo?» (se puede cambiar).


## Tu página: tipografía de la página pública y color de fondo por sección (2026-10-28)

- **Tipografía:** más grande en la web y legible en el celular (nada por debajo de 13 px en cuerpo, rótulos ni botones). Tamaños fluidos con `clamp()` en el bloque «Tipografía de la página pública» de `invitacion.css`: rótulos 13–16 px, botones 15–18 px, lugar del evento 18–26 px, dirección 15–20 px, textos corridos 16–22 px, etc. Las reglas del evento usan la misma especificidad que las anteriores (`.iv-day …`), porque la hoja tiene capas que se pisan.
- **Un renglón cuando se puede:** botones, enlaces, «Cómo llegar» y fecha/hora no se parten (`nowrap`). Los títulos (portada, secciones, dress code, playlist, fecha) pasan por `useFitOneLine` (`site-shell.tsx`): si un título corto no entra en su ancho, se achica lo justo (hasta un 72 %); si aun así no entra, queda en dos renglones parejos (`text-wrap: balance`). Se recalcula al cambiar el ancho, el contenido o al cargar la tipografía. Los nombres de lugar y las direcciones **no** se achican (en las tarjetas angostas quedaban ilegibles): pueden ocupar dos renglones. Verificado en 320, 360, 390, 430, 768, 1024, 1280 y 1440 px sobre `/ejemplo`: ningún título en más de un renglón y sin scroll horizontal.
- **Fondo por sección:** se probó un selector de color de fondo por sección y **se retiró** a pedido de la dueña (2026-10-28): las secciones conservan los fondos de Weda. Los círculos del dress code llevan un borde fino.
- **Ícono de cada evento:** en el editor, cada evento ofrece un set de 10 íconos minimalistas (anillos, iglesia, corazón, brindis, copa, cena, salón, música, destellos, sol; `src/components/event-icons.tsx`). Por defecto: ceremonia/civil anillos, recepción brindis, fiesta salón, brunch cena. Se guarda en `SiteEvent.icon`.
- **Dress code:** tarjeta blanca centrada sobre la foto del sobre (`public/fondo-dresscode.webp`), con título, nota y círculos de color.
- **Fotos:** el mosaico se adapta a la cantidad (1 a 6 y "muchas") para llenar siempre el cuadrado, en web y mobile (`data-n` en `.iv-mosaic`).
- **Regalos:** ícono de regalo minimalista sobre el título; subtítulo más ancho y grande para que entre en un renglón en web.
- **Confirmación de asistencia:** se quitó la línea "Ya cargaste una confirmación en esta demostración".

## Inicio: banner «Primeros pasos» (2026-10-27)
- **Pedido de la dueña:** en el lugar de la foto de portada, un banner con pasos, al estilo «Get started» (pestañas de pasos que se van completando), con color de fondo.
- **Qué hay hoy** (`src/components/panel/get-started.tsx`): reemplaza la foto «Tu casamiento» y la tarjeta «Siguiente paso». Tres pasos: **Lista de regalos**, **Sitio de casamiento** y **Publicación**. Muestra el panel del primer paso pendiente (se puede tocar cualquier pestaña para verlo). Cada paso se marca solo, con los mismos datos de `giftsStage` / `siteStage` (`journey.ts`): regalos está completo con al menos un regalo y alias de cobro; micrositio, cuando todos los momentos y secciones prendidas están completos. Los textos y accesos son los que ya usaba «Siguiente paso» («Elegir regalos», «Configurar aportes», «Terminá tu invitación»).
- **Publicación nunca se marca completa:** no existe publicación real. Su panel abre «Publicar» (planes) y «Vista previa», y dice que es una demostración.
- **Versión compacta (2026-10-28, pedido de la dueña):** el banner muestra solo las tres solapas (Lista de regalos, Sitio de casamiento, Publicación) y el paso elegido. Ya no tiene título visible («Primeros pasos» queda solo para lectores de pantalla), ni nombres y fecha (están en la barra), ni «Ocultar / Mostrar»: siempre está a la vista. Es más bajo: ≈ 280 px a 390 px (antes ≈ 440) y ≈ 245 px en compu (antes ≈ 360). Se pasa de un paso a otro tocando las solapas. Fondo arena `#ecebe2` y botón principal en gris oscuro, como antes.
- **Mismo alto en los tres pasos y solapas integradas (2026-10-28):** los tres paneles se dibujan en la misma celda y solo se ve el elegido (los otros quedan `inert` y ocultos para lectores de pantalla), así el banner mide siempre lo que el paso más largo y no salta al cambiar de paso. Altos medidos: 321 px a 320 px, 267 px a 390 px y 231 px a 1280 px, iguales en los tres pasos, con datos completos y vacíos. Las solapas ya no son una caja blanca aparte: son la parte de arriba del mismo banner, separadas por una línea fina, con el paso activo subrayado.
- Supuesto: la foto elegida de la pareja ya no se ve en Inicio (sigue en la barra lateral, la vista previa y la página pública).

## 15. «Save the date» movible y fotos en celular (2026-10-27)

- **«Save the date»** (la sección con la fecha del casamiento y su cuenta regresiva) es ahora una sección reordenable más: `'fecha'` en `BlockId` y `site.order`, **primera por defecto** (justo debajo de la portada, donde siempre estuvo). Un orden guardado antes de que existiera la recibe en ese mismo lugar (`normalizeOrder`). **La portada sigue siempre primera** y el mensaje final siempre al cierre.
- **En el editor:** aparece en «Tu invitación» (con ícono de calendario y estado «Con/Sin cuenta regresiva») con «Subir» y «Bajar» como el resto. **No se quita ni se agrega**: sin fecha no hay sección (no figura en la lista ni en «Para agregar»; «Portada» lo explica) y al definir la fecha aparece en su lugar. Su panel tiene «Mostrar la cuenta regresiva» (antes estaba en Portada); la fecha se sigue cambiando en Portada.
- **En la página pública** la sección tiene su propio ancla `#save-the-date`. El marcador `#nos-casamos` (flecha de la portada y «Invitación» de la barra) quedó como un elemento fijo de alto 0 justo debajo de la portada, así sigue llevando al comienzo de la invitación aunque «Save the date» se mueva.
- **Supuesto (a confirmar):** puede quedar en cualquier lugar, incluso después de las fotos o la música; no se pidió poder ocultarla.
- **Fotos en celular (≤ 700 px):** corregido el mosaico (se veían apiladas: con 3 a 6 fotos algunas quedaban de 0 px de alto o fuera de la grilla de 2 columnas por reglas de escritorio más específicas). Ver `invitacion.css` y `e2e/gallery-mosaic.spec.ts`.


## Tu página: barra de contexto al editar y dos columnas desde 1024 px (2026-10-28)

Detalle, mediciones y alternativas en [ui-iteration-audit.md](ui-iteration-audit.md).

- **Mientras se edita una sección, una barra fija dice dónde estás y cómo volver:** flecha («Volver a Tu invitación»), ícono + nombre de la sección y «Listo», siempre a la vista aunque el formulario sea largo. Antes, «Listo» quedaba al final y la flecha al principio del formulario, y con Eventos uno de los dos estaba siempre fuera de la pantalla.
- **Celular:** la ventana en vivo va pegada debajo de la barra, en el mismo bloque fijo y opaco, para que el formulario no asome por encima. Mientras se edita, del encabezado de la página queda solo «Editar | Cómo queda». En «Cómo queda», «← Seguir editando {sección}» vuelve a la misma sección. Los campos enfocados no quedan tapados por el bloque fijo, que se achica con el teclado.
- **«Quitar de la invitación»** pasó de la barra de arriba al pie del formulario, separado de «Listo», con «Lo que cargaste se guarda». Quitar desde la fila de «Tu invitación» (✕, con «Deshacer») no cambió.
- **Filas en ≤ 420 px:** sin el número de orden, para que los nombres no se corten (el ícono y la posición dan el orden).
- **Compu:** dos columnas desde 1024 px (antes 1100). Entre 1024 y 1279 px se reparten por igual (formulario ≥ 340 px, invitación ≥ 320 px). La vista previa arranca en «Compu» desde 1280 px.
- **Sin cambios de modelo:** las mismas secciones, el mismo orden, el mismo guardado y el mismo «Mostrar» por evento. Esto último queda como decisión abierta (H12 en la auditoría).

## Inicio: rediseño de la dueña (2026-10-28)

Reemplaza el banner «Primeros pasos» y las secciones «Lo que vas a publicar» / «Gestión de invitados». Se llevó el diseño de la dueña (compu y celular) a la tipografía del panel (Geist), sin la serif del boceto.

- **Encabezado:** «Tu casamiento · {nombres}», «Tu invitación empieza acá.» y «Armá tu lista de regalos, diseñá tu sitio y elegí qué publicar cuando esté listo. Podés hacerlo a tu ritmo.». En compu va a la derecha la foto de la pareja (la de portada, o la de muestra si no hay propia), con un corazón dibujado a mano. En celular no hay foto.
- **Pasos** (`get-started.tsx`):
  - Tres pasos numerados unidos por una línea: Lista de regalos, Diseño del sitio y Publicación. El elegido va en círculo oscuro con aro y los completos llevan una tilde. Se cambia de paso tocándolos.
  - Cada paso muestra un ícono sobre un tinte suave (rosa, salvia, celeste), «Paso N de 3», un título, un texto y su botón. «Armar mi lista» aparece si la lista está vacía; si no, el siguiente paso real de `journey.ts`.
  - Al costado va una muestra de «Así se verá en tu invitación»: tres fotos de la lista (o de muestra del catálogo), la portada con los nombres o el link del sitio.
  - Los tres paneles miden lo mismo: no cambia el alto al pasar de paso.
- **Accesos:**
  - «Diseñá tu invitación» lleva al editor.
  - «Elegí qué publicar» abre los planes.
  - En celular son filas con «›», sin descripción.
- **Herramientas adicionales:** Invitados, y Mesas y grupos (con lo que no se publica).
- **No se tocó la navegación.** El boceto muestra «Mesas y grupos» en la barra lateral y un menú tipo hamburguesa en celular, pero eso cambia la navegación de todo el panel, no solo Inicio: queda para decidir aparte.
- **Supuesto:** «Vista previa» deja de ser una tarjeta del Inicio. Sigue en la barra de arriba y dentro del paso «Publicación».

## Eventos: buscar el lugar con Google (2026-10-28, pedido de la dueña)

- **Qué cambia:**
  - En cada evento hay un solo campo **«Ubicación»**: se empieza a escribir y aparece la lista de lugares reales de Google.
  - Al elegir uno, el campo queda mostrando **la dirección corta** (calle y altura, `shortAddress`), nunca el enlace.
  - Debajo dice «Ubicación confirmada: «Cómo llegar» abre este lugar en Google Maps.».
  - Se guardan el nombre (de la sugerencia), la dirección completa y un enlace oficial de Maps con el id del lugar (`query_place_id`). Ese enlace es el que usa «Cómo llegar».
  - El nombre del lugar se puede retocar, porque es lo que ve el invitado en la tarjeta.
  - Para cambiar el lugar se vuelve a escribir en el mismo campo; Escape deja el que estaba.
- **Qué se sacó:** la ayuda «En la tarjeta se ve «…». «Cómo llegar» abre Google Maps con la dirección completa.», el campo «Enlace de Google Maps» y el acceso «Abrir Google Maps para copiar el enlace».
- **Teclado y accesibilidad:** patrón combobox (flechas, Enter, Escape). Busca después de 3 letras, con una pausa corta, no en cada letra. Avisa «Buscando…», «No encontramos ese lugar…» o «No pudimos conectar con Google Maps…».
- **Costo:** usa la Places API (New) de Google con **sesiones de autocompletado**: todas las letras más la elección cuentan como una sola sesión. Al elegir se pide solo `formattedAddress` (categoría «Place Details Essentials»). El nombre sale de la sugerencia y el enlace se arma con `query_place_id` (URL oficial de Maps), para no pedir campos «Pro» como `displayName` o `googleMapsURI`. Resultados limitados a Argentina y Uruguay.
- **Configuración:** clave de navegador de Google Cloud en `VITE_GOOGLE_MAPS_KEY` (`.env.local`; ver `.env.example`), con la Maps JavaScript API y la Places API (New) activadas y restringida por dominio.
- **Sin clave:** el buscador no aparece; quedan «Nombre del lugar» y «Dirección», y «Cómo llegar» busca nombre + dirección en Google Maps, como antes.
- **Pruebas:** `e2e/place-search.spec.ts` simula la librería de Google (no llama a la API real).
- **Facturación:** Google rechaza Places con un 403 genérico («The caller does not have permission») si la cuenta de facturación del proyecto está vencida o sin forma de pago válida, aunque la Maps JavaScript API cargue bien. Revisarlo antes que la clave.

## Eventos: aparecen apenas tienen nombre (2026-10-28, pedido de la dueña)

- Un evento con «Mostrar» activado aparece en la invitación (y en la vista previa del editor) apenas se escribe su **nombre** («Ceremonia», «Brindis»…). Antes esperaba a tener lugar o dirección.
- Mientras falta la ubicación, la tarjeta dice **«Lugar a confirmar»** (mismo criterio que «a confirmar» en el horario) y no muestra «Cómo llegar».
- Los estados del editor y del Inicio no cambian: el evento sigue figurando como «Falta completar» hasta tener lugar. Lo que se publica sigue exigiendo lugar o dirección para contar como contenido (`hasEventDetails`).
- Lógica en `siteFromState` (`src/lib/weda/site-model.tsx`); prueba en `src/test/weda-logic.test.ts`.

## Sin textos de «demo» (2026-10-28, pedido de la dueña)

- **Por qué:** empieza la construcción del backend; la interfaz no debe presentarse como demostración.
- **Qué se sacó:**
  - Avisos «Hoy es una demo…» (ayuda del panel), «Hoy es una demostración: no se publica ni se cobra nada» (paso Publicación del Inicio) y «En esta demo los regalos se registran…» (Regalos).
  - El pie del Inicio «Tus datos se guardan solo en este navegador» con el botón «Reiniciar la demo» y su diálogo.
  - «Pago de prueba» y «(prueba)» en el diálogo de publicar.
  - «Es una demostración…» en la confirmación de asistencia y en el regalo del invitado: ahora dicen «Gracias por avisarnos.» y «Gracias por tu regalo.».
  - «Parejas de demostración…» en Encontrar, «modo demostración» y «Se guarda solo en este navegador» en Perfil, «Se guardan en este dispositivo» en Fotos.
- **Qué se reescribió:** el aviso de sitio no disponible («Puede que el link esté mal escrito o que la página todavía no esté publicada.»), el error de cuenta («No pudimos crear tu cuenta en este momento…») y el de cambio de clave («No pudimos cambiar la clave…»).
- **Qué queda:** los avisos de error reales (sin lugar en el navegador, cambios sin guardar en la cuenta) y la invitación de ejemplo `/ejemplo`, que es un ejemplo, no el producto.
- **Pendiente para el backend:** el pago del diálogo de publicar sigue sin cobrar de verdad, y la confirmación de asistencia y el regalo del invitado sin cuenta no se envían. Hay que conectarlos antes de abrir la app al público.

## Inicio: «Bienvenidos» (2026-10-28)

- El título del encabezado pasa de «Tu invitación empieza acá.» a **«Bienvenidos»**; el texto queda «Armá tu lista de regalos, diseñá tu sitio y elegí qué publicar cuando esté listo.» (se sacó «Podés hacerlo a tu ritmo.»).

## Invitación: bloques centrados (2026-10-28)

- Cada bloque de la invitación (save the date, eventos, confirmar asistencia, cierre y los opcionales) deja **el mismo aire arriba y abajo** y el contenido centrado de izquierda a derecha, en web y en celular.
- Variables en `src/invitacion.css` (bloque final «centrado de los bloques»): `--iv-block` para save the date y confirmar; `--iv-day-pad` para eventos, que ya traen su propio relleno; abajo de eventos se suma `--iv-curve` porque la banda de confirmar se monta sobre la curva.
- Medido en 375, 871 y 1440 px de ancho, sobre un sitio propio y sobre `/ejemplo`: diferencia arriba/abajo de 0 a 1 px.

## Vista previa: sin resumen ni cambio de pantalla (2026-10-28, pedido de la dueña)

- Se sacaron de `/panel/vista-previa` la línea «Los invitados la abren sobre todo desde el celular» con el botón «Probar en pantalla de compu», y el bloque «Qué estás viendo» (estado de cada función según el plan y «Pendiente de completar»).
- La vista previa queda en formato celular, con «Abrir vista limpia» para verla a pantalla completa en otra pestaña.

## Eventos: con uno alcanza (2026-10-28, pedido de la dueña)

- La pareja no tiene que cargar tres eventos: con **uno completo** (nombre + lugar o dirección) la sección queda lista.
- Un evento con «Mostrar» tildado pero **vacío** (sin nombre, lugar ni dirección) ya no cuenta como pendiente (`eventBlank` en `journey.ts`): no aparece en «Falta completar», ni en el Inicio, ni en el diálogo de publicar, ni en la invitación. En el editor su fila dice «Sin cargar» en tono neutro.
- Un evento empezado (por ejemplo, solo con nombre) sí sigue pendiente hasta tener lugar.

## Constructor: invitación prearmada y «Para agregar» (2026-10-28, pedido de la dueña)

- **Obligatoria solo la portada.** Todo lo demás se puede quitar y volver a agregar con lo que se había cargado.
- **Prearmado de fábrica** (cuenta nueva): Portada, Save the date, Eventos, Regalos y Confirmación. Dress code, Texto libre, Fotos, Playlist de Spotify y Mensaje final empiezan en «Para agregar» (el mensaje final ya no viene prendido).
- **Save the date opcional** (`site.saveDate`, viene prendido): se quita y se agrega como cualquier sección; la cuenta regresiva sigue siendo opcional dentro. Sin fecha, queda en la lista con «Aparece al definir la fecha» y no se ve en la página.
- **Mensaje final movible:** es una sección más del orden (`BlockId` `mensaje`), por defecto al final. Los órdenes guardados antes lo reciben al final (`normalizeOrder`), no pegado a la música.
- **Eventos:** las filas arrancan cerradas; tildar «Mostrar» no abre la fila, pero el evento aparece enseguida en la invitación aunque esté vacío («Evento N · Lugar a confirmar»). Un evento vacío sigue sin contar como pendiente.
- **Playlist de Spotify:** la sección «Música» pasa a llamarse «Playlist de Spotify». Se pega el link de la playlist (o álbum) y la invitación muestra el reproductor oficial de Spotify (`spotifyEmbed` en `logic.ts`). Si no es un link de Spotify, el campo lo marca. La lista de temas cargada a mano (versión anterior) se sigue mostrando si no hay link.
- **Distinción visual** (`panel.css`, bloque «Constructor»): «Tu invitación» = tarjetas blancas con borde lleno, número de orden oscuro y un contador; «Para agregar» = recuadro gris aparte, filas con borde punteado, ícono apagado y botón «Agregar» lleno.
- **Textos que sobraban, fuera:** «Así está armada…», «Quitar una sección no borra…», «Se completa al elegir el lugar…», «Lo que cargaste se guarda.», las ayudas largas de Save the date, Regalos, Texto libre, Confirmación, Dress code, Fotos y Mensaje final, y en «Ubicación» la ayuda inicial (queda «Ubicación confirmada»). Descripciones de «Para agregar» resumidas a dos o tres palabras.

## Ayuda: contacto (2026-10-28)

- El diálogo de Ayuda del panel termina con un recuadro «¿Necesitás ayuda? Escribinos a hola@weda.app» (enlace `mailto:`). Es el correo de consultas de Weda. No hay formulario: el correo se abre en la aplicación de mail de la persona.

## Publicación: 6 meses (definición comercial, 2026-10-28)

- **La página queda publicada 6 meses** (antes 1 año) con cualquiera de los tres planes. `PUBLICATION_TERM = '6 meses'` y `PUBLICATION_MONTHS = 6` en `plans.ts`; el vencimiento se calcula con `addTerm` en `payments.ts` (si el día no existe en el mes de destino, vence el último día de ese mes). Se ve en la landing, en el diálogo de publicar y en Ayuda. Esto reemplaza lo dicho más arriba sobre «1 año».
- **Cambio de plan:** solo a uno más completo, pagando la diferencia; no se puede pasar a uno más económico (como ya hacía `upgradeOptions`).

## Ayuda: preguntas frecuentes (2026-10-28, respuestas de la dueña)

- El diálogo de Ayuda muestra 7 preguntas desplegables (`<details>`, respuesta oculta hasta tocar la pregunta) y abajo el contacto «¿Necesitás ayuda? Escribinos a hola@weda.app».
- Preguntas: cuánto cuesta y cuándo pago (precios de `PLANS`), cambiar de plan, cómo compartir (el link que se genera al publicar), cómo recibir regalos (alias en Datos de cobro, transferencia directa sin comisión, comprobante del invitado), dónde ver los regalos (Regalos → Aportes recibidos), editar después de publicar (sí, mientras esté publicada) y cuánto queda online (6 meses).
- **Pendiente para el backend:** la respuesta dice que en «Aportes recibidos» se ve el comprobante; hoy esa lista muestra quién, qué regalo, monto, fecha y mensaje, pero todavía no el comprobante adjunto.

## Regalos y confirmación: correo del invitado y novedades de Weda (2026-10-28, decisión de la dueña)

- **Regalo:** el correo es **obligatorio** («Para enviarte la constancia de tu regalo. Los novios también lo ven.»). Se suma una casilla **aparte y destildada**: «Quiero recibir novedades y promociones de Weda por correo. Puedo darme de baja cuando quiera.» (`MARKETING_CONSENT_TEXT`, `src/lib/weda/consent.ts`). No es necesaria para regalar.
- **Confirmación de asistencia:** el contacto pasa de «email o teléfono» a **correo** (obligatorio en el formulario, como lo era el contacto). Antes se pedía pero no se enviaba: ahora llega al servidor y queda en cada persona de ese envío. Misma casilla de novedades, antes de «Enviar».
- **Servidor (migración 2):** `contributions.giver_email` (obligatorio en nuevos aportes; `invalid_giver_email` si falta), `guests.email` (opcional) y la tabla **`marketing_consents`**: correo, origen (`gift`/`rsvp`), casamiento de origen, **versión del texto aceptado** y fecha; la baja se marca (`revoked_at`), no se borra. Es la base de Weda, separada de los datos de cada casamiento (no se borra con el casamiento). Solo entra quien tildó la casilla.
- **Panel → Regalos → Aportes recibidos:** un aporte por envío: quién regaló, su correo, los regalos que eligió (uno o varios, cada uno con su monto), total, fecha, mensaje, estado («A revisar» / «Confirmado») y **«Ver comprobante»** (o «Falta el comprobante»). Con cuenta se lee del servidor (`GET /api/contributions`); sin cuenta, de lo registrado en este navegador (sin archivo de comprobante).
- **Pendiente (backend y legal):** proveedor de correo para enviar la constancia y los recordatorios («todavía no subiste el comprobante»), página de **política de privacidad** (hoy no existe y el registro ya la menciona), enlace de **baja** en cada correo de novedades que marque `revoked_at`, y la **inscripción de la base** ante la AAIP. Los recordatorios de comprobante son comunicaciones del servicio (finalidad del regalo); las promociones de Weda, solo a quien tenga consentimiento vigente.

## Correos, comprobante y baja (2026-10-28)

- Constancia del regalo por correo, botón «Pedir comprobante» en Aportes recibidos (uno por día), página `/comprobante` para adjuntarlo desde el correo, baja de novedades por enlace firmado y borrador de `/privacidad` (enlazada desde las casillas de novedades y el registro).
- Sin `RESEND_API_KEY` no se envía nada: el panel avisa «El envío de correos todavía no está configurado».
- Detalle, configuración y checklist previo al lanzamiento (incluida la inscripción en la AAIP): [datos-personales.md](datos-personales.md).

## Sin comprobante no hay regalo (2026-10-28, decisión de la dueña)

- **Invitado:** «Enviar» queda deshabilitado hasta adjuntar el comprobante (y nombre, apellido y correo); abajo dice «Para enviar falta: comprobante.».
- **Servidor:** el comprobante viaja **en el mismo envío** que el regalo (`receipt: { data: base64 }` en `POST /api/public/:slug/contributions`). Sin comprobante responde `receipt_required` y no registra nada; un archivo que no es imagen ni PDF, `unsupported_file_type`. Antes eran dos pasos y, si fallaba la subida, el regalo quedaba sin comprobante.
- **Pareja:** no se puede marcar como «confirmado» un aporte sin comprobante (`receipt_required`).
- `PUT /api/public/contributions/:id/receipt` queda para **reemplazar** el comprobante (página `/comprobante`). «Pedir comprobante» queda solo para aportes viejos, anteriores a esta regla.

## Auditoría UX y conversión (2026-10-28)

Detalle completo en [auditoria-ux-conversion/](auditoria-ux-conversion/README.md). Cambios de flujo:
- **Publicar exige cuenta.** Sin cuenta, la revisión dice «Para publicar necesitás una cuenta…» y el botón es «Crear cuenta para publicar». Una publicación guardada solo en el navegador no se muestra como «Publicada».
- **Sin pago simulado.** No hay proveedor de pagos: la revisión muestra «Precio» y el botón «Publicar». Nunca «Pagar», «Pagaste» ni «Total pagado» hasta que exista un pago confirmado por el proveedor.
- **«Publicar los cambios»** en «Tu publicación»: la página pública es una copia del momento de publicar; este botón la actualiza con el mismo link.
- **Registro sin Google ni Apple** (no hay OAuth).
- **`/encontrar`:** pegar el link de la invitación; ya no hay parejas inventadas.
- **Perfil sin cuenta:** solo la invitación a crearla (no hay clave que cambiar).

## Remediación post-auditoría (2026-10-29)

Detalle: [auditoria-ux-conversion/post-audit-remediation.md](auditoria-ux-conversion/post-audit-remediation.md).
- **Recuperar la clave:** «¿Olvidaste tu clave?» en Ingresar → `/clave` (el enlace llega por correo, vale una hora, un solo uso) → `/clave/nueva` → al cambiarla se cierran las sesiones.
- **Pagos:** con proveedor configurado, «Ir a pagar ARS …» → checkout → `/panel/pago` consulta al servidor → «Pago confirmado» → «Publicar mi página». Sin proveedor, publicar no cobra. `/pago-de-prueba` solo con el proveedor de prueba.
- **Vencimiento:** a los 6 meses de la primera publicación la página pública dice «Esta invitación ya no está disponible». Publicar cambios no lo extiende; vencida no se reabre sola.
- **Landing:** «Por qué Weda» (funciones reales) en lugar de testimonios inventados; pie con «Términos de uso» y «Privacidad».
- **Alta:** «Continuar» y «Registrarme» quedan deshabilitados hasta que la página está activa (antes, tocar muy rápido recargaba la página).

## Landing: testimonios (2026-10-29)
- La sección entre «Funciones» y «Armá tu casamiento» muestra el carrusel de **testimonios** cuando `src/lib/testimonials.ts` tiene al menos uno; con la lista vacía muestra «Por qué Weda» (funciones reales). Los cuatro testimonios actuales (Camila & Lucas, Valentina & Mariano, Julieta & Franco, Juan & Claudia) los cargó la dueña el 2026-10-29, que responde por su autenticidad y permiso; la auditoría 2026-10-28 (F-10, Ley 24.240) advirtió que publicar testimonios que no son de clientes reales puede ser publicidad engañosa. Cada uno lleva frase, nombre como quieren figurar y foto opcional en `public/parejas/`.

## Registro: «Registrarme / Ingresar con Google» (2026-10-29)
- Decisión de la dueña: Google se suma al flujo de `/crear/cuenta` (es gratis y baja la fricción) y **Apple se descarta**. El botón se ve como el flujo real (G de colores de Google, texto «Registrarme con Google» / «Ingresar con Google», sin etiquetas), debajo del formulario y de un separador «o». **Todavía no hay OAuth**, así que al tocarlo **no simula una cuenta** (la versión anterior avanzaba sin registrar a nadie y la auditoría 2026-10-28 la sacó): muestra «El acceso con Google todavía no está habilitado. Por ahora usá tu correo y una clave.». Cuando exista el OAuth de Google (cliente en Google Cloud, rutas de ida y vuelta, unión con cuentas existentes del mismo correo) este botón lo inicia.

## Ciclo de vida del evento: pagar = activar + publicar, vigencia única de 12 meses (decisión definitiva, 2026-10-30) — todavía NO implementado
Esta decisión **reemplaza** el modelo anterior (plan de 6 meses, permanencia pública con recuerdo, 90 días de acceso privado y la espera entre el pago y la primera publicación). Detalle y estados en `docs/data-architecture/02d-event-lifecycle-and-final-export.md`.
- **Contratar, pagar y publicar son una única acción.** La pareja puede crear y configurar su evento antes de pagar. Cuando el pago queda confirmado: la contratación queda activa, el evento pasa a activo, **el micrositio se publica automáticamente**, se registra la primera publicación efectiva, comienza la vigencia de 12 meses y se informa la fecha exacta de vencimiento. **No existe** un plazo posterior para publicar ni una contratación pagada que espere publicación.
- **El evento se publica aunque no esté completo.** Completar el micrositio después de contratar es responsabilidad de la pareja. No se bloquea la publicación por secciones opcionales incompletas: solo se validan los requisitos estrictamente necesarios para generar una página pública válida y segura (lista exacta pendiente, P35; recomendación: validar y reservar la dirección antes de iniciar el pago y no mostrar las secciones vacías).
- **Inicio de la vigencia:** el momento en que **Weda confirma el pago y activa la publicación**. No comienza al crear el borrador, registrarse, iniciar el checkout ni hacer clic en pagar si el pago todavía no está confirmado; no se reinicia al despublicar ni republicar; no cambia al modificar la fecha de la boda. Si el proveedor confirma con demora, se usa la fecha y hora en que Weda confirma y activa el evento.
- **Durante los 12 meses el evento está completamente operativo:** editar cualquier bloque, publicar, despublicar y republicar, cambiar textos, imágenes, fechas y configuración, gestionar invitados y acompañantes, RSVP, regalos, aportes y comprobantes (con revisión manual de estados), modificar alias y datos bancarios (con los controles de seguridad definidos), consultar la información financiera y descargar exportaciones (invitados y RSVP, regalos y aportes, comprobantes en ZIP, resumen financiero). **No hay ningún bloqueo a los 6 meses.**
- **Al cumplirse los 12 meses el evento finaliza y se cierra de forma definitiva:** se bloquean edición, publicación y republicación, la gestión para **todos los roles (el propietario incluido)**, las funciones públicas interactivas (RSVP y regalos), el acceso privado al panel y las descargas y exportaciones. **No hay renovación, extensión, reactivación ni período adicional de acceso**; soporte tampoco puede reabrirlo.
- **Página pública tras el vencimiento (P31):** la URL **deja de estar disponible**. No hay recuerdo estático ni micrositio público, no se permite RSVP ni regalos y no se muestra ningún dato de invitados, información financiera ni alias. La URL no se reutiliza y el servidor responde como **evento no disponible**.
- **La fecha de la boda no determina la vigencia.** No se limita con cuánta anticipación se contrata: si la boda es posterior al vencimiento, el evento vence igual. Debe explicarse **claramente antes de contratar**: «La vigencia es de 12 meses desde que se confirma el pago y se publica la página, independientemente de la fecha del casamiento.»
- **Cuenta tras el cierre (P32):** la cuenta puede seguir existiendo; el evento vencido permanece cerrado (no se reactiva, edita, duplica ni recupera como evento operativo) y una cuenta activa no cambia su estado. Para seguir, la pareja contrata y crea un **evento nuevo e independiente desde cero**: no se copian bloques, regalos, invitados ni configuraciones.
- **Derechos legales (P32):** los derechos de acceso, rectificación y supresión se atienden por un **procedimiento separado**, sin reactivar el evento ni habilitar de nuevo el panel. **El derecho legal de acceso a datos personales no es el acceso comercial al producto.**
- **Antes de confirmar la contratación (P33):** la pareja **acepta expresamente las seis condiciones de vigencia**: (1) 12 meses desde que Weda confirma el pago y activa la publicación; (2) registrarse, crear el borrador, completar el onboarding o iniciar el pago sin que esté confirmado no inician el plazo; (3) despublicar o republicar no reinicia ni extiende la vigencia; (4) la fecha de la boda no modifica el vencimiento; (5) al vencer el evento se cierra, sin renovación ni extensión; (6) después del vencimiento no hay acceso al panel ni exportaciones. *(La redacción de la 1 y la 2 se ajustó a «pagar = activar + publicar»: requiere aprobación de la dueña.)* Se guarda quién aceptó, el evento y la contratación, fecha y hora, la versión del texto y la evidencia; sin esa aceptación la contratación no se confirma. Consideraciones legales pendientes en `02d` §1.4.
- **Avisos y fecha de vencimiento (P23):** la fecha exacta de vencimiento se informa al activarse el evento y se muestra en el panel y en el resumen de contratación. Avisos a **30, 7 y 1 día antes**, en el panel y por correo al propietario, con un recordatorio destacado de **descargar los datos y comprobantes antes del vencimiento**. Los avisos **no modifican ni extienden** la vigencia; el correo se envía una sola vez por aviso y no se da por entregado solo porque se intentó enviar.
- **Datos después del cierre:** no se asume eliminación inmediata; cada clase de dato sigue una política posterior al cierre con **plazos todavía no definidos** (requieren asesoramiento contable y legal). Lo financiero exigible se conserva separado y con acceso restringido, sin reactivar el evento.
- Los informes solo dicen lo que Weda sabe: aporte registrado, comprobante cargado, revisado, **confirmado manualmente por la pareja**, rechazado, reembolso o corrección registrada. Weda no verifica transferencias: nunca «recibido» ni «acreditado».
- **Evento finalizado dentro de la cuenta (P34, propuesta adoptada):** aparece en la cuenta del propietario con estado «Finalizado» y **solo** información comercial y contractual: nombres de la pareja, fecha de la boda, plan contratado, fecha de activación y de vencimiento, historial de órdenes y pagos a Weda y comprobantes de compra de Weda, cuando corresponda. **No** se muestra ni se accede al micrositio, invitados, RSVP, regalos y aportes, alias y datos bancarios, comprobantes cargados por invitados ni información operativa o financiera; no se puede editar, duplicar, recuperar, exportar ni reactivar.
- **Lo que nunca se contrató (P19, adoptada):** el borrador sin contratación se elimina por inactividad (inicio de sesión o escritura efectiva): cuenta sin evento 12 meses; evento creado sin contratación 6 meses; onboarding incompleto 6 meses; borrador avanzado nunca contratado 12 meses. Contratar saca el evento del régimen de borradores. Eliminar un borrador no es eliminar la cuenta ni ejercer un derecho legal. Los avisos previos (30, 7 y 1 día) son una recomendación por confirmar; el fundamento legal está pendiente.
- Pendientes (`02d` §10 y `06` §2): **P30, P6, P26 y P5** requieren asesoramiento legal, contable o de seguridad; **P35** (requisitos mínimos de publicación) requiere definición; ninguna se implementa hasta resolverse.
- **El código y los textos actuales NO coinciden** (no se cambió código): hoy el pago confirmado solo habilita el botón «Publicar mi página» (dos acciones separadas); la vigencia es de **6 meses** (`PUBLICATION_MONTHS = 6` y `PUBLICATION_TERM = '6 meses'` en `plans.ts`, textos en la landing, el diálogo de publicar y Ayuda); la página, el RSVP y los regalos devuelven `410` a los 6 meses; el servidor bloquea publicar pero no editar al vencer; no existe el estado «finalizado», el cierre del panel ni las exportaciones; y cada cuenta tiene un solo casamiento. Lo descripto en «Pagos» y «Vencimiento» más arriba es el comportamiento **actual**.

## Aviso de «cambios sin publicar» (2026-10-31, implementación de DASH-04 / NE-03)
- **Quién lo decide:** el servidor. Al guardar el borrador y al abrir el panel compara la página que publicaría ahora con la que está publicada (`pendingChanges`). Solo cuenta lo que ve un invitado: cambiar la lista de invitados no genera aviso; cambiar textos, fotos, regalos o el plan, sí.
- **Arriba a la derecha:** con la página publicada y cambios pendientes, el botón «Publicada» pasa a decir «Publicar cambios» y abre «Tu publicación». Al publicar vuelve a «Publicada».
- **En «Tu publicación»:** el estado dice «Publicada, con cambios sin publicar» y un texto explica que la página todavía muestra la versión anterior, con el botón «Publicar los cambios». Si está al día dice «Tu página ya muestra todo lo que guardaste» y no ofrece volver a publicar lo mismo. Mientras no llegó el dato del servidor, se mantiene el texto y el botón anteriores, sin afirmar nada.
- **Supuesto:** con la página dada de baja no hay aviso; «Volver a publicar» ya publica lo último guardado.
