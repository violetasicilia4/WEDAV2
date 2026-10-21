# Weda · Revisión de arquitectura de UX (2026-10-21)

Pregunta guía: «si diseñara esto hoy desde cero, ¿lo resolvería igual?». Método: lectura del código y de `docs/`, recorrido en el navegador integrado (escritorio y celular táctil), el detector de Impeccable sobre `src/routes` y `src/components` (solo avisó de muchos guiones largos en comentarios de `ui.tsx`, sin hallazgos de diseño), la auditoría de Hallmark de la misma jornada (`docs/auditoria-hallmark-2026-10-21.md`) y la guía de producto de `docs/product-principles.md`. Hallmark `study`/`redesign` no se aplicaron como flujo: su modo multipágina impone un `design.md` y un tema nuevos, y pide confirmar antes de reemplazar rutas, lo que choca con la identidad y la tipografía que se pidió conservar. Se usó su criterio de auditoría y de jerarquía.

## Mapa del producto (cómo estaba)
Landing → `/crear` (nombres, cuenta, fecha y lugar, foto) → `/panel` con cuatro accesos (Inicio, Regalos, Tu página, Invitados) más «Vista previa» y «Publicar» arriba. Invitados contiene Mesas y grupos como vista. La invitación pública (`/sitio/…`) alimenta la vista previa, la ventana del editor y el pop-up: es el mismo componente.

## Decisiones cuestionadas, alternativas y veredicto
| Tema | Pregunta | Alternativas evaluadas | Veredicto |
|---|---|---|---|
| Menú: 4 destinos + Publicar | ¿Mesas y Vista previa merecen destino propio? | (1) Más ítems en el menú; (2) fusionar Mesas dentro de Invitados (ya es así); (3) sumar «Vista previa» al menú | **Conservar.** Cuatro destinos corresponden a cómo piensa la pareja (qué regalo, cómo se ve, quién viene). Vista previa es una acción transversal, no un lugar: va en la barra superior en todas las pantallas |
| Inicio como tablero | ¿Tarjetas de accesos duplican el menú? | (1) Checklist con estado; (2) vista previa real incrustada; (3) tarjetas en dos secciones | **Conservar (A).** La autora definió explícitamente este formato (sin números ni estados) el mismo día; el «Siguiente paso» ya orienta. Propuesta futura: miniatura de la invitación real en Inicio |
| Regalos: solapa «Cómo funciona» como entrada | ¿Un tutorial es el mejor primer contacto con una lista que ya existe? | (1) Mantener 5 solapas; (2) estado inteligente de entrada; (3) 4 solapas + aviso del paso faltante + ayuda plegada | **Replantear (D) → implementado (3).** Menos solapas (entran en el celular), entrada directa al contenido, ayuda a un toque |
| Invitados: alta en diálogo | Cargar 80 personas = 80 aperturas de un formulario de 6 campos | (1) Diálogo más corto; (2) tabla editable; (3) campo de alta rápida con Enter y pegado de listas, diálogo completo bajo demanda | **Replantear (D) → implementado (3).** Menor costo, no hay tabla que complicar en el celular, y no se pierde ninguna función |
| Constructor: edición y vista previa | ¿Vista previa simultánea, contexto principal con controles, o secciones con vista persistente? | Hecho en la misma jornada: la ventana es la página real alineada a la sección que se edita | **Conservar el modelo actual (B):** vista persistente + formulario por sección, con ventana lateral desde 1280 px y fija arriba en el celular. Mantiene el control, no duplica la invitación y reutiliza el iframe |
| Vista previa en cuatro lugares (ventana, pop-up, `/panel/vista-previa`, tarjeta de Inicio) | ¿Demasiadas? | Unificar en el pop-up | **Propuesto (C):** `/panel/vista-previa` solo se usa desde el aviso de «Siguiente paso» y el enlace de Invitados; conviene redirigirlos al pop-up. No se tocó: `journey.ts` y los tests de rutas dependen de ella |
| Onboarding de 4 pasos antes de ver nada | ¿Valor rápido? | (1) Foto primero; (2) vista previa en vivo desde el paso 1; (3) mantener | **Conservar por ahora (B):** ya muestra la foto sin textos y no obliga a nada. Propuesto: mostrar la portada real armándose con los nombres a medida que se escriben |
| Diálogos | ¿Cada uno es necesario? | Hojas inferiores en celular ya existen | **Conservar (A)** salvo «Agregar invitado», que pasó a la alta rápida |

## Cambios estructurales implementados
1. **Regalos** (`src/routes/panel.regalos.tsx`, `src/panel.css`): cuatro solapas sin numerar y entrada directa a «Mis regalos»; la guía se convirtió en aviso del paso faltante y desplegable. Se borró el CSS de la guía anterior.
2. **Invitados** (`src/routes/panel.invitados.tsx`, `src/panel.css`): alta rápida (`QuickAdd`) con Enter, foco que se conserva, pegado de listas, validación y «Deshacer». «Agregar invitado» del encabezado lleva el foco al campo.
3. Antes en la jornada: «Publicar» en la barra superior y el menú, Inicio en dos secciones, ventana en vivo de la página real, arreglos de desborde y toque (ver auditoría).
4. Pruebas e2e: selectores de las solapas de Regalos y del alta de invitados actualizados (los specs seguían apuntando a textos de versiones anteriores; no se pudieron ejecutar).

## Conservado y por qué
Inicio (decisión explícita de la autora), menú de cuatro destinos, el modelo editor+ventana, la página pública y su tipografía, las reglas de los regalos y los planes, el diálogo de publicar con tres tarjetas.

## Propuestas (no implementadas)
- Miniatura de la invitación real en Inicio (iframe `?ventana`) y portada que se arma durante el alta.
- Unificar `/panel/vista-previa` con el pop-up.
- Selección múltiple en Invitados (asignar grupo o mesa a varios) y edición en línea del grupo.
- Parcial dependiente de infraestructura futura: confirmaciones reales, avisos por correo, publicación y cobro.

## Verificación
`tsc` sin errores, 95 de 95 tests de unidad, build correcto. Navegador integrado: alta rápida (Enter, error de apellido faltante, pegado de 4 líneas con una inválida, foco conservado, deshacer), Regalos con y sin alias (aviso visible/oculto), cuatro solapas sin scroll a 375 px, sin desborde a 320 y 375 px. Playwright: no ejecutable (sin navegador instalado). Tipografía: sin cambios en el diff (ver informe).
