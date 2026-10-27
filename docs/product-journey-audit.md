# Weda · Auditoría de recorridos de producto (2026-10-23)

Documento **histórico y con fecha**. Mapa del embudo real (leído del código y recorrido en un navegador), diagnóstico de fricciones y qué se cambió. Oportunidades y experimentos: [conversion-opportunities.md](conversion-opportunities.md). Escenarios, cobertura y resultados de las pruebas: [e2e-coverage.md](e2e-coverage.md).

**Cómo leer las etiquetas de evidencia** (no se mezclan):

| Etiqueta | Significa |
|---|---|
| **[C]** | Hecho comprobado en el código o en el navegador. |
| **[R]** | Problema reproducido por una prueba automática (se nombra la prueba). |
| **[H-u]** | Hipótesis sobre el comportamiento de las personas. No está demostrada. |
| **[H-n]** | Hipótesis de impacto comercial. No está demostrada y no lleva números inventados. |

La falta de servidor no es tema de este documento: se evalúa el recorrido como si cada paso existiera para quien lo usa.

## 1. Propuesta de valor tal como la comunica el producto hoy

- Titular de la landing: «Tu casamiento empieza antes del gran día.» Bajada: crear el sitio del casamiento, armar la lista de regalos y organizar las confirmaciones **[C]**.
- Tres piezas que se muestran juntas: **lista de regalos simbólicos**, **sitio del casamiento** y **confirmación de asistencia**; invitados y mesas aparecen como gestión que «no se publica» **[C]**.
- Promesa comercial: «Armá tu casamiento gratis. Publicalo cuando estés listo.» y tres planes acumulativos (Regalos, Celebración, Celebración Plus) con el precio en el diálogo de publicar **[C]**.
- Modelo implícito: se construye gratis, **se paga al publicar**, el plan define qué ve el invitado y lo que queda afuera se conserva como borrador **[C]** (`plans.ts`, `publish.ts`).

## 2. Embudo reconstruido

Rutas reales: `/` → `/crear/cuenta` → `/crear` → `/crear/fecha` → `/crear/foto` → `/panel` (Inicio) → `/panel/regalos`, `/panel/sitio`, `/panel/invitados` (+ `?vista=mesas`), `/panel/vista-previa`, diálogo «Publicar» → `/sitio/$slug`. Alternativas de entrada: `/ejemplo`, `/ejemplo/regalos`, `/encontrar` (invitados que buscan una lista). No hay orden obligatorio dentro del panel **[C]**.

| # | Etapa | Objetivo y pregunta | Acción principal | Qué necesita para decidir | Fricción o duda que introduce la interfaz | Para avanzar | Errores y recuperación | Próximo paso | Posible efecto |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Landing | «¿Qué es y es para mí?» | «Crear mi evento» (7 enlaces con 3 textos —«Crear mi evento», «Crear mi lista de regalos», «Empezar gratis»— al mismo destino) | Qué hace, cuánto cuesta, cómo se ve | Una sola promesa y un solo destino: consistente. Precios recién en el diálogo de publicar. Testimonios con nombres y fotos inventados (ver J8). | Un clic | — | Registro | Entrada al embudo |
| 2 | Propuesta de valor | «¿Resuelve mi problema?» | Leer; mirar las tres demos | Relación sitio ↔ regalos ↔ invitados | La lista de regalos tiene su propio bloque con foto; la confirmación de asistencia aparece solo en una demo y el pie | — | — | Ejemplo o CTA | Comprensión |
| 3 | Ejemplo | «¿Cómo quedaría el mío?» | «Ver ejemplo» → `/ejemplo` | Que se parezca a su casamiento | **Callejón sin CTA**: en el ejemplo solo hay «Volver a Weda» y el logo del pie (J6) | Volver a la landing | — | Landing otra vez | Fuga de intención |
| 4 | CTA | «¿Qué pasa si hago clic?» | Clic | Que sea gratis y sin tarjeta | No se dice «sin tarjeta» antes del registro; sí «gratis» en el botón de los planes | Un clic | — | `/crear/cuenta` | Paso 1 del embudo |
| 5 | Registro | «¿Por qué me piden una cuenta ya?» | Correo + clave, o Google/Apple | Para qué sirve la cuenta | **Pared de cuenta antes del primer valor** (J5): correo, clave de 8+ con mayúscula, minúscula y número | Correo válido y clave fuerte (o Google/Apple) | Errores en línea; foco al primer campo inválido **[R]** | `/crear` | Abandono potencial **[H-n]** |
| 6 | Onboarding 1 | «¿Qué me piden?» | Nombres (apellidos opcionales) | Nada más | Pocas decisiones; «Lo demás lo completás después» | 2 nombres válidos (solo letras, 2–40) | Mensajes por campo **[R]** | `/crear/fecha` | Primer dato propio |
| 7 | Onboarding 2 | «Todavía no tenemos fecha ni lugar» | Fecha y lugar | — | **Antes**: dos errores al continuar vacío y dos interruptores que activar (J1) | Ahora: nada obligatorio | Fecha pasada o inexistente se explica **[R]** | `/crear/foto` | Menos fricción en el paso más común de «aún no sé» |
| 8 | Onboarding 3 | «No tengo foto a mano» | Subir foto u «Omitir por ahora» | Por qué importa la foto | Opcional y explicado | Nada | Archivo inválido se explica (suite existente) | `/panel` | Primer valor visual |
| 9 | Primer ingreso al panel | «¿Y ahora?» | «Siguiente paso» único | Qué sigue | Una acción primaria clara; tarjetas «Lo que vas a publicar» y «Gestión de invitados» | Nada | — | Regalos | Activación |
| 10 | Primer valor | «Quiero ver mi casamiento» | Vista previa | Verlo con sus nombres y su foto | La portada con sus nombres aparece en la tarjeta del Inicio; la **página pública** requiere abrir «Vista previa» (J10) | Un clic | — | Editar | Activación **[H-u]** |
| 11 | Configurar el sitio | «Pongo horarios y lugares» | Editor por secciones + ventana en vivo | Qué es obligatorio | Cada sección dice su estado; prender «Mostrar» no basta (`sectionGaps`) **[C]** | — | Cambios guardados al instante | Vista previa | Retención |
| 12 | Portada y contenidos | «Cambio el texto y la foto» | Campos con vista previa sincronizada | — | Sincronía comprobada **[R]** | — | Deshacer en bajas | — | — |
| 13 | Regalos | «Elijo regalos» | Packs, catálogo, regalo propio | Cuánto y cómo cobran | Cobro opcional y no bloquea **[C]** | Ninguna | Deshacer al quitar **[R]** | Cobro, vista previa | Valor central |
| 14 | Invitados y confirmaciones | «Cargo mi lista» | Alta, importación, filtros | Qué columnas | Importar con errores explica cada fila y no cambia nada hasta confirmar **[R]** | — | Deshacer al eliminar **[R]** | Mesas | Gestión, no publicación |
| 15 | Mesas | «Armo la distribución» | Crear mesa, asignar | Cuántos lugares | Eliminar una mesa no borra personas **[R]** | — | — | — | Retención |
| 16 | Vista previa | «¿Está lista para compartir?» | Pop-up del encabezado o página `/panel/vista-previa` | — | **Dos superficies con el mismo nombre** (J7) | — | — | Publicar | Confianza |
| 17 | Revisar lo pendiente | «¿Qué me falta?» | «Publicar» → elegir plan → «Antes de publicar» | Qué falta y dónde resolverlo | **Los pendientes solo aparecen después de elegir un plan** (J9) | — | Cada pendiente tiene acceso directo; el de la fecha ahora abre los datos (J2) **[R]** | Pagar | Intención de publicar |
| 18 | Intención de publicar | «¿Vale lo que cuesta?» | Elegir producto | Qué incluye, precio, duración | La interfaz afirma «pago único» y «publicada 1 año», que `ux-flows.md` dice que no están definidos (J4) | Elegir plan | Volver sin cobrar **[R]** | Resumen y pago de prueba | Conversión |
| 19 | Después de la intención | «¿Quedó publicada?» | Pago de prueba → link → «Publicada» | Link, vigencia | Gestión: mejorar pagando la diferencia, bajar la página y volver a publicar **[R]** (suite existente) | — | Confirmación para bajar | Compartir el link | Cierre |

## 3. Hallazgos

Severidad: crítica / alta / media / baja. **Confianza** = qué tan sólida es la evidencia, no la probabilidad de que importe. **Estado:** ✔ implementado · ○ pendiente · ? decisión tuya.

| ID | Hallazgo | Evidencia | Perfiles | Sev. | Conf. | Solución | Esf. | Cómo verificarla | Estado |
|---|---|---|---|---|---|---|---|---|---|
| J1 | Continuar sin fecha ni lugar exigía activar dos interruptores o tapar dos errores. | **[R]** `e2e/desktop/journeys.spec.ts` «landing → registro → …» (antes: sonda con dos errores al continuar vacío). Mismo patrón en `CoupleDialog`. | A, C, J | Media | Alta | Vacío = «todavía no»; sin interruptores; una fecha escrita sigue validándose | S | Prueba citada; métrica: paso 2→3 del onboarding | ✔ |
| J2 | El pendiente «Definí la fecha» llevaba a «Ir al inicio» sin abrir nada, y desde ahí había que encontrar «Editar datos». | **[C]** `publish.ts`; **[R]** «sin fecha ni lugar…» | C, F, J | Media | Alta | El acceso abre «Datos del casamiento»; con la fecha vacía ya no hay interruptor previo | S | Prueba citada | ✔ (la prueba descubrió un error propio: el diálogo no abría si ya se estaba en el Inicio; corregido con un efecto sobre el parámetro) |
| J3 | Se puede pagar y publicar una página totalmente vacía (sin regalos, sin eventos, sin fecha). La lista de pendientes dice «hoy ninguna impide publicar». | **[C]** sonda: «Incluida en tu plan, pero todavía sin contenido» y botón «Pagar» activo | J, A | Media | Alta | Decisión comercial: ¿bloquear, advertir más fuerte o dejar libre? | S–M | Experimento: variante con confirmación explícita | ? |
| J4 | El diálogo promete «pago único» y «publicada 1 año»; `ux-flows.md` §3 y §10 dicen que no están definidos. | **[C]** `publish-dialog.tsx` y docs | D, J | Alta (confianza) | Alta | Confirmar la regla comercial y alinear docs o interfaz. No inventar. | S | Revisión del dueño | ? |
| J5 | Pared de cuenta antes de ver algo propio: cuenta con clave fuerte → 3 pantallas → recién entonces el panel. | **[C]** rutas y `crear.cuenta.tsx` | A, B, D | Alta | Media | Alternativa a evaluar: nombres y portada primero, cuenta al guardar/publicar. Cambia el modelo: no implementado. | L | Experimento A/B con tasa de paso 1→panel | ? |
| J6 | `/ejemplo` y `/ejemplo/regalos` no tienen forma de empezar el propio sin volver a la landing. | **[C]** `site-shell.tsx`; **[R]** «desde el ejemplo…» | B, D | Media | Alta | Enlace «Empezar gratis» en el pie del ejemplo (solo en la demo, no en los sitios de parejas ni en la vista previa) | S | Prueba citada; métrica: clics ejemplo → registro | ✔ |
| J7 | «Vista previa» es un pop-up en el encabezado y también una página completa (`/panel/vista-previa`) a la que lleva el último «Siguiente paso»; la página repite «Publicar». | **[C]** `panel.index.tsx`, `journey.ts`, `panel.vista-previa.tsx` | F | Baja–media | Media | Unificar en una sola superficie | M | Prueba de tareas con personas | ? (I6 de `ui-audit.md`) |
| J8 | «Lo que dicen las parejas» muestra testimonios con nombres y fotos inventados («Parejas ficticias de la demo» en el código). | **[C]** `routes/index.tsx` líneas 57–63 | D | Alta (confianza) | Alta | Etiquetar como ejemplo o reemplazar por testimonios reales con permiso. Contenido de la dueña: no se tocó. | S | Revisión del dueño | ? |
| J9 | Qué falta para publicar solo se ve dentro del diálogo y después de elegir un plan; el Inicio no muestra pendientes. | **[C]** `publish.ts` depende del plan | J, F | Media | Media | Mostrar los pendientes comunes antes de elegir plan | M | Métrica: abandono del diálogo en el paso «elegir» | ○ |
| J10 | Primer momento atractivo (su página con sus nombres) está a un clic, pero el siguiente paso recomendado del Inicio es «Armá tu lista de regalos». | **[C]** `nextAction()`; **[H-u]** para el impacto | A, B | Media | Baja | Hipótesis a validar: ofrecer «Mirá tu página» como primer paso | S | Experimento: orden del primer paso vs. activación | ○ |
| J11 | `preferredPlan` nunca se carga desde la landing (todos los CTA van a `/crear/cuenta` sin parámetro); el concepto está definido y no se usa. | **[C]** `grep preferredPlan` | D | Baja | Alta | Decidir si los CTA de cada plan deben llegar con el plan elegido | S | — | ? |

## 4. Perfiles que comparten problemas

- **A, C y J**: sufrieron J1 (decisiones sobre lo que todavía no tienen) y J3/J9 (no saben qué falta hasta el último diálogo).
- **B y D**: J6 (el ejemplo no ofrece el siguiente paso), J8 (confianza) y J4 (qué se compra).
- **F y H**: J7 y J9 (orientación). La persistencia local resuelve el regreso en el mismo dispositivo **[R]**.

## 5. Qué se cambió y qué lo respalda

| Cambio | Archivos | Prueba |
|---|---|---|
| Fecha y lugar opcionales en el alta y en «Datos del casamiento» (sin interruptores) | `crear.fecha.tsx`, `couple-form.tsx` | `desktop/journeys.spec.ts` (alta apurada, fecha pasada, cambia de idea) |
| El pendiente de la fecha abre los datos | `publish.ts`, `panel.index.tsx` | «sin fecha ni lugar…» |
| CTA «Empezar gratis» en el pie del ejemplo | `site-shell.tsx`, `invitacion.css` | «desde el ejemplo…» |

Cada cambio de flujo se hizo con la prueba escrita primero o a la par y se repitió la suite afectada. Detalle en [e2e-coverage.md](e2e-coverage.md).

## 6. Hallazgos de las pruebas exploratorias (secuencias de acciones)

Las secuencias aleatorias con semilla (`e2e/explore/action-fuzz.spec.ts`) encontraron un defecto que ninguna prueba dirigida había visto, y tres falsas alarmas. Detalle de método y números en [e2e-coverage.md](e2e-coverage.md).

| ID | Hallazgo | Clasificación | Evidencia | Estado |
|---|---|---|---|---|
| D1 | **El botón «Deshacer» de un aviso quedaba fuera de la pantalla** cuando el nombre del regalo o del invitado era una sola palabra larga (por ejemplo 50 letras sin espacios): el texto no se partía y empujaba la acción. En celular de 390 px el botón terminaba en x = 485 (pantalla de 390); a 1280 px salía del propio aviso. Sin el botón a la vista no se puede deshacer. | **Defecto del producto confirmado** | **[R]** `e2e/toast-long-names.spec.ts` (6 pruebas: regalo e invitado × 320, 390 y 1280 px). Fallaban las 6 antes de la corrección. La secuencia exploratoria lo había registrado como «timeout», y el mensaje completo («element is outside of the viewport») más una medición de coordenadas mostraron la causa. | ✔ corregido en `panel.css` (`.pn-toast > span { min-width: 0; overflow-wrap: anywhere }`) |
| D2 | Tres «formularios rechazados sin explicar por qué» (invitados y mesas) en la corrida larga. | **Falla de la prueba (medida), no del producto** | Se repitieron las secuencias aisladas y no reproducían. Se midió la latencia: tras un alta aceptada el diálogo tarda ~520 ms en cerrarse y tras un rechazo el error aparece a los ~265 ms (mediana, con la máquina en reposo), contra la espera fija de 250 ms de la prueba. Sobre 80 envíos (40 en reposo y 40 con la CPU saturada) **ningún diálogo quedó abierto sin error más de 5 s**. | ✔ la prueba espera ahora una condición observable (el diálogo se cierra o aparece un error, hasta 3 s) |
| D3 | Dos «fallos» al crear una mesa. | **Falla de la prueba** | La prueba contaba mesas guardadas; con la lista vacía la pantalla muestra «Mesa 1» de ejemplo y la guarda junto con la primera mesa nueva. Además, para las mesas «1234» o «😀» son nombres válidos (2–40 caracteres). | ✔ el oráculo compara identificadores, no cantidades |
| D4 | Un «timeout» al hacer «atrás» en la primera pantalla del panel. | **Falla de la prueba** | «Atrás» vuelve a la página desde la cual la prueba cargó el estado; el menú del panel no existe ahí. Es el comportamiento normal del navegador. | ✔ la prueba vuelve «adelante» |

**Lección de método:** el primer informe clasificó D1 como «error de la prueba» por ser un timeout. Un timeout puede esconder un defecto del producto: antes de descartarlo hay que leer el mensaje completo y medir.
