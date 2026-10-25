# Weda · Oportunidades de conversión, hipótesis y experimentos (2026-10-23)

Complementa [product-journey-audit.md](product-journey-audit.md). Todo lo que sigue son **hipótesis**: ninguna se midió con personas reales, y no hay analytics. No se asignan porcentajes de mejora ni probabilidades de abandono porque no hay datos que los sustenten.

## 1. Hito de activación: qué evento representa mejor el primer valor

| Candidato | A favor | En contra | Trabajo que exige hoy |
|---|---|---|---|
| Crear el evento (terminar el alta) | Fácil de medir; es el primer dato propio | Es un hito técnico: la pareja todavía no vio nada que quiera compartir | Cuenta + 3 pantallas |
| Ver su portada personalizada | La emoción de «es nuestro» ocurre al ver nombres y foto juntos | Con foto de muestra y sin fecha puede parecer genérica | Alta completa + un clic en «Vista previa» (la tarjeta del Inicio ya muestra nombres y foto) |
| Primeros regalos en la lista | Es el corazón de la propuesta y lo que más se muestra en la landing | Puede hacerse sin haber visto la página | Elegir un pack = un clic |
| Completar el sitio | Mide esfuerzo real invertido | Demora demasiado; es un buen indicador de retención, no de activación | Varias secciones |
| Vista previa que consideran compartible | Combina valor percibido e intención | Subjetivo: requiere un proxy | Alta + regalos + eventos |

**Hipótesis de activación propuesta [H-n]:** *una pareja está activada cuando, en una misma visita, abre «Vista previa» después de haber agregado al menos un regalo* (su sitio con sus nombres y su lista a la vista). Argumento: junta las dos promesas centrales (sitio y regalos), ocurre sin pagar ni completar todo, y es verificable con el producto actual. No se eligió «crear el evento» porque no distingue a quien vio valor de quien solo completó un formulario.

**Qué retrasa llegar:** la cuenta con clave fuerte antes de ver nada (J5); el primer paso recomendado es regalos y no «mirá tu página» (J10); fecha y lugar exigidos o con interruptores (J1, ya corregido).

## 2. Oportunidades

Cada una indica la métrica que debería moverse y qué evidencia permitiría saber si funcionó.

| # | Oportunidad | Hipótesis | Métrica principal | Evidencia de éxito | Riesgo | Esf. |
|---|---|---|---|---|---|---|
| O1 | Fecha y lugar opcionales sin interruptores (**implementado**) | Menos decisiones sobre datos que aún no tienen aumenta el paso 2→3 del alta | Tasa de paso 2 → 3; tiempo en la pantalla | Mejora sostenida frente a la semana previa o a una cohorte comparable | Ninguno funcional: la fecha escrita sigue validándose | S |
| O2 | CTA al crear el propio desde el ejemplo (**implementado**) | Quien explora el ejemplo con interés necesita un siguiente paso en esa misma pantalla | Clics ejemplo → `/crear/cuenta` ÷ visitas al ejemplo | Que el CTA concentre una parte relevante de los registros que pasan por el ejemplo | Mezclar identidades: se resolvió con un enlace de texto en el pie, sin tocar el contenido | S |
| O3 | Mostrar lo que falta antes de elegir plan | Ver «qué me falta» antes de comprometerse a un plan baja el abandono del paso «elegir» | Abandono del diálogo en la elección; porcentaje de páginas publicadas con regalos y fecha | Más publicaciones con contenido completo | Percibirlo como bloqueo: debe seguir siendo informativo | M |
| O4 | Primer paso «Mirá tu página» (J10) | Ver su página propia antes de elegir regalos acelera el primer valor | Proporción de nuevas parejas que abren la vista previa en la primera sesión | Aumento de «vista previa abierta en la primera visita» | Puede mostrar una página aún vacía y decepcionar | S |
| O5 | Alta con la cuenta después del primer valor (J5) | Pedir la cuenta cuando ya hay algo propio aumenta el paso landing → panel | Landing → panel (embudo completo) | Mejora del embudo completo en un test A/B, no del paso aislado | Requiere decidir qué se guarda sin cuenta; cambia el modelo | L |
| O6 | Aclarar qué se compra (J4) | Declarar solo lo que está definido evita sorpresas tardías | Abandono en el paso «revisar y pagar»; consultas sobre duración | Menos abandono tras ver el resumen | Depende de una decisión comercial | S |
| O7 | Confianza en la landing (J8) | Testimonios claramente rotulados o reales sostienen la credibilidad | Tasa de clic en el CTA tras el bloque | — | Contenido de la dueña | S |
| O8 | Evitar pagar una página vacía (J3) | Una confirmación o una condición mínima reduce arrepentimientos | Pedidos de baja o consultas tras publicar | Menos publicaciones sin contenido | Decisión comercial | S–M |
| O9 | Unificar «Vista previa» (J7) | Una sola superficie baja la confusión panel vs. sitio | Tareas de «encontrar la vista previa» con personas | Éxito en prueba de usabilidad | Reorganiza la navegación | M |

## 3. Esquema mínimo de eventos de producto (no implementado)

No se agregó ninguna dependencia ni se implementó seguimiento. Propuesta, sin datos personales (nada de nombres, correos, fotos ni textos; solo identificador anónimo de sesión y fecha/hora):

| Evento | Se dispara cuando | Propiedades |
|---|---|---|
| `landing_cta_click` | clic en un CTA de la landing | `ubicacion` (hero, features, plan_regalos…), `destino` |
| `ejemplo_visto` / `ejemplo_cta_click` | se abre el ejemplo / se usa su CTA | `pagina` (invitacion, regalos) |
| `registro_iniciado` / `registro_completo` | se envía el formulario de cuenta | `metodo` (correo, google, apple) |
| `alta_paso_completo` | se termina cada pantalla del alta | `paso` (nombres, fecha, foto), `omitido` (sí/no) |
| `panel_primera_vista` | primera carga del Inicio | — |
| `regalos_agregados` | se agrega un pack o un regalo | `cantidad`, `origen` (pack, catalogo, propio) |
| `vista_previa_abierta` | se abre la vista previa | `origen` (encabezado, inicio, regalos, editor) |
| `seccion_completa` | una sección del sitio pasa a estar completa | `seccion` |
| `invitados_cargados` | alta manual o importación | `cantidad`, `origen` |
| `publicar_abierto` / `plan_elegido` / `pendientes_vistos` | se abre el diálogo / se elige un producto / se muestra la lista | `plan`, `cantidad_pendientes` |
| `pago_iniciado` / `pago_completo` / `publicacion_baja` | pasos de pago y gestión | `plan`, `tipo` (publicar, mejorar) |

Con eso se puede armar el embudo: landing → registro → alta → panel → primer regalo → vista previa → publicar abierto → plan elegido → pago.

## 4. Experimentos sugeridos (orden recomendado)

1. **E1 · Primer paso del Inicio** (O4): grupo A «Armá tu lista de regalos» vs. grupo B «Mirá tu página». Métrica: vista previa abierta en la primera sesión y regalos agregados en la primera semana. Criterio de éxito: B no reduce los regalos agregados y sube la vista previa.
2. **E2 · Pendientes antes de elegir plan** (O3): mostrar los dos o tres pendientes más comunes en la elección del producto. Métrica: porcentaje que llega al paso de pago y porcentaje de publicaciones con regalos y fecha.
3. **E3 · Cuenta después del primer valor** (O5): requiere una decisión de producto previa sobre qué se guarda sin cuenta.
4. **E4 · CTA en el ejemplo** (O2): medir contra el registro que llega desde el ejemplo en las semanas previas.

## 5. Decisiones comerciales necesarias (no resueltas aquí)

- **Qué incluye «Pago único» y «Publicada 1 año»**: se muestra en la interfaz y la documentación dice que no está definido (J4).
- **Si se permite pagar una página vacía** (J3).
- **Qué hacer con los testimonios** (J8).
- **Si los CTA de cada plan en la landing deben llegar con ese plan preseleccionado** (J11).
- **Qué se puede hacer sin cuenta** (J5).
