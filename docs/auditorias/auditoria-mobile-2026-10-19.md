# Weda · Auditoría de experiencia mobile (2026-10-19)

**Método.** Inspección del código y recorrido real con Playwright (Chromium, emulación de viewport con táctil: **no se probó en dispositivos físicos**) en 320, 360, 390, 430 px y apaisado 844×390. Los roles pedidos (UX lead, researcher, UI, wedding tech, interacción, growth, accesibilidad, QA, heurísticas, arquitectura) se simularon como **fases de análisis separadas**, no como agentes paralelos. **No hubo sesiones con personas**: lo marcado «Hipótesis» debe validarse con usuarios reales; lo marcado «Observado» se vio en el código o en el navegador.

Caso: Lucía y Violeta, recién registradas, desde un celular de 390 px, sin fecha.

## A. Mapa de flujos actuales

`/crear/cuenta → /crear → /panel` (Inicio, 4 etapas) con navegación inferior de 4 ítems: **Inicio · Regalos · Invitados · Tu página**. «Mesas y grupos» es una solapa dentro de Invitados; «Vista previa» es el botón «Ver como invitado» de la cabecera; «Publicar» abre el diálogo de planes (no cobra ni publica).

- **Regalos**: 4 solapas (Elegí tus regalos · Cómo vas a recibirlos · Revisá tu lista · Recibidos). Resumen de selección en barra inferior → diálogo.
- **Tu página**: en móvil alterna entre *vista previa* y *lista de secciones con formularios* (`view: 'edit' | 'preview'`).
- **Invitados**: alta manual en diálogo, importación .xlsx/.csv con vista previa, exportación, filtros por estado.
- **Vista previa**: iframe de la página pública real + resumen «Qué estás viendo».

Componentes compartidos desktop/móvil: todo el panel (`panel.css` solo cambia con media queries), `PreviewFrame`, `Field`, `Block`, `SelectionSummary`, diálogos Radix. La página pública (`components/site/*`) no se toca.

## B. Fricciones (severidad con su impacto)

P0 = bloquea una tarea central o puede perder datos · P1 = confusión/abandono probable · P2 = claridad/eficiencia · P3 = refinamiento.

| # | Pantalla | Observado | Consecuencia | Sev. | Origen |
|---|---|---|---|---|---|
| 1 | Tu página | En móvil o se ve la página **o** el formulario. Editar «Evento 1» no muestra la página; hay que tocar «Ver cómo queda», perdiendo el lugar | No se ve el resultado de lo que se escribe: el objetivo del editor (diseñar, no llenar formularios) no se cumple | P1 | Observado |
| 2 | Regalos | 4 solapas que miden 651 px en una pantalla de 390: «Revisá tu lista» y «Recibidos» quedan fuera, sin indicio de scroll; al entrar a «Revisá tu lista» la solapa activa no se ve | La persona no sabe en qué paso está ni que existen más | P1 | Observado |
| 3 | Regalos · Revisá tu lista | Lista de filas de ~150 px (las acciones caen en otra línea): ~3 regalos por pantalla, sin ver cómo queda | Recorrer 8+ regalos exige mucho scroll; no hay representación visual integrada | P1 | Observado |
| 4 | Aviso «Deshacer» | El aviso se dibuja encima de los botones de los diálogos («Revisar mi lista», «Ahora no / Elegí un plan», «Cancelar / Importar») | Las acciones principales quedan tapadas ~8 s | P1 | Observado |
| 5 | Aviso «Deshacer» | Sobrevive a la navegación (se vio «Importaste 1 invitado · Deshacer» en la vista previa) y restaura una foto anterior de la lista | Un «Deshacer» tardío puede pisar cambios posteriores: pérdida de datos | P1 | Observado (lectura de código + captura) |
| 6 | Regalos | «Cómo vas a recibirlos» (cobro) está **entre** elegir y revisar y lleva una insignia «Pendiente» | Parece un paso obligatorio antes de revisar | P2 | Observado |
| 7 | Inicio | Cada etapa repite estado (chip), descripción, «Todavía no…», kicker y botón; el CTA de bienvenida («Continuar creando mi casamiento») y «Empezar» del paso 1 hacen lo mismo | ~1.100 px para 4 tareas; el siguiente paso no destaca | P2 | Observado |
| 8 | Tu página | Eventos con 6 campos; «Nota» y «Enlace de Maps» opcionales compiten con lo principal | Formulario largo para un dato de nombre+lugar | P2 | Observado |
| 9 | Regalos / Tu página | Barras fijas apiladas (selección 60 + navegación 60 px) y apaisado 844×390: casi no queda contenido | Poco espacio útil | P2 | Observado |
| 10 | Varios | Objetivos táctiles <44 px: «Deshacer» (36), íconos de ver set (36) | Toques fallidos | P3 | Observado |
| 11 | Vista previa | Dos botones de peso similar arriba (Volver a editar / Publicar) y el resumen «Qué estás viendo» queda tras la página | Se entiende «qué es» solo si se baja | P3 | Hipótesis |

Sin hallazgos P0: no se observó pérdida de datos por navegar entre secciones. Sin overflow horizontal en 320–430 px ni errores de consola en los recorridos.

Hipótesis (a validar con personas): que «Elegí / Revisá / Cobro» en ese orden coincide con cómo piensan el armado de la lista; que la vista de tarjetas alcanza para anticipar la página pública; que la edición con vista previa fija se entiende en una mano.

## C. Problemas que varios roles detectaron

Falta de resultado visible al editar (UX lead, interacción, heurísticas «visibilidad del estado»); navegación por solapas que oculta destinos (UX lead, UI, accesibilidad); avisos que tapan acciones (interacción, accesibilidad, QA); densidad del Inicio (UI, wedding tech, growth).

## D. Decisiones de UX

1. **Lista de regalos: alternativa A + una pizca de B.** Se elige una representación visual *integrada* con los datos reales (tarjetas con foto, monto y nombre en el mismo orden que la página pública) y, aparte, un panel expandible *en la misma pantalla* con la página pública real. Se descarta C (otra pestaña: pierde contexto) y el diálogo con teléfono simulado.
2. **Editor del micrositio: vista previa fija arriba + edición debajo** (pantallas con ≥600 px de alto); la vista previa se lleva a la sección abierta. «Ampliar» la agranda y «Seguir editando» vuelve. Se descarta la hoja inferior: en móvil el teclado la comprime y no hay forma verificable de probarlo acá.
3. **Orden de Regalos: Elegir → Tu lista → Cobro → Recibidos**; el cobro se dice opcional.
4. Los avisos con «Deshacer» se cierran al cambiar de pantalla y suben a la parte superior cuando hay un diálogo abierto.

Sin decisiones que eliminen funciones, cambien reglas del producto o pierdan datos.

## E. Navegación móvil

Se conserva la barra inferior (Inicio · Regalos · Invitados · Tu página): es corta, estable y ya diferencia contexto. Las solapas de Regalos pasan a un selector de ancho completo con etiquetas cortas en pantallas angostas (el título largo vive dentro de cada panel). Una acción principal por contexto: Inicio «Elegí los primeros regalos» (o el siguiente paso real), Regalos «Revisá tu lista», Tu página «Listo» al terminar de editar una sección.

## F. Regalos · G. Micrositio

Ver «Decisiones». Los datos son los de `s.gifts.items` y `s.site`; no se crea ninguna copia de la página pública. Sin foto, la tarjeta usa el ícono de regalo existente.

## H. Plan de implementación

1. Avisos (4, 5). 2. Solapas de Regalos y orden (2, 6). 3. Tu lista visual + vista expandible (3). 4. Editor con vista previa fija (1, 8). 5. Inicio (7). 6. Objetivos táctiles (10). 7. Tests, documentación.

## I. Riesgos de regresión

Desktop (≥1100 px en el editor, ≥1024 en Regalos): todo cambio móvil va dentro de `max-width` o clases `pn-mobile-only`. La vista previa sticky podría chocar con el teclado virtual (no verificable sin dispositivo). Cambiar el orden de solapas toca tests/rutas que dependan del `id`, no del orden.

## J. Estado de la implementación

Resueltos (con su verificación): 1 → flujo e2e 3; 2, 3, 6 → flujo e2e 1 y 2; 4 → flujo e2e 1 (el clic en «Revisar mi lista» llega con el aviso visible); 5 → flujo e2e 5; 7 → Inicio simplificado; 8 → «Más opciones» en eventos; 10 → botones táctiles de 44 px. Sin tocar: 9 (apaisado: la vista previa del editor no queda fija) y 11.

Limitaciones que siguen: no se probó con teclado virtual real ni en dispositivos físicos; la vista previa fija deja menos espacio para los campos en pantallas de ≈568 px de alto; mientras hay un diálogo abierto, Radix oculta los avisos a lectores de pantalla (el aviso sigue visible). A validar con personas: si «Tarjetas» alcanza para anticipar la página, si «Ampliar vista» se descubre y si el orden Elegir → Lista → Cobro coincide con cómo piensan el armado.
