# Weda · Flujos de usuario (lo que hoy existe en el código)

Describe los recorridos **implementados** en el frontend sin backend. No describe objetivos futuros. Criterios de decisión: [product-principles.md](product-principles.md). Detalle técnico y rutas: [panel-frontend.md](panel-frontend.md). Estilos y componentes: [design-system.md](design-system.md).

## 1. Mapa de rutas

| Ruta | Función |
|---|---|
| `/` | Landing. Los botones «Crear mi evento», «Crear mi lista de regalos» y «Elegir plan» llevan a `/crear` (el último con el plan sugerido). |
| `/ejemplo`, `/ejemplo/regalos` | Casamiento de demostración (invitación y lista de regalos). |
| `/encontrar` | Buscador de invitados ([encontrar-tu-casamiento.md](encontrar-tu-casamiento.md)). |
| `/crear/cuenta` | Paso 1 de 3: registro o ingreso con correo y clave, o con Google / Apple. Es solo la interfaz: sin backend no se crea ninguna cuenta ni se guarda el correo o la clave (la pantalla no lo anuncia). Encabezado «¡Bienvenidos!», línea de términos y privacidad (sin páginas todavía: es texto, no enlaces) y «¿Ya sos miembro? Ingresá». Cualquier salida válida lleva a `/crear` conservando `?plan`. |
| `/crear` | Paso 2 de 3 (sin indicador): nombres y fecha (opcional). |
| `/crear/plan` | Paso 3 de 3: elegir plan. Sin pago. |
| `/panel` | Inicio: avance y pasos. |
| `/panel/regalos` | Lista de regalos. |
| `/panel/invitados` | Invitados y, en la misma pantalla, Mesas y grupos (`?vista=mesas`). `/panel/mesas` redirige. |
| `/panel/sitio` | Tu página web. |
| `/panel/vista-previa` | Ver como invitado. |
| `/sitio/$slug`, `/sitio/$slug/regalos` | Página pública simulada de la pareja. Solo existe en el navegador de quien la creó. |

## 2. Crear el evento y elegir plan

0. `/crear/cuenta` (supuesto documentado: sin backend no hay cuentas reales; Google y Apple no autentican). Los botones de la landing y del menú llevan acá primero.
1. `/crear`: pantalla centrada y sin encabezado (solo una «X» que vuelve al inicio): tu nombre, el nombre de tu pareja y la fecha, con el interruptor «Todavía no tenemos fecha» (se puede avanzar sin fecha). Ya no pide la foto de portada: queda la imagen de muestra (rosas, oscurecida para que se lean nombres y fecha) y la pareja la cambia después desde el panel (`CoupleDialog`/`PhotoPicker`). Tampoco hay vista previa de la portada ni aviso de demostración en este paso. «Probar con Tomás y Martina» carga un caso completo.
2. `/crear/plan`: tres planes (Regalos, Completo, Premium) con el mensaje «Probá Weda gratis, sin tarjeta. Pagás únicamente cuando publiques tu sitio.». No hay checkout ni precios.
3. Entra a `/panel`. Sin evento el panel redirige a `/crear`; sin plan, a `/crear/plan`. El plan se puede cambiar después sin perder datos.

## 3. Planes (fuente: `src/lib/weda/plans.ts`)

| Función | Regalos | Completo | Premium |
|---|---|---|---|
| Lista de regalos | sí | sí | sí |
| Tu página web (secciones estándar) | no | sí | sí |
| Confirmación de asistencia | no | sí | sí |
| Invitados y mesas/grupos | no | sí | sí |
| Música de la fiesta (solo configuración y vista previa; sin conexión real a Spotify) | no | no | sí |

Una función fuera del plan muestra qué es y en qué plan está (`Locked`), sin bloquear el resto de la navegación. En el menú, lo que el plan no incluye lleva un candado (con texto para lectores de pantalla) y se explica al entrar.

## 4. Inicio (`/panel`)

- Aviso corto y ocultable con tres ideas (orden libre, ver el resultado cuando quieras, se guarda solo en el dispositivo).
- Barra de avance con pasos según el plan. Cada paso tiene estado **Sin empezar / En progreso / Completo**, calculado desde los datos reales (`tasks()` en `src/lib/weda/logic.ts`): datos del casamiento (completo con fecha), lista de regalos (completa con regalos y alias), tu página web (completa con un evento con nombre y dirección), invitados (completo con al menos uno), mesas y grupos (opcional; completo cuando todos tienen lugar).
- Se marca el paso recomendado y cada paso lleva al lugar donde se resuelve. «Datos del casamiento» abre un diálogo de nombres, fecha y foto.
- «Ver como invitado» y «Cambiar de plan» están a un clic; «Reiniciar la demo» pide confirmación.

## 5. Lista de regalos (`/panel/regalos`)

- **Mi lista:** regalos con foto, monto y categoría; editar, quitar (con «Deshacer») y ordenar arrastrando. Estado vacío con acciones para empezar.
- **Agregar regalos:** sets con foto (tocar agrega o quita todo el set; el ícono de lista abre una ventana para elegir de a uno), catálogo con búsqueda y categoría, y «Crear un regalo propio» (imagen, monto, nombre y categoría opcional; sin descripción).
- **Recibidos:** tablero (regalos, total, personas, último regalo) y lista con quién, cuándo, medio y mensaje. Es local: se registra cuando se regala desde la vista de invitado.
- **Cobro:** alias bancario (se guarda solo) con vista de cómo lo ven los invitados; Mercado Pago figura como «Próximamente»; preferencia de mostrar la opción de tarjeta. No se mueve dinero.
- Todo lo que se cambia aparece en la página pública (`/sitio/$slug/regalos`) porque usa el mismo estado.

## 6. Tu página web (`/panel/sitio`)

- Una lista de secciones: Portada, Evento 1, 2 y 3 (opcionales, con nombre que elige la pareja; sin nombre se llaman «Evento 1/2/3»), Confirmación de asistencia, Dress code, Fotos, Mensaje final y Música (Premium). Cada una muestra su estado y tiene «Mostrar». Ocultar no borra lo cargado. Solo hay una sección abierta a la vez.
- Portada: foto, nombres, fecha y «texto sobre los nombres» (puede quedar vacío).
- Confirmación de asistencia: solo mostrar u ocultar.
- La vista previa es la página pública real, en formato celular, a la derecha en pantallas anchas; al abrir una sección se desplaza hasta ella. Hay «Ver como invitado en otra pestaña». En pantallas angostas se alterna con «Ver como invitado».
- Cambios guardados al instante y aviso «Cambios guardados en este dispositivo». Si falta algo (fecha, un evento sin completar, dress code sin título), un renglón discreto «Falta completar: …» lleva a cada sección.
- Contenido incompleto en la página pública: sin fecha, «Fecha a confirmar» aparece solo en la portada; sin regalos no se muestran «Regalá» ni «Ver lista de regalos» y la lista pública muestra «Esta lista todavía se está armando».

## 7. Invitados, mesas y planillas (`/panel/invitados`)

- Lista con filtros por asistencia con cantidades (Todos, Confirmaron, Sin responder, No asisten), búsqueda, edición, eliminación y asignación de grupo. Columna «Origen»: «Cargado por ustedes» o «Respondió en el sitio».
- Mesas y grupos (misma pantalla): crear, renombrar, eliminar, asignar y mover con un selector; primero aparecen las personas sin lugar. Sin límites de capacidad.
- **Exportar a Excel** (.xlsx, con grupo y origen). **Importar** .xlsx o .csv con las columnas Nombre, Apellido, Asistencia y Restricción alimentaria; hay un modelo descargable y una vista previa con duplicados y filas con error antes de confirmar.
- Eliminar un invitado y importar una planilla no piden confirmación: se pueden deshacer desde el aviso.
- Las respuestas del formulario público se suman solas a la lista (sin duplicar al enviar dos veces).

## 8. Vista previa y publicación

- `/panel/vista-previa`: la página pública real, con alternancia Invitación / Lista de regalos y Celular / Compu, y vuelta directa al editor. Sin banners de estado: el subtítulo dice «Todavía no está publicada» y el botón de la cabecera no se repite en esa pantalla.
- «Publicar» abre un aviso que dice que todavía no se puede publicar ni cobrar. No simula contratación, pago ni publicación.

## 9. Persistencia y comportamiento sin backend

- Estado único en `localStorage` (`weda-app`). Sobrevive a recargas; datos ausentes, corruptos o de versiones anteriores se leen sin romper. Las fotos se reducen y se guardan en el navegador (~5 MB; si se llena, el panel avisa).
- La vista previa (iframe) se sincroniza por el evento `storage`.
- No hay cuentas, correos, pagos, publicación real ni sincronización entre dispositivos.

## 10. Vacíos y supuestos (a confirmar con la autora antes de tratarlos como reglas)

- **Precios, comisiones, plazos y condiciones de publicación:** no definidos. La interfaz dice que el precio se informa al publicar.
- **Qué es «Premium»:** la landing dice «todo lo del plan Completo + sitio de casamiento premium»; el único contenido premium implementado es la música. Es un supuesto documentado.
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
