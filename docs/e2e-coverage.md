# Weda · Cobertura de pruebas E2E y resultados (2026-10-23)

Documento **histórico y con fecha**. Dice qué demuestra cada prueba, qué **no** demuestra, qué se ejecutó sobre el estado final del código y qué quedó pendiente. Complementa [product-journey-audit.md](product-journey-audit.md) (hallazgos) y [conversion-opportunities.md](conversion-opportunities.md) (hipótesis).

**Regla de lectura:** una funcionalidad figura como cubierta solo si hay una prueba que ejerce ese comportamiento y comprueba su resultado. La matriz de estados sintéticos (§4) **no** prueba interacciones: carga estados y mira pantallas.

## 1. Cómo se ejecuta

| Qué | Comando | Notas |
|---|---|---|
| Unitarias | `npx vitest run` | `src/test/*.test.ts(x)` |
| E2E de celular y de escritorio | `npm run test:e2e` | Dos proyectos: `mobile` (390 px, táctil) y `desktop` (1280 × 800). Servidor de desarrollo en el puerto 8080. Con Chrome del sistema: `CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` (el entorno no tenía los navegadores de Playwright). |
| Exploratorias con semilla | `npm run test:explore` | Proyectos `explore-desktop` y `explore-mobile`. Parámetros: `WEDA_SEED` (por defecto 2026), `WEDA_EXPLORE_N` (cantidad), `WEDA_SEQ` (repetir una sola secuencia), `WEDA_EXPLORE_STEPS`. No corren con `test:e2e`: son largas. Informes en `explore-results/` (ignorada por Git). |

Cada recorrido exploratorio es **reproducible**: el mismo `WEDA_SEED` y número de secuencia dan las mismas acciones y los mismos datos. Los fallos se guardan con su semilla en `explore-results/*.json`.

## 2. Resultados sobre el estado final del código

Todas las ejecuciones de esta tabla se hicieron **después de la última modificación de `src/`** (la corrección del aviso «Deshacer», `panel.css`). Después solo cambiaron archivos de pruebas y documentos, y las suites E2E completas se corrieron sobre el árbol final de `src/` y `e2e/` (huella verificada antes y después, ver §2.1). No se suman resultados de ejecuciones distintas.

| Verificación | Resultado sobre el estado final |
|---|---|
| `npx tsc --noEmit` | Sin errores (código de salida 0) |
| `npm run build` | Compila (código de salida 0) |
| `npx vitest run` | **8 archivos, 98 pruebas, todas pasan** (incluye `publish-todo.test.ts`) |
| E2E **celular** (`--project=mobile`, suite completa) | **67 de 67 pasan** (6,3 min) |
| E2E **escritorio** (`--project=desktop`, suite completa) | **25 de 25 pasan** (2,9 min) |
| Exploratoria · secuencias de acciones, escritorio | 40 secuencias, 560 acciones: 528 correctas, 32 omitidas (no había datos sobre los que actuar), **0 fallos del producto, 0 errores de la prueba** |
| Exploratoria · secuencias de acciones, celular | 40 secuencias, 560 acciones: 527 correctas, 33 omitidas, **0 fallos del producto, 0 errores de la prueba** |
| Exploratoria · matriz de estados, escritorio | 50 estados × 10 pantallas = 500 visitas, **0 fallos** |
| Exploratoria · matriz de estados, celular | 50 estados × 10 pantallas = 500 visitas, **0 fallos** |

Las «acciones omitidas» son pasos que la secuencia eligió y no podía ejecutar (por ejemplo, eliminar un invitado cuando no hay ninguno): no cuentan como correctas ni como fallos. Semilla 2026 en todas las exploratorias.

### 2.1 Qué ejecuciones no cuentan como validación final
- Las corridas exploratorias anteriores a la corrección del aviso (fallos candidatos en invitados, mesas y celular) fueron sobre código distinto: se usaron para encontrar defectos, no para afirmar que algo pasa. Su análisis está en [product-journey-audit.md §6](product-journey-audit.md).
- La línea base inicial (61 pruebas de celular de antes de esta auditoría) se corrió sobre el código previo y tampoco se suma.

## 3. Qué cubren las pruebas

### 3.1 Unitarias (98)

| Archivo | Pruebas | Qué comprueban |
|---|---|---|
| `weda-logic.test.ts` | 63 | Validaciones (nombres, fecha, montos, alias, CBU, invitados, grupos), plan y funciones (`can`, `PLANS`), guardado y lectura tolerante (`sanitize`, `parseStored`), estado semilla, modelo del sitio público, recorrido (`stages`, `nextAction`), cuenta (`hasEvent`, `accountDestination`) |
| `demo-lib.test.ts` | 9 | Utilidades de la demo y el calendario |
| `payments.test.ts` | 7 | Pagos simulados: montos, diferencia al mejorar, vigencia |
| `guests-io.test.ts` | 6 | Importación y exportación de planillas (duplicados, errores por fila) |
| `landing-plans.test.tsx` | 4 | Tarjetas de plan de la landing (datos de `plans.ts`) |
| `store-performance.test.tsx` | 4 | Rendimiento y escritura diferida del estado |
| `app-routing.test.tsx` | 2 | Rutas |
| `publish-todo.test.ts` | 3 | **Nuevo:** el pendiente «Definir la fecha» abre los datos; desaparece con fecha; el plan Regalos no lo pide |

### 3.2 E2E de celular (67 pruebas, 390 px con puntero táctil; algunas fijan 320, 360, 375 o 430)

| Archivo | Cubre |
|---|---|
| `account-flow.spec.ts` (6) | Registro simulado con correo, Google y Apple; el evento guardado se conserva; ingresar; onboarding empezado; recarga |
| `onboarding-photo.spec.ts` (9) | Subir foto, omitirla, archivo inválido, volver sin nombres, una pantalla sin scroll en 320/375/390/430 px |
| `landing-mobile.spec.ts` (15) | Barra superior, menú, anclas, hero, regalos, planes, testimonios; sin scroll horizontal en 7 anchos |
| `mobile-journeys.spec.ts` (12) | Flujos 1–7: Inicio → regalos (pack, catálogo, quitar y deshacer), cobro opcional, editor de eventos con vista previa, mostrar/ocultar secciones, invitados (alta, **importación con duplicados y errores**, exportación), mesas y grupos, publicar (ver link por plan, pagar, mejorar, bajar, volver a publicar) y sin scroll horizontal en 320/360/390/430 px |
| `panel-ui-phase.spec.ts` (19) | Catálogo y packs en 320–430 px, «Ver qué incluye», editar y quitar regalos, invitados (filas, hoja de edición, eliminar y deshacer), mesas, editor por secciones, diálogos con botones a la vista, publicar |
| `toast-long-names.spec.ts` (6) | **Nuevo:** regresión del defecto D1 (aviso con «Deshacer» y nombres largos) en 320, 390 y 1280 px |

### 3.3 E2E de escritorio (25 pruebas, 1280 × 800) — `e2e/desktop/journeys.spec.ts`, nuevo

| Perfil / tema | Qué comprueba |
|---|---|
| A · pareja apurada (2) | Landing → registro → nombres → fecha y lugar vacíos → foto omitida → panel con su portada y el estado guardado; siguiente paso único y «Publicar» siempre a mano con tres productos |
| C · empieza de cero (2) | Sin fecha ni lugar: el pendiente «Definir la fecha» abre «Datos del casamiento», guarda la fecha, limpia el parámetro y el pendiente desaparece; estados vacíos de invitados y regalos |
| B/D · el ejemplo (1) | El pie de `/ejemplo` y `/ejemplo/regalos` ofrece «Crear mi evento gratis» y lleva al registro; los sitios de parejas no lo muestran |
| Fecha y lugar opcionales (1) | Portada del panel («Fecha por definir»), editor («Falta la fecha»), vista previa y sitio público («Fecha a confirmar», sin «Guardar la fecha» ni valores `undefined`/`NaN`), pendiente de publicación; al definirlos todo se actualiza |
| Validaciones del alta (3) | Correo y clave con foco en el primer inválido; nombres vacíos; fecha pasada con mensaje propio y fecha futura con lugar guardado |
| H · abandona y regresa (2) | Atrás y adelante en el alta conservan lo cargado; salir a la landing y regresar retoma; atrás/adelante entre secciones del panel y recarga |
| B · visual (2) | El texto de la portada editado (y un cambio repetido) se ve en la vista previa; el pop-up se abre, cierra con Escape y reabre 3 veces con el mismo contenido |
| D/E · regalos (2) | Un pack aparece en la **página pública real** y al quitar un regalo desaparece; regalo propio: monto inválido rechazado con mensaje, alta, baja y «Deshacer» |
| E · invitados (3) | Alta, edición de asistencia y baja con «Deshacer»; **confirmación hecha en el sitio público** llega a la lista (origen RSVP) y enviarla dos veces no duplica; importación con errores (filas 2, 3 y 4 nombradas, nada cambia hasta confirmar, reintento con planilla válida) |
| Mesas (1) | Crear una mesa, asignarle una persona y eliminar la mesa deja a esa persona sin lugar (no la borra) |
| G · cambia de idea (2) | Cambiar nombres y fecha desde «Editar datos» se refleja en Inicio, estado y vista previa, y vaciar la fecha vuelve a «Fecha por definir»; elegir un plan, volver y elegir otro no cobra ni publica |
| J · publicar (1) | Publicar con Invitación (pago de prueba), link, «Publicada» tras recargar y sitio público con los nombres |
| Datos extremos (3) | Nombres con emoji, HTML o más de 40 letras se rechazan con mensaje; texto libre con HTML y emoji se muestra como texto sin romper el ancho; guardado corrupto o de versión desconocida vuelve al alta |

### 3.4 Exploratorias con semilla

| Prueba | Qué es | Qué comprueba |
|---|---|---|
| `state-matrix.spec.ts` | Cada «recorrido» = un estado sintético (semilla + número) cargado en el navegador y visitado en 10 pantallas: panel (Inicio, Regalos, Cobro, Invitados, Mesas, Tu página, Vista previa, Perfil) y sitio público (invitación, regalos). Datos variados: 0–40 regalos, 0–200 invitados, 0–8 mesas, planes, fechas pasadas/futuras/vacías, textos con HTML, emoji, RTL, 80 caracteres, publicación vigente o no. | Sin errores de consola, sin pantalla de error, contenido presente, sin desborde horizontal, el Inicio muestra el nombre de la pareja, el estado guardado conserva su versión y su cantidad de invitados al recargar. **No ejerce interacciones.** |
| `action-fuzz.spec.ts` | Secuencias de 14 acciones elegidas con semilla sobre un estado sintético. 13 acciones: ir a una sección, atrás/adelante, recargar, abrir/cerrar la vista previa, agregar regalo propio (datos válidos o inválidos), quitar regalo y deshacer, agregar invitado (válido o inválido), eliminar y deshacer, cambiar asistencia, crear mesa, editar el texto de la portada, editar los datos de la pareja, mirar los productos de publicación. | Después de cada acción: sin errores de consola, sin desborde, sin pantalla de error. Un formulario rechazado **explica por qué y no cambia el estado**; uno aceptado lo cambia en lo esperado; deshacer devuelve lo quitado; recargar conserva regalos e invitados. |

## 4. Defectos, problemas de pruebas y casos inconclusos (separados)

### 4.1 Defectos del producto confirmados
| ID | Qué | Prueba | Estado |
|---|---|---|---|
| D1 | «Deshacer» fuera de la pantalla con nombres largos de una sola palabra | `toast-long-names.spec.ts`, 6 pruebas que fallaban antes de corregir | Corregido |
| D5 | El diálogo «Datos del casamiento» no se abría al pulsar «Definir la fecha» si ya se estaba en el Inicio (error de la mejora, no del producto previo) | `desktop/journeys.spec.ts` «sin fecha ni lugar…» | Corregido antes de entregar |

### 4.2 Problemas o fragilidades de las pruebas (no del producto)
| ID | Qué | Cómo se resolvió |
|---|---|---|
| D2 | Espera fija de 250 ms tras enviar un formulario: el diálogo tarda ~520 ms en cerrarse y el error ~265 ms (medido en reposo) | Espera por condición observable (diálogo cerrado o error visible, hasta 3 s) |
| D3 | Oráculo de mesas contaba mesas guardadas; la pantalla guarda «Mesa 1» de ejemplo junto con la primera nueva; «1234» es un nombre válido de mesa | Comparación de identificadores y nombres |
| D4 | «Atrás» desde la primera pantalla del panel sale de la app | La prueba vuelve «adelante» |
| — | Los informes de las exploratorias se escribían en `test-results/`, que Playwright vacía al empezar cada proyecto | Salida en `explore-results/` |
| — | Un clic sobre el texto de un radio oculto era rechazado por Playwright («intercepts pointer events»), y el formulario de confirmación exige elegir una restricción alimentaria | La prueba hace clic en la etiqueta y elige «Sin restricciones» |
| — | Varios títulos de pruebas de escritorio prometían más de lo que comprobaban («filtro», «mover», «reordenar», «página pública», «confirmación desde el sitio») | Se rehicieron o se retitularon; la confirmación desde el sitio y la página pública de regalos ahora se ejercen de verdad |

### 4.3 Casos inconclusos
Ninguno abierto sobre el estado final. Se cerraron así:
- Los **tres candidatos de formularios de invitados y mesas** se clasificaron como falla de la prueba **con evidencia medida**, no supuesta: al repetir las secuencias aisladas no se reproducían; se midió la latencia de 80 envíos (40 en reposo y 40 con la CPU saturada) y se vio que el diálogo tarda ~520 ms en cerrarse y el error ~265 ms, por encima de la espera fija de 250 ms, y que **ningún diálogo quedó abierto sin error más de 5 s**. Con la espera por condición, 560 + 560 acciones sobre el código final no repiten el hallazgo. Lo que **no** se puede afirmar es que el comportamiento nunca falle: es una evidencia de ausencia en 1120 acciones, no una prueba.
- El **timeout de celular** era un defecto real del producto (D1), no un problema del entorno (ver §4.1).

## 5. Cobertura faltante o parcial

Declaro como **no cubierto** lo que no tiene una prueba que lo demuestre:

- **Arrastrar para ordenar las tarjetas de regalo** (mouse, táctil y Alt + flechas): sin prueba. `ux-flows.md` ya advierte que el arrastre táctil no se probó en dispositivos reales.
- **Importar un `.xlsx` real:** en E2E solo se importa `.csv`; la lectura de `.xlsx` está en pruebas unitarias (`guests-io.test.ts`), pero no con una planilla hecha en Excel.
- **Editor de «Tu página»**: eventos (mobile Flow 3), mostrar/ocultar (Flow 4) y texto de portada están cubiertos; **sin prueba**: galería de fotos, música, dress code, mensaje final, fecha límite de confirmación y cuenta regresiva con fecha y horarios.
- **Regalar como invitado** (elegir regalos → pagar → agradecimiento) y **pestañas de cobro** (alias, tarjeta) más allá de configurar el alias: sin prueba E2E.
- **Publicar en escritorio:** cubierto el pago con Invitación y el cambio de idea; **mejorar de plan, bajar y volver a publicar solo se prueban en celular** (Flow 7).
- **Rutas sin recorrido E2E propio:** `/encontrar`, `/ejemplo` y `/crear/*` en 1024/1440 px, `/panel/perfil`, 404 y pantalla de error. Se midieron con un barrido manual de desbordes (informe en `ui-audit.md`), que no es una prueba automática repetible.
- **Teclado y lectores de pantalla:** solo se prueba el foco en el primer campo inválido y el cierre con Escape. Orden de foco, trampa de foco en diálogos y anuncios no tienen prueba.
- **Regresión visual:** no hay capturas de referencia. Los cambios de CSS se verifican por medidas (posición, ancho, desborde), no por imagen.
- **Otros navegadores y dispositivos:** todo se ejecutó en Chrome de escritorio con emulación de celular. Sin Firefox ni WebKit y sin dispositivos reales.
- **Varias pestañas:** el efecto del evento `storage` entre pestañas no tiene prueba (la vista previa en iframe sí).
- **Almacenamiento lleno:** el aviso cuando `localStorage` se llena solo se contempla en pruebas unitarias de rendimiento, no en E2E.
- **Estados no ejercidos por las secuencias:** plan elegido distinto de «prueba gratuita» (las secuencias fijan `planId` en `null`: todo habilitado), publicación vigente en las acciones (se fija en `null`), más de 30 invitados o 12 regalos en acciones.
- **La matriz de estados** carga datos sintéticos pero no registra la interacción, y su oráculo de nombres solo busca el primer nombre en el Inicio.

## 6. Limitaciones del entorno
- Emulación móvil del panel de capturas de la app: devolvía imágenes en blanco; las mediciones de 320–390 px se hicieron con Playwright (DOM y coordenadas), no con capturas.
- Los temporizadores del navegador integrado se ralentizan con el panel oculto; no se usó para las suites.
- El servidor de desarrollo (Vite) es compartido por todas las ejecuciones; las exploratorias largas y las suites se corrieron **una por vez** para no falsear tiempos.
