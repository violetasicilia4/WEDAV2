# Weda · Flujos de usuario (lo que hoy existe en el código)

Describe los recorridos **implementados** en el frontend sin backend. No describe objetivos futuros. Criterios de decisión: [product-principles.md](product-principles.md). Detalle técnico y rutas: [panel-frontend.md](panel-frontend.md). Estilos y componentes: [design-system.md](design-system.md).

## 1. Mapa de rutas

| Ruta | Función |
|---|---|
| `/` | Landing. Los botones «Crear mi evento», «Crear mi lista de regalos» y «Crear mi evento gratis» (en cada plan) llevan a `/crear/cuenta`. La sección de planes (`src/components/landing-plans.tsx`) muestra nombre, precio, 4–5 funciones y «Ver todo lo que incluye» sin pedir elegir plan. |
| `/ejemplo`, `/ejemplo/regalos` | Casamiento de demostración (invitación y lista de regalos). |
| `/encontrar` | Buscador de invitados ([encontrar-tu-casamiento.md](encontrar-tu-casamiento.md)). |
| `/crear/cuenta` | Paso 1: registro o ingreso con correo y clave, o con Google / Apple. Es solo la interfaz: sin backend no se crea ninguna cuenta ni se guarda el correo o la clave (la pantalla no lo anuncia). Encabezado «¡Bienvenidos!», línea de términos y privacidad (sin páginas todavía: es texto, no enlaces) y «¿Ya sos miembro? Ingresá». Cualquier salida válida lleva a `/crear` conservando `?plan`. |
| `/crear` | Paso 2: nombres y fecha (opcional). |
| `/crear/plan` | Ya no existe como paso: redirige a `/panel`. El plan se elige al publicar (diálogo «Elegí tu plan para publicar»). |
| `/panel` | Inicio: avance y pasos. |
| `/panel/regalos` | Lista de regalos. |
| `/panel/invitados` | Invitados y, en la misma pantalla, Mesas y grupos (`?vista=mesas`). `/panel/mesas` redirige. |
| `/panel/sitio` | Tu página web. |
| `/panel/vista-previa` | Ver como invitado. |
| `/sitio/$slug`, `/sitio/$slug/regalos` | Página pública simulada de la pareja. Solo existe en el navegador de quien la creó. |

## 2. Crear el evento (el plan se elige al publicar)

0. `/crear/cuenta` (supuesto documentado: sin backend no hay cuentas reales; Google y Apple no autentican). Los botones de la landing y del menú llevan acá primero.
1. `/crear`: pantalla centrada y sin encabezado (solo una «X» que vuelve al inicio): tu nombre, el nombre de tu pareja y la fecha, con el interruptor «Todavía no tenemos fecha» (se puede avanzar sin fecha). Ya no pide la foto de portada: queda la imagen de muestra (rosas, oscurecida para que se lean nombres y fecha) y la pareja la cambia después desde el panel (`CoupleDialog`/`PhotoPicker`). Tampoco hay vista previa de la portada ni aviso de demostración en este paso.
2. Entra directo a `/panel` con todo habilitado para probar (planId vacío = «Prueba gratuita»). Sin evento el panel redirige a `/crear`. No se pide plan ni tarjeta.
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

- Bienvenida personalizada («¡Empecemos a crear su casamiento!» al empezar; después, un titular según el avance) con un único CTA contextual: «Continuar creando mi casamiento» o el siguiente paso recomendado.
- **Un solo progreso general** (0–100 %) sobre tres etapas de armado. «Revisá y publicá» no suma: la publicación todavía no existe.
- Cuatro etapas: **Prepará tu lista de regalos**, **Diseñá tu invitación**, **Organizá a tus invitados**, **Revisá y publicá**. Estado **Sin empezar / En progreso / Lista para revisar / Completada**, derivado de los datos reales (`stages()` en `src/lib/weda/journey.ts`; `tasks()` de `logic.ts` sigue alimentando el resto del panel). Acción principal: Empezar / Continuar / Revisar / Editar. Se navega libremente.
- Supuestos (definición propia, a confirmar): regalos queda «Lista para revisar» con regalos pero sin alias (el cobro **no bloquea**) y «Completada» con alias; la invitación queda «Lista para revisar» si hay una sección prendida sin datos mínimos (`incompleteSections`); invitados queda «Completada» con al menos una persona; mesas y grupos no entran en el progreso.
- Siguiente paso recomendado (`nextAction`): primeros regalos → configurar cobro → terminar la invitación → cargar invitados → revisar cómo lo verán.
- Etapas fuera del plan elegido: se avisa «Se publica desde el plan X» y el contenido se conserva.
- «Publicar mi casamiento» abre la elección de plan; dice que la publicación y el pago **no están conectados**. «Editar datos» abre nombres, fecha y foto. «Reiniciar la demo» pide confirmación.

## 5. Lista de regalos (`/panel/regalos`)

- Título «Armá tu lista de regalos». Tres bloques en orden de uso, más «Recibidos». Se abre en «Elegí tus regalos» si la lista está vacía y en «Revisá tu lista» si ya hay regalos.
- **Elegí tus regalos:** sets con foto (tocar agrega o quita todo el set; el ícono de lista abre una ventana para elegir de a uno), catálogo con búsqueda y categoría, y «Crear un regalo propio». El **resumen de la selección** (cantidad real, total y cada regalo con «Quitar») queda siempre a mano: panel lateral fijo desde 1024 px y barra inferior que abre un diálogo en el celular.
- **Cómo vas a recibirlos:** alias bancario (se guarda solo) con vista de cómo lo ven los invitados, con estado «Sin configurar» / «Configurado» (aviso «Pendiente» en la solapa). **No bloquea** nada: se explica que para activar los regalos reales al publicar hará falta completarlo. Mercado Pago figura como «Próximamente» (no hay integración); preferencia de mostrar tarjeta. No se mueve dinero. CBU/CVU no está implementado (solo alias).
- **Revisá tu lista:** cantidad y total, regalos con foto, monto y categoría; editar, quitar (con «Deshacer») y ordenar arrastrando; «Volver al catálogo».
- **Recibidos:** tablero (regalos, total, personas, último regalo) y lista con quién, cuándo, medio y mensaje. Es local: se registra cuando se regala desde la vista de invitado.
- Todo lo que se cambia aparece en la página pública (`/sitio/$slug/regalos`) porque usa el mismo estado.

## 6. Tu página web (`/panel/sitio`)

- Una lista de secciones: Portada, Evento 1, 2 y 3 (opcionales, con nombre que elige la pareja; sin nombre se llaman «Evento 1/2/3»), Confirmación de asistencia, Dress code, Fotos, Mensaje final y Música (plan Completo). Cada una muestra su estado y tiene «Mostrar». Ocultar no borra lo cargado. Solo hay una sección abierta a la vez.
- Portada: foto, nombres, fecha y «texto sobre los nombres» (puede quedar vacío).
- Confirmación de asistencia: solo mostrar u ocultar.
- Desktop (≥1100 px): dos áreas, edición al 45 % y vista previa al 55 %, con la página pública real en formato celular y scroll propio; al abrir una sección la vista previa se desplaza hasta ella y cada cambio se ve al instante (mismo estado). Celular: la página es la protagonista; «Editar mi página» abre los controles en pantalla dedicada y «Ver cómo queda» vuelve sin perder cambios. Un solo acceso a la **vista limpia** («Abrir vista limpia», pestaña nueva, sin controles). «Ver como invitado» (arriba) abre la vista previa a pantalla completa; el cambio celular/compu es una herramienta secundaria ahí.
- Cada sección muestra su descripción, estado y «Mostrar». Etiqueta discreta «Incluido en Completo» solo en Fotos, Mensaje final y Música (lo que diferencia los planes, derivado de `planFor`).
- Cambios guardados al instante y aviso «Cambios guardados en este dispositivo». Si falta algo, un renglón discreto «Falta completar: …» lleva a cada sección. Una sección «lista» no es solo «Mostrar» prendido: la regla vive en `sectionGaps` (`journey.ts`) y la usan el editor y el Inicio: un momento necesita nombre propio y lugar o dirección; dress code, título o texto; fotos, al menos una; música, al menos un tema. El mensaje final vacío no es pendiente (usa el cierre por defecto).
- Contenido incompleto en la página pública: sin fecha, «Fecha a confirmar» aparece solo en la portada; sin regalos no se muestran «Regalá» ni «Ver lista de regalos» y la lista pública muestra «Esta lista todavía se está armando».

## 7. Invitados, mesas y planillas (`/panel/invitados`)

- **Confirmaciones:** cuatro totales reales (Total de invitados, Confirmados, Rechazados, Sin responder) que además filtran la lista; búsqueda, edición, eliminación y asignación de grupo. Columna «Origen»: «Cargado por ustedes» o «Respondió en el sitio»; un aviso cuenta cuántas personas respondieron desde el sitio y permite verlas.
- **Cargar:** «Agregar invitado» (a mano), «Importar desde Excel» y «Exportar a Excel».
- **Mesas y grupos** (misma pantalla, solapa aparte; no es obligatoria ni bloquea nada): crear, renombrar, eliminar, asignar y mover con un selector; primero aparecen las personas sin lugar y cada mesa muestra cuántas personas tiene. Sin límites de capacidad.
- **Exportar a Excel** (.xlsx, con grupo y origen). **Importar** .xlsx o .csv con las columnas Nombre, Apellido, Asistencia y Restricción alimentaria; hay un modelo descargable y, antes de confirmar, una vista previa de lo que se va a importar (primeras filas), las filas con error con su motivo y los duplicados nombrados (ya estaban en la lista o están repetidos en la planilla: se saltean y **nunca se pisan** datos existentes). Nada cambia hasta tocar «Importar».
- Eliminar un invitado y importar una planilla no piden confirmación: se pueden deshacer desde el aviso.
- Las respuestas del formulario público se suman solas a la lista (sin duplicar al enviar dos veces).

## 8. Vista previa y publicación

- `/panel/vista-previa`: la página pública real, con alternancia Invitación / Lista de regalos y Celular / Compu, y vuelta directa al editor. Sin banners de estado: el subtítulo dice «Todavía no está publicada» y el botón de la cabecera no se repite en esa pantalla.
- «Publicar mi casamiento» abre el diálogo de planes y, al elegir uno, un **resumen de publicación** (`publishSummary` en `src/lib/weda/publish.ts`): qué se publica con ese plan, qué está incluido pero vacío y qué queda como borrador (con el plan que lo habilita), más avisos sin bloqueo (falta el cobro, falta la fecha). Cambiar de plan no borra nada. «Pagar y publicar» está **deshabilitado y rotulado «sin conexión»**: no simula contratación, pago ni publicación.
- Pendiente (necesita backend): borrador privado, vista previa compartible protegida, versión pública con URL estable, verificación real del pago antes de publicar y «publicar cambios» explícito.

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
