# Weda · Flujos de usuario (lo que hoy existe en el código)

Describe los recorridos **implementados** en el frontend sin backend. No describe objetivos futuros. Criterios de decisión: [product-principles.md](product-principles.md). Detalle técnico y rutas: [panel-frontend.md](panel-frontend.md). Estilos y componentes: [design-system.md](design-system.md).

## 1. Mapa de rutas

| Ruta | Función |
|---|---|
| `/` | Landing. Los botones «Crear mi evento», «Crear mi lista de regalos» y «Crear mi evento gratis» (en cada plan) llevan a `/crear/cuenta`. La sección de planes (`src/components/landing-plans.tsx`) muestra nombre, precio, 4–5 funciones y «Ver todo lo que incluye» sin pedir elegir plan. |
| `/ejemplo`, `/ejemplo/regalos` | Casamiento de demostración (invitación y lista de regalos). |
| `/encontrar` | Buscador de invitados (demo: cuatro parejas de ejemplo en `src/lib/demo-couples.ts`, que abren la lista de regalos de ejemplo; no consulta ningún servicio ni directorio real). |
| `/crear/cuenta` | Paso 1: registro o ingreso con correo y clave, o con Google / Apple. Es solo la interfaz: sin backend no se crea ninguna cuenta ni se guarda la clave, y la pantalla lo dice («Versión de prueba: no se crea una cuenta real ni se guarda tu clave. Tus datos quedan solo en este navegador.»). Encabezado «¡Bienvenidos!», línea de términos y privacidad (sin páginas todavía: es texto, no enlaces) y «¿Ya sos miembro? Ingresá». **Registrarse o ingresar (correo, Google o Apple) nunca borra el evento guardado en el navegador** (`src/lib/weda/account.ts`): con el onboarding terminado se sigue a `/panel`; con nombres cargados pero sin terminar, o sin evento, a `/crear` (que conserva lo cargado). Si hay un evento guardado, la pantalla lo avisa («Ya tenés un evento guardado…») y ofrece «Empezar un evento nuevo», que pide confirmación antes de borrar. |
| `/crear` | Paso 2: nombres y fecha (opcional). |
| `/crear/foto` | Paso 3: la foto de la pareja (portada de la página), con la foto a la vista. Se puede omitir («Omitir por ahora»). Sin nombres cargados vuelve a `/crear`. |
| `/crear/plan` | Ya no existe como paso: redirige a `/panel`. El plan se elige al publicar (diálogo «Elegí tu plan para publicar»). |
| `/panel` | Inicio: avance y pasos. |
| `/panel/regalos` | Lista de regalos. |
| `/panel/invitados` | Invitados y, en la misma pantalla, Mesas y grupos (`?vista=mesas`). `/panel/mesas` redirige. |
| `/panel/sitio` | Tu página web. |
| `/panel/vista-previa` | Ver como invitado. |
| `/sitio/$slug`, `/sitio/$slug/regalos` | Página pública simulada de la pareja. Solo existe en el navegador de quien la creó. |

## 2. Crear el evento (el plan se elige al publicar)

0. `/crear/cuenta` (supuesto documentado: sin backend no hay cuentas reales; Google y Apple no autentican y no hay OAuth; el texto de la pantalla lo aclara). Los botones de la landing y del menú llevan acá primero.
1. `/crear`: pantalla centrada y sin encabezado (solo una «X» que vuelve al inicio): tu nombre, el nombre de tu pareja y la fecha, con el interruptor «Todavía no tenemos fecha» (se puede avanzar sin fecha). «Continuar» guarda los datos y pasa a la foto.
1b. `/crear/foto` («Sumá una foto de ustedes» · «Podés cambiarla cuando quieras.»): la foto le da identidad a la página, por eso se pide en el onboarding. La pantalla muestra **solo la foto**, sin textos encima (ni «¡Nos casamos!», ni nombres, ni fecha), chica y centrada dentro de la tarjeta (alto `min(36dvh, 280px)`, proporción 4:5); sobre la imagen de muestra hasta que suban la suya. En el celular **entra en una sola pantalla, sin scroll**, con el título en un renglón. La acción principal es «Subir una foto de ustedes» y, ya subida, «Continuar» (con «Cambiar la foto»). **Supuesto (a confirmar): no es obligatoria**; «Ahora no, la subo después» sigue con la imagen de muestra y la pareja la cambia desde el panel (`CoupleDialog`/`PhotoPicker` o «Editar datos»). Si se quisiera exigirla, es una decisión comercial: hoy no bloquea. La foto se reduce y se guarda en este navegador; la pantalla no lo explica (no hay cuentas ni servidor, y el resto de la interfaz ya lo dice donde importa).
2. Desde la foto entra a `/panel` con todo habilitado para probar (planId vacío = «Prueba gratuita»). Sin evento el panel redirige a `/crear`. No se pide plan ni tarjeta.
3. Al tocar «Publicar» (o «Elegir plan» / «Ver los planes») se abre el diálogo con los tres planes, precio por evento y qué incluye cada uno. Elegir **no cobra ni publica** (no hay servicio conectado) y se puede cambiar cuando se quiera. Si ya se cargó algo que el plan elegido no incluye (música, galería, mensaje final, página, invitados, mesas), se conserva como **borrador**: no se publica y el diálogo y la pantalla bloqueada dicen en qué plan sí (`draftsFor` en `logic.ts`).

## 3. Planes (fuente: `src/lib/weda/plans.ts`)

| Función | Regalos (ARS 95.000) | Invitación (ARS 180.000) | Completo (ARS 320.000) |
|---|---|---|---|
| Lista de regalos, alias/tarjeta y registro de regalos recibidos | sí | sí | sí |
| Micrositio (portada, eventos con Google Maps, foto principal, dress code, cuenta regresiva) | no | sí | sí |
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

- Una lista de secciones: Portada, Evento 1, 2 y 3 (opcionales, con nombre que elige la pareja; sin nombre se llaman «Evento 1/2/3»), Confirmación de asistencia, Dress code, Fotos, Mensaje final y Música (plan Completo). Cada una muestra su estado y tiene «Mostrar». Ocultar no borra lo cargado. Solo hay una sección abierta a la vez.
- Portada: foto, nombres, fecha y «texto sobre los nombres» (puede quedar vacío).
- Confirmación de asistencia: solo mostrar u ocultar.
- Desktop (≥1100 px): dos áreas, edición al 45 % y vista previa al 55 %, con la página pública real en formato celular y scroll propio; al abrir una sección la vista previa se desplaza hasta ella (también si la sección aparece después, por ejemplo un evento recién cargado) y cada cambio se ve al instante (mismo estado). Celular (<1100 px): la vista previa queda **fija arriba** (≈34 % del alto, entre 170 y 280 px) y las secciones se editan debajo; al abrir una se la acerca bajo la vista previa. «Ampliar vista» la agranda y oculta los campos; «Seguir editando» vuelve sin perder nada. Cada sección termina con «Listo» (vuelve a la vista general) y «Ver en la vista previa». Con menos de 520 px de alto (apaisado) la vista previa no queda fija. En eventos, «Nota» y «Enlace de Maps» van en «Más opciones» (se abre solo si ya tienen contenido). Un solo acceso a la **vista limpia** («Abrir vista limpia», pestaña nueva, sin controles). «Ver como invitado» (arriba) abre la vista previa a pantalla completa; el cambio celular/compu es una herramienta secundaria ahí.
- Cada sección muestra su descripción, estado y «Mostrar». Etiqueta discreta «Incluido en Completo» solo en Fotos, Mensaje final y Música (lo que diferencia los planes, derivado de `planFor`).
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
- «Publicar mi casamiento» abre el diálogo de planes y, al elegir uno, un **resumen de publicación**, que **no cambia el sitio**: solo «Ver mi sitio con este plan» lo aplica y «Volver a probar todo» lo deshace (`publishSummary` en `src/lib/weda/publish.ts`): qué se publica con ese plan, qué está incluido pero vacío y qué queda como borrador (con el plan que lo habilita), más avisos sin bloqueo (falta el cobro, falta la fecha). Cambiar de plan no borra nada. «Pagar y publicar» está **deshabilitado y rotulado «sin conexión»**: no simula contratación, pago ni publicación.
- Pendiente (necesita backend): borrador privado, vista previa compartible protegida, versión pública con URL estable, verificación real del pago antes de publicar y «publicar cambios» explícito.

- La vista previa («Ver como invitado») lista debajo, por función, si está **Configurada**, **Incluida pero falta cargar** o **Requiere plan X**, y los pendientes de completar con acceso al editor. Sin plan elegido se muestra como quedaría con el más completo.

## 9. Persistencia y comportamiento sin backend

- Estado único en `localStorage` (`weda-app`). Sobrevive a recargas; datos ausentes, corruptos o de versiones anteriores se leen sin romper. Las fotos se reducen y se guardan en el navegador (~5 MB; si se llena, el panel avisa).
- La vista previa (iframe) se sincroniza por el evento `storage`.
- No hay cuentas, correos, pagos, publicación real ni sincronización entre dispositivos.

## 10. Vacíos y supuestos (a confirmar con la autora antes de tratarlos como reglas)

- **Precios, comisiones, plazos y condiciones de publicación:** no definidos. La interfaz dice que el precio se informa al publicar.
- **Qué hay en «Completo»:** la diferencia con Invitación son música de la fiesta, galería de fotos con hashtag y mensaje final (las tres se restringen de verdad por plan). Spotify real y más secciones no existen todavía. Los datos guardados con los nombres viejos de plan se migran (versión 1 → 2: completo→invitacion, premium→completo).
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
- Se quitaron los recuentos (confirmados, regalos, pasos listos), la barra de segmentos y el estado de publicación en bloque. Inicio muestra: la foto «Tu casamiento» con «Editar datos», el **siguiente paso** recomendado y «Adónde querés ir», con seis accesos: Lista de regalos, Tu página, Invitados, Mesas y grupos, Ver como invitado y Publicar (abre los planes y dice el plan y el precio si ya se eligió).
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
- Al tocar **Publicar**, el diálogo **«¿Qué querés publicar?»** muestra **tres cuadrados lado a lado** (apilados en celular), pensados como producto y no como plan: **Regalos**, **Invitación** y **Completo**. Cada uno trae, en este orden: ícono y nombre con una frase corta (`product` en `plans.ts`), **precio**, **«Pago único» y «Publicada 1 año»**, entre 3 y 4 puntos con ícono (`highlights` en `plans.ts`), **«Ver más»** (plegado: el detalle completo de `items` y, si algo cargado quedaría como borrador, el aviso), **«Ver link»** y **«Publicar»**.
  - **Regalos:** lista de regalos, alias y tarjeta para recibir, regalos recibidos y quién los hizo, link para compartir. Nada más.
  - **Invitación:** «Todo lo de Regalos» + página con los datos de la fiesta, confirmación de asistencia, invitados, mesas y grupos.
  - **Completo:** «Todo lo de Invitación» + música de la fiesta, galería de fotos y mensaje final.
- **Definición comercial nueva (la autora, 2026-10-21): la página queda publicada 1 año con cualquiera de los tres** (`PUBLICATION_TERM` en `plans.ts`). Antes la duración no estaba definida. Hoy es solo un texto: no hay publicación real, así que nada se publica ni vence. No se definió qué pasa al cumplirse el año (renovación, baja, precio): no se afirma nada al respecto.
- **No se prometió «validar» regalos:** la app no verifica pagos (el panel de aportes lo dice). Se muestra «Regalos recibidos y quién los hizo», que es lo que existe.
- **«Publicar»** (en lugar de «Elegir {plan}», que se confundía con elegir regalos) lleva al resumen. Lo que se publica ya está armado: el resumen empieza con **«Se publica: …»** (`publishedPagesText()` en `publish.ts`, derivado de la matriz), lista pendientes sin bloquear y mantiene «Pagar y publicar (sin conexión)» deshabilitado. «Volver a las opciones» regresa a los tres cuadrados. «Ver mi sitio con este plan» sigue siendo lo único que aplica el plan.
- **«Ver link»** abre en otra pestaña la página pública REAL con los datos de la pareja, armada como se vería con ese producto (Regalos → solo `/regalos`; Invitación y Completo → la invitación). **No cambia el plan guardado.** Mecanismo: `/sitio/$slug[/regalos]?plan=…`; `AppSite` (`site-providers.tsx`) lee el parámetro una sola vez y llama a `siteFromState` con ese plan. Como todavía no hay publicación, el link vive solo en este navegador.
- **Supuesto a confirmar:** según `plans.ts`, Invitación incluye la lista de regalos (los planes son acumulativos). Si la intención es que Invitación NO incluya regalos, es una definición comercial que hay que decidir.

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
