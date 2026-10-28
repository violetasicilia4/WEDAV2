# Weda · Iteración de UI y usabilidad: constructor del sitio y responsive (2026-10-28)

Documento **histórico y con fecha**. Registra qué se inspeccionó, qué se encontró, qué se corrigió y qué quedó pendiente. Los criterios vigentes siguen en [product-principles.md](product-principles.md), [design-system.md](design-system.md) y [ux-flows.md](ux-flows.md).

## 0. Método y límites

- **Servidor de desarrollo** (`vite dev`) en el puerto 8090, porque el 8080 lo ocupaba otro proceso de la máquina. Las pruebas E2E se corrieron con `WEDA_URL=http://localhost:8090`.
- **Datos sintéticos:** `seedState()` («Tomás y Martina») cargado en el `localStorage` de navegadores de prueba aislados (Playwright headless), o el alta real de «Lucía y Violeta» en los tests E2E. No se tocaron datos de ninguna cuenta real.
- **Barrido automático** (script de Playwright): 15 rutas × 320, 360, 390, 430, 1024, 1280 y 1440 px. Mide desborde horizontal, controles fuera del ancho, controles de menos de 40 px, errores de consola y redirecciones.
- **Inspección visual con capturas:** constructor (lista, edición y «Cómo queda») a 320, 390, 1024 y 1280 px; Inicio y Tu página a 320 px; `/ejemplo` a 320 px.
- **Medición del recorrido del constructor**, antes y después, con el mismo script y los mismos datos (§4).
- **No inspeccionado a fondo en esta iteración.** Solo está cubierto por las pruebas E2E existentes, que pasan; no hubo revisión visual nueva:
  - diálogo de publicación y pago de prueba en todos sus pasos;
  - importación de invitados;
  - arrastrar regalos;
  - estados de error de cada formulario;
  - teclado virtual real de iOS/Android. Se simuló con foco en campos; `visualViewport` no se puede reproducir fielmente en un navegador de escritorio.

## 1. Inventario

- **Rutas** (`src/routes/`):
  - landing y públicas: `/`, `/encontrar`, `/ejemplo`, `/ejemplo/regalos`;
  - alta: `/crear/cuenta`, `/crear`, `/crear/fecha`, `/crear/foto` (sin nombres vuelve a `/crear`), `/crear/plan` (redirige al panel);
  - panel: `/panel`, `/panel/regalos`, `/panel/invitados` (incluye «Mesas y grupos»; `/panel/mesas` redirige), `/panel/sitio`, `/panel/vista-previa`, `/panel/perfil`;
  - sitio de la pareja: `/sitio/$slug` y `/sitio/$slug/regalos`.
- **Constructor:** `src/routes/panel.sitio.tsx`, con la ventana en vivo (`components/panel/live-card.tsx`), la vista previa completa (`components/panel/site-preview.tsx`) y los estilos `ed-*` / `lc-*` de `panel.css`.
- **Secciones del constructor y sus acciones reales:**

| Sección | Se ve / se edita | Se agrega / se quita | Se mueve | Notas |
|---|---|---|---|---|
| Portada | sí | no (siempre está) | no (siempre primera) | Foto, nombres, fecha, texto sobre los nombres |
| Save the date | sí | no (aparece con la fecha) | sí | Solo la cuenta regresiva se configura acá |
| Eventos | sí | no (cada evento tiene «Mostrar») | sí | Hasta tres momentos; acordeón por evento |
| Regalos | sí | sí | sí | Título, texto y botón; los regalos se arman en «Regalos» |
| Confirmación | sí | sí | sí | Sin campos: solo se muestra u oculta |
| Dress code | sí | sí | sí | Título, texto, colores |
| Texto libre | sí | sí | sí | Título y mensaje |
| Fotos | sí | sí (plan Celebración Plus) | sí | Hasta 6 fotos, hashtag, Instagram |
| Música | sí | sí (plan Celebración Plus) | sí | Lista local, sin Spotify |
| Mensaje final | sí | sí (plan Celebración Plus) | no (siempre al final) | Frase y mensaje |

## 2. Hallazgos iniciales

Leyenda: **Sev.** alta / media / baja · **Esf.** S / M / L · **Estado** ✔ corregido · ○ pendiente · ? decisión de producto.

| # | Superficie | Hallazgo y evidencia | Sev. | Solución | Esf. | Estado |
|---|---|---|---|---|---|---|
| H1 | Constructor (todas) | **Error de hidratación de React** en la vista previa del editor. El código escribía `style="--ed-w"` en el `<html>` de la página dentro del iframe antes de que React la hidratara. Rompía 4 pruebas E2E con «errores de consola». | alta | El grosor del marcado va en una hoja de estilo propia (`#ed-width`), no en el `<html>` (`site-preview.tsx`). | S | ✔ |
| H2 | Constructor celular | **Volver y «Listo» fuera de la pantalla** mientras se edita. En Eventos: al abrir, «Listo» quedaba ~1.800 px más abajo; al final del formulario, «← Tu invitación» quedaba ~1.000 px más arriba. | alta | Barra fija con flecha, ícono + nombre de la sección y «Listo», siempre a la vista. | M | ✔ |
| H3 | Constructor celular | **El formulario asomaba por encima de la ventana en vivo.** La ventana quedaba fija a 60 px del borde, pero la barra del panel no es fija: el texto se veía pasar por arriba. | media | La barra y la ventana van en un mismo bloque fijo y opaco, pegado al borde. | S | ✔ |
| H4 | Constructor 320 px | **Nombres de sección cortados** («Confirm…», «Dress co…», «Mensaje final») por los tres íconos de cada fila y el número de orden. | media | En ≤ 420 px se oculta el número (el ícono y la posición ya dan el orden). | S | ✔ |
| H5 | Constructor | **«Ver completa» tapaba el título** de la sección dentro de la ventana en vivo (arriba a la izquierda). | baja | El botón pasa abajo a la derecha. | S | ✔ |
| H6 | Constructor | **«Quitar de la invitación» al lado de «← Tu invitación»** en la barra de edición: una acción que saca la sección, junto a la de volver. | media | «Quitar» va al pie del formulario, separado, con «Lo que cargaste se guarda». «Listo» queda arriba. | S | ✔ |
| H7 | Constructor celular | En «Cómo queda» con una sección abierta, volver a editarla dependía del selector «Editar», que no dice adónde vuelve. | baja | «← Seguir editando {sección}» en la barra de la vista previa. | S | ✔ |
| H8 | Constructor 1024 px | Hasta 1099 px el editor era de una columna con alternancia, aunque a 1024 px hay lugar para las dos. Al pasar a dos columnas, la invitación quedaba en **231 px** (una miniatura) porque el formulario tomaba 440 px fijos. | media | Dos columnas desde 1024 px. Entre 1024 y 1279 px se reparten por igual (formulario ≥ 340 px, invitación ≥ 320 px: 340/332 px a 1024). La ayuda «Tocá una sección…» se oculta en ese rango porque se partía en 4 renglones. | S | ✔ |
| H9 | Constructor celular | Con un campo enfocado (Tab o «siguiente» del teclado), el navegador lo podía dejar **debajo del bloque fijo**. | media | `scroll-margin-top` en los campos de la edición, según el alto del bloque (normal, teclado compacto o tira). | S | ✔ |
| H10 | E2E | Prueba desactualizada: esperaba «Pagar ARS 320.000» para Celebración Plus, pero el precio vigente en `plans.ts` es ARS 150.000 (cambiado en el último commit sin actualizar el test). | baja | Se actualizó la expectativa. | S | ✔ |
| H11 | E2E | Prueba desactualizada: esperaba «Lucía y Violeta», pero la portada usa «&» en todo el producto. | baja | La expectativa acepta «y» o «&». | S | ✔ |
| H12 | Eventos (editor) | **Activar y editar conviven** dentro de Eventos: cada momento tiene una casilla «Mostrar» en su encabezado, mientras que el resto de las secciones se agregan y quitan desde «Tu invitación». Es coherente con el modelo de datos (Eventos no se quita; se muestra cada momento), pero es otro patrón. | baja | Mantener. La casilla tiene nombre propio («Mostrar Ceremonia») y no cambia al editar. Si se quiere unificar, que cada momento sea una fila de «Tu invitación». Eso cambia el modelo de orden y queda como decisión. | M | ? |
| H13 | Regalos 320 px | La última solapa («Cobro») queda 1 px fuera del ancho. Es una barra con scroll lateral y degradado, a propósito. | baja | Ninguna. | – | ✔ (sin cambio) |
| H14 | `/ejemplo` 320–390 px | **No era un resto ni estaba oculto.** El bloque «Tu música, nuestra playlist.» (título, campos y «Agregar») y el cierre («Que vengas ya es un regalo.» y «Ver lista de regalos») quedaban **más anchos que su tarjeta y se cortaban a la vista** (a 320 px, el título decía «…playli»; a 390, el cierre perdía ~14 px). El barrido no lo vio como scroll porque la tarjeta recorta. Causa: `useFitOneLine` mide el título con `nowrap`, pero estaba en una grilla de columna `auto` y centrado como ítem, así que la columna crecía con el texto y el hook nunca detectaba que no entraba. | media | `invitacion.css`: `grid-template-columns: minmax(0, 1fr)` en `.iv-playlist`, `.iv-closing` y `.iv-closing-copy`; el título a lo ancho (`justify-self: stretch`; el texto ya iba centrado). Ver §9. | S | ✔ |
| H15 | Panel (compu) | En compu, los íconos de Regalos miden 36 px (25 controles «chicos» a 1024–1440 px). El CSS ya los lleva a 44 px con puntero táctil. | baja | Ninguna para mouse. | – | ✔ (sin cambio) |
| H16 | Constructor | La lista «Tu invitación» no muestra la invitación en el celular: para verla hay que tocar «Cómo queda». | baja | Mantener. Una miniatura junto a la lista sería ilegible a 320–430 px; «Cómo queda» la muestra a tamaño real y «Seguir editando» devuelve el contexto. | – | ? |

**Resto del producto (barrido automático):** ninguna de las 15 rutas tiene scroll horizontal ni errores de consola en ninguno de los 7 anchos. Los únicos controles fuera del ancho son los de H13 y H14 (H14 resultó visible: ver la fila y §9).

## 3. Arquitectura elegida para el constructor

**Alternativas evaluadas:**
1. **Pantalla de edición dedicada en el celular** (la lista desaparece, la sección ocupa todo y se vuelve con la flecha) con barra fija. Es lo que ya existía, sin la barra.
2. **Panel inferior (bottom sheet)** sobre la invitación a pantalla completa. Mantiene la invitación siempre visible, pero los formularios largos (Eventos, Fotos) y el teclado abierto dejan al panel con muy poco alto. Además pelea con la barra inferior de navegación.
3. **Edición sobre la página** (tocar el texto en la vista previa). Ya se descartó el 2026-10-27: Weda no necesita un editor de bloques en vivo.

**Elegida: la 1, con barra de contexto fija.** Es la que menos cambia lo que ya funciona (estructura, edición por sección, vista previa conectada y deshacer). Corrige exactamente donde se perdía la orientación:

- **Dónde estoy:** la barra muestra el ícono y el nombre de la sección («Eventos», «Dress code») todo el tiempo, también con el formulario scrolleado.
- **Cómo vuelvo:** la flecha («Volver a Tu invitación») y «Listo» están en la barra, nunca fuera de la pantalla.
- **Cómo queda:** la ventana en vivo sigue pegada debajo de la barra, en el mismo bloque fijo y opaco. «Ver completa» abre la invitación entera y «Seguir editando {sección}» vuelve al mismo lugar.
- **Activar y quitar no se confunden con editar:**
  - tocar la fila edita;
  - las flechas mueven;
  - la ✕ quita, con «Deshacer»;
  - dentro de la edición, «Quitar de la invitación» está al pie, lejos de «Listo»;
  - entrar y salir de una sección no cambia si se muestra (probado).
- **Compu:** dos columnas desde 1024 px, con anchos mínimos útiles. La barra es fija también en compu, sin el nombre (el título de la sección ya está a la vista).

**Qué no se hizo, a propósito:** arrastrar y soltar, una miniatura permanente de la invitación en la lista del celular (H16) y unificar el «Mostrar» de cada evento (H12).

## 4. Recorridos antes y después

Medidos con el mismo script (`seedState`, formulario de Eventos, el más largo). «Visible» = dentro de la pantalla.

| Medida | 320 px antes | 320 px después | 390 px antes | 390 px después | 1024 px antes | 1024 px después | 1280 px antes | 1280 px después |
|---|---|---|---|---|---|---|---|---|
| Filas con el nombre cortado | 3 | **0** | 0 | 0 | 0 | 0 | 0 | 0 |
| Volver, al abrir Eventos | visible | visible | visible | visible | visible | visible | visible | visible |
| «Listo», al abrir Eventos | fuera (+1.852 px) | **visible** | fuera (+1.772 px) | **visible** | fuera (+1.692 px) | **visible** | fuera (+1.473 px) | **visible** |
| Volver, con el formulario al final | fuera (−1.029 px) | **visible** | fuera (−978 px) | **visible** | fuera (−826 px) | **visible** | fuera (−689 px) | **visible** |
| Qué hay justo encima de la ventana en vivo | el formulario | **la barra** | el formulario | **la barra** | – | – | – | – |
| Columnas | 1 | 1 | 1 | 1 | 1 (alternar) | **2** (340/332 px) | 2 | 2 |
| Errores de consola | 0 | 0 | 0 | 0 | 0 | 0 | 1 (hidratación) | **0** |

Acciones (celular, 390 px):

| Tarea | Antes | Después |
|---|---|---|
| Llegar a una sección | 1 toque | 1 toque |
| Agregar o quitar una sección | 1 toque (Agregar abre la edición; ✕ con «Deshacer») | igual |
| Editar una sección y volver | 1 toque + **scroll hasta el principio o el final** del formulario + 1 toque | 1 toque + 1 toque, **sin scroll** |
| Ver la invitación completa | 1 toque («Cómo queda» o «Ver completa») | igual |
| Volver desde la vista previa a la sección que se editaba | 1 toque en «Editar» (no decía adónde volvía) | 1 toque en **«Seguir editando {sección}»** |
| Recuperar el contexto | la sección abierta se conservaba, sin indicación | se conserva y la barra la nombra |
| Callejones sin salida | ninguno bloqueante; salida fuera de la pantalla | ninguno |

## 5. Resultados por viewport

- **320 / 360 / 390 / 430 px:**
  - sin scroll lateral;
  - nombres completos;
  - la barra (flecha y «Listo», ≥ 44 px de alto) entra en el ancho;
  - los campos enfocados quedan debajo del bloque fijo y dentro de la pantalla.
  
  Todo verificado por `e2e/builder.spec.ts`.
- **1024 / 1280 / 1440 px:**
  - dos columnas, una al lado de la otra;
  - formulario ≥ 340 px e invitación ≥ 300 px;
  - «Listo» visible al final del formulario largo;
  - la vista previa sigue fija mientras se scrollea;
  - la sección abierta queda marcada en la invitación;
  - tocar otra sección en la vista previa la abre.
  
  Todo verificado por `e2e/desktop/builder.spec.ts`.
- **Cambio de celular a compu y vuelta** con una sección abierta: sigue abierta, suma y saca la vista previa al costado (probado).

## 6. Componentes y tokens

- **Sin componentes nuevos.** La barra (`.ed-stick` / `.ed-bar` / `.ed-now` / `.ed-done`) reutiliza `pn-btn`, la flecha `ed-back` y los colores del panel.
- **Patrón documentado** en `design-system.md`: «barra de contexto fija mientras se edita una sección», reutilizable en cualquier edición larga del panel.
- **Puntos de corte del editor:** dos columnas desde 1024 px (antes 1100). La vista previa arranca en «Compu» solo desde 1280 px; antes era desde 1100, y a 1024 la compu escalada quedaba ilegible.

## 7. Pruebas ejecutadas

- **`npx tsc --noEmit`:** sin errores.
- **`npx vitest run`:** 163/163.
- **`npm run build`:** correcto.
- **E2E (Playwright, Chromium headless, `WEDA_URL=http://localhost:8090`).** Línea de base antes de los cambios: 109/115, con los 6 fallos de H1, H10 y H11. Pruebas nuevas:
  - `e2e/builder.spec.ts`: celular, 8 pruebas (barra fija, quitar ≠ editar, texto largo, «Seguir editando», foco con bloque fijo, recarga, 320/360/430 px);
  - `e2e/desktop/builder.spec.ts`: 7 pruebas (1024/1280/1440 px y el cambio de celular a compu).
  
  Resultado de la suite completa al final: **129 de 130**. El que falló («a 430 px…», un error de consola) pasó 3 de 3 al repetirlo; se le quitó una recarga innecesaria justo después del alta y `e2e/builder.spec.ts` pasó 16 de 16 (dos vueltas).
- **`/ejemplo` sin regresiones:** las pruebas existentes de `/ejemplo` y el barrido de 7 anchos sin desbordes ni errores.

## 8. Limitaciones y pendientes

- **Teclado real del celular:** se probó el foco y el margen; el comportamiento exacto de `visualViewport` en iOS/Android requiere un dispositivo real.
- **H12 y H16 (decisiones de producto)** quedan abiertos. H14 se corrigió en los lotes D y E (§9).
- **Lotes D y E (consistencia transversal y refinamiento):** hechos en §9. Quedan los `!important` de `invitacion.css` (70) y los puntos de corte del panel (I3 e I4 de [ui-audit.md](ui-audit.md)).
- **Pruebas intermitentes:** una corrida de la suite tuvo fallos de «Cargando…» y errores de consola en tres pruebas de compu, mientras se editaba CSS con el servidor de desarrollo encendido (recarga en caliente). Repetidas sin cambios de código, pasaron 6 de 6. Conviene correr la suite sin editar al mismo tiempo, o contra una compilación (`WEDA_URL`).

## 9. Lotes D y E: consistencia transversal (2026-10-28, segunda vuelta)

**Alcance:** solo `panel.css` (contexto de administración) y el arreglo H14 en `invitacion.css`. No se tocó `styles.css` (landing), `ejemplo.css` ni `demo.css`, ni la identidad visual. En el constructor (`panel.sitio.tsx`) no se cambió código: sus reglas `ed-*` / `lc-*` / `sp-*` de `panel.css` pasaron a usar los tokens.

**Inventario de `panel.css` (valores repetidos con el mismo propósito):**

| Qué | Antes | Ahora |
|---|---|---|
| Radios escritos en px | 100 usos, 15 valores distintos | 60 usos, 12 valores. Pasaron a `--pn-r-ctl` (controles), `--pn-r-note` (avisos y cajas chicas, nuevo), `--pn-r-card` (tarjetas), `--pn-r-gift` (tarjetas de regalo, nuevo) y `--pn-r-sheet` (diálogos) |
| Alturas 40 / 44 / 48 px escritas a mano | 55 | 8 (el aviso, que vive fuera de `.pn-root`, y alturas que no son de control). El resto, `--pn-h-small`, `--pn-h-touch`, `--pn-h-ctl` |
| Rótulo de campo / ayuda | 14 px y 13 px sueltos | `--pn-fs-label` y `--pn-fs-help` en rótulos, `legend`, ayuda, error, términos, estado de fila y ayuda del constructor |
| Hover | `rgb(59 60 58 / .05)` y `/ .06` repetidos | `--pn-hover` (filas y opciones) y `--pn-hover-ghost` (botón con borde del alta) |
| Deshabilitado | dos reglas iguales (`.pn-btn`, `.pn-link`) | una regla con `--pn-disabled` |
| Foco | ya era una sola regla (`:focus-visible`, 2 px) | sin cambios |

**Qué se dejó como estaba, a propósito:**
- los marcos de dispositivo de la vista previa (28 / 24 / 14 / 10 px): copian un celular y una compu;
- las píldoras (999 px) y los círculos (50 %);
- los cuadrados de ícono de 44 px: no son objetivos táctiles;
- los tamaños de texto que no son rótulo ni ayuda;
- los grises de `.pn-pay` y `.pn-upgrade` (I2 de `ui-audit.md`).

**Limpieza:**
- **Colisión de `.pn-label`.** La usaban el rótulo de un campo (14 px) y los títulos de grupo de «Publicar» (13 px semibold). La segunda regla le ganaba a todo el panel, y «Foto de portada» necesitaba un parche. Ahora los títulos de «Publicar» usan `.pn-group-label` (`publish-dialog.tsx`, 5 usos).
- **Reglas sin efecto.** Se quitaron dos hover de la «Jerarquía de acciones», que la regla posterior «Rediseño del panel» siempre pisaba. Uno de ellos era un gris azulado (`#4a535a`) que nunca se veía.

**Cambio visual deliberado:** «Regalo propio» del catálogo ahora sigue el radio de las tarjetas vecinas en celular (18 px, antes quedaba en 22). Además, H14.

**H14 (ver la fila de §2):**
- No era un formulario oculto ni un resto: el bloque se cortaba a la vista a 320–390 px. Había dos bloques afectados, la playlist y el cierre.
- El arreglo son tres reglas en `invitacion.css` (documentadas en `design-system.md` §5) y una línea en `site-shell.tsx`. El hook aplicaba el tamaño reducido con un estilo en línea común, pero el título de la playlist y el del cierre fijan su tamaño con `!important`, así que nunca se achicaban. Ahora el hook lo aplica con prioridad (`setProperty(…, 'important')`). Antes, el error quedaba oculto porque el bloque crecía con el título.
- La prueba «ningún título se parte en dos renglones» (`mobile-journeys.spec.ts`) lo detectó en cuanto el bloque dejó de crecer. Con el hook corregido, los dos títulos entran en un renglón, achicados lo justo.
- Resultado: sin desbordes ni recortes en `/ejemplo` a 320, 360, 390, 430, 1024 y 1280 px. Lo midió un script que busca elementos fuera del ancho o recortados por su contenedor.
- En compu (1024 y 1280 px) se ve igual que antes, comparado con capturas. A 320–390 px, los dos títulos quedan en un renglón y entran en su tarjeta.

**Verificación sin regresiones:**
- **Método.** Se tomó una foto de los estilos calculados de **todos** los elementos (20 propiedades: radios, alturas, tamaños, colores, bordes, opacidad, cursor, sombra, `scroll-margin-top`…) en 15 estados × 320 / 390 / 1024 / 1280 px, antes y después. Los estados: alta, Inicio, «Publicar», Regalos y sus solapas, Invitados, Mesas, constructor (lista y Eventos abierto), Vista previa, Perfil, `/ejemplo`, `/ejemplo/regalos` y la landing. Datos: `seedState()`.
- **Ruido medido.** Dos fotos «antes» seguidas difieren solo en el aviso de carga de la ventana en vivo.
- **Resultado.** **0 diferencias en el panel, el alta y la landing**, más allá de ese ruido. En `/ejemplo` solo cambian los bloques de H14.
- **No cubierto por la foto:**
  - el estado hover (se razonó sobre la cascada; las reglas quitadas estaban siempre pisadas);
  - el aviso breve, que volvió a valores literales;
  - «Regalo propio» en celular.

**Pruebas (2026-10-28):**
- `npx tsc --noEmit`: sin errores.
- `npx vitest run`: 163/163.
- `npm run build`: correcto.
- **E2E completa** (`WEDA_URL=http://localhost:8090`, sin editar mientras corría): **130/130**.
  - La primera corrida dio 128/130: el fallo de títulos de H14, ya corregido, y uno intermitente de `account-flow` (tiempo de espera en `/crear/fecha`). Ese archivo pasó 6 de 6 al repetirlo.
- **Capturas** a 320, 390, 1024 y 1280 px de los 15 estados de la foto de estilos, revisadas en: «Publicar», el constructor con Eventos, Invitados y el cierre y la playlist de `/ejemplo`.


## 10. Cierre de la auditoría y `!important` de la invitación (2026-10-28, tercera vuelta)

### 10.1 Revisión visual manual pendiente

- **«Regalo propio» (Regalos › Catálogo › Regalos individuales, tarjeta «Crear regalo»).** Medido y fotografiado a 320, 390, 430 y 1280 px.
  - En celular tiene el mismo radio que la tarjeta vecina (18 px), el mismo ancho y alto (139×243, 174×259 y 193×278 px) y la misma fila.
  - En compu, 22 px las dos.
  - Sin recortes ni scroll lateral.
  - **Se conserva el cambio.**
- **Constructor, flujo completo** a 320, 390 y 1280 px, con datos sintéticos y capturas de cada paso: abrir Dress code, editar el nombre del 4.º color, «Listo», volver, «Cómo queda», «Seguir editando», «Quitar de la invitación» y «Deshacer».
  - El campo enfocado queda debajo del bloque fijo y dentro de la pantalla en los tres anchos.
  - El valor se guarda y se conserva al volver de «Cómo queda».
  - «Deshacer» (80×44 px) devuelve la sección con lo cargado.
  - Sin scroll lateral ni errores de consola.
  - **Sin defectos reproducibles.** En una corrida a 390 px, la vista previa tardó más de 1,5 s en cargar en el servidor de desarrollo: es demora, no un defecto (la sección aparece marcada en la corrida a 320 px y en las pruebas E2E).
- **Regresión del registro, el panel y la landing:** comparación píxel a píxel contra el último commit (`20510cb`) servido aparte, con los mismos datos y movimiento reducido.
  - **Registro y panel:** `/crear/cuenta`, `/crear`, Inicio, Regalos, Invitados, Vista previa y Perfil, a 320, 390 y 1280 px, **idénticos**.
  - **`/encontrar`:** cambian solo las fotos de tres parejas, reemplazadas a pedido de la dueña.
  - **Landing:** mismo alto de página. Cambian el video y la portada del hero, la foto de Regalos, las cabeceras de los planes (sin foto) y las fotos de los testimonios, todo pedido.
  - En la captura de página completa la foto de Regalos aparecía vacía por la carga diferida (`loading="lazy"`). Al scrollear hasta ella carga y se ve bien (1762 px, verificado).

### 10.2 `!important` en `src/invitacion.css`

**Cantidad:** **129 → 44.** El ~70 de `ui-audit.md` contaba renglones (85), no declaraciones.

**Método:**
1. Se le quitó la prioridad a cada grupo de declaraciones en el CSSOM y se compararon los estilos calculados de **todos** los elementos de la invitación contra un control tomado justo antes. Grupo = regla + media + propiedad abreviada (`font`, `margin`, `border`…).
2. Se hizo en 4 páginas (`/ejemplo`, `/ejemplo/regalos`, `/sitio/…?borrador`, `/sitio/…/regalos?borrador`) × 6–7 anchos (320 a 1440 px).
3. La cuenta regresiva y los reacomodos de `useFitOneLine` se descartan como ruido.
4. Como dos `!important` pueden respaldarse entre sí, los candidatos se aceptaron de forma acumulativa (cada uno, junto con los ya aceptados) y el lote final se volvió a verificar entero.

**Qué se sacó (85):**

| Lote | Cuántas | Por qué |
|---|---|---|
| 1 | 57 | **Redundantes (A).** Hay otra regla que fija lo mismo. Ejemplos: la base de las tarjetas de regalo (`.rg-card`, `.rg-btn`), la familia Arial de la barra, el fondo blanco general, los márgenes del alta de títulos. |
| 2 | 7 | Las mismas condiciones, visibles recién después del lote 1, porque antes las tapaba otro `!important`. |
| 3 | 21 | **Declaraciones muertas, borradas.** La misma regla (mismo selector y media) se repite más abajo y vuelve a fijar todas sus propiedades con `!important`, así que la anterior nunca se aplica. Ejemplos: los dos fondos viejos de «Ceremonia, recepción y fiesta» (celeste y pizarra) bajo el verde clarito, cinco `margin-top` de la fecha de la portada, las variantes anteriores del título de bienvenida y el cristal de la barra. |

**Verificación del archivo real** (no solo del CSSOM):
- Huella de estilos calculados con el CSS original y con el final: 5 vistas (incluida la ventana en vivo `?ventana` del editor) × 7 anchos. **0 diferencias.**
- Capturas de página completa a 320, 390 y 1280 px: idénticas, salvo los dígitos de la cuenta regresiva.

**Qué queda (44) y por qué:**

| Causa | Dónde (renglón) | Decisión |
|---|---|---|
| **D. Tipografía base que tiene que ganarle a otras hojas** (`ejemplo.css`, `demo.css` con selectores más específicos). Sin la prioridad cambia lo visible: por ejemplo, la ceja `.iv-eyebrow` pasa de 400 a 500 de peso. | `.iv-eyebrow` 27, `.iv-h2` 28, `.iv-closing p` 126, `.rg-card h3` 153, `.iv-card-body h3` 244, `.iv-welcome-title` 399, `.iv-dress-title` 495, `.iv-playlist-title` 509 | Se conservan. Quitarlas exige mover estas reglas a una sola hoja o subir su especificidad, que es una reestructuración de la invitación. |
| **B. Ajustes que dependen de una base con `!important`.** Si la base pierde la prioridad, cambia el resultado. Algunos se respaldan entre sí: el título de Confirmación (28 y 532) y el de Regalos (721 y 720) tienen dos reglas cada uno. | 156 (borde), 339, 340, 404, 448, 449, 525, 532, 652, 667, 720, 721, 731, 748, 749 | Se conservan. Se van solos si algún día se resuelve la fila D. |
| **D. Portada: capas de posición y tamaño** («como la referencia», «posición fija», «cielo arriba»…). | 272, 273, 293, 309, 310, 329, 331 | Se conservan. Tocarlas cambia la portada en algunos anchos (medido). |
| **C. Estados que deben ganarle a la base.** | `.rg-btn:hover` y `:disabled` 157 y 158, `.iv-card-map:hover` 744, barra 354 y 355 (cristal y sobre fondo claro) | Se conservan. Hover y deshabilitado no se pueden recorrer automáticamente; por la cascada siguen ganando. |
| **C. Fondo de «Ceremonia, recepción y fiesta».** | 628 | Se conserva: es el único que queda de los tres que había. |

**Riesgo residual:**
- Los estados que el recorrido automático no genera: un regalo deshabilitado, hover y la portada de regalos con fecha (`.iv-cover.is-gifts .iv-cover-date`, que no aparece en los datos de prueba).
- Se revisaron las reglas de estado de `ejemplo.css` e `invitacion.css` que compiten con lo que perdió la prioridad. En todos los casos la regla de estado conserva su `!important` y sigue ganando.

### 10.3 Puntos de corte del panel

- **Método:** 6 pantallas del panel × 8 anchos pedidos (320, 360, 390, 430, 768, 1024, 1280, 1440), más los bordes de cada transición (559/560/561, 639/640/641, 759/760/761, 899/900/901, 1023/1024, 1099/1100), con puntero táctil por debajo de 1024. Se midieron:
  - scroll lateral;
  - controles fuera del ancho;
  - áreas táctiles de menos de 40 px;
  - textos cortados;
  - estados de «un solo píxel», cuando reglas `min-width` y `max-width` de igual valor se pisan en el mismo ancho.
- **Sin scroll lateral en ningún ancho.**
- **Sin estados de un solo píxel** en 560, 640, 760 ni 900. Esas reglas tocan componentes distintos y no se contradicen.
- **Defecto corregido:**
  - **Qué pasaba:** en «Primeros pasos» (Inicio), «Ocultar / Mostrar» medía **36 px de alto con el dedo**. `.gs-head-actions .pn-link { min-height: 36px }` venía después y pisaba el mínimo táctil de `.pn-app .pn-link` (igual especificidad).
  - **Arreglo:** los 36 px ahora valen solo con mouse (`@media (pointer: fine)`).
  - **Resultado:** con el dedo mide 44 px (verificado a 390 px) y en compu sigue igual (36 px a 1280).
- **Falsos positivos descartados:**
  - «Quitar la foto» en Perfil mide 34×34, pero con puntero táctil un pseudo-elemento lo lleva a 44×44.
  - «Buscar un invitado» es una etiqueta solo para lectores de pantalla (`pn-sr`).
  - La solapa «Cobro» de Regalos asoma 1 px en una barra con scroll lateral, a propósito.
- **No se agregaron ni movieron puntos de corte.**

### 10.4 Validación final (2026-10-28)

- **`npx tsc --noEmit`:** sin errores.
- **`npx vitest run`:** 13 archivos, **163/163**.
- **`npm run build`:** correcto.
- **E2E completa** (`WEDA_URL=http://localhost:8090`, sin editar mientras corría). Dos corridas, **129/130** cada una, con un fallo distinto en cada una. Los dos son intermitentes y no se reproducen:
  - 1.ª corrida: `account-flow.spec.ts` › «1. evento completo → registrarse…». Tiempo de espera en `/crear/fecha`, en el **primer test de la corrida**, con el servidor de desarrollo recién recompilado. Repetido aparte: 18 de 18. Es el mismo intermitente que registró la segunda vuelta (§9).
  - 2.ª corrida: `landing-mobile.spec.ts` › «el header conserva las dos píldoras…». La prueba leía el vidrio de la barra 250 ms después de scrollear, pero el vidrio entra con una transición. Repetido aparte: 6 de 6. **Se corrigió la prueba**: ahora espera a que el vidrio esté armado, sin cambiar qué verifica. Después de eso, `landing-mobile` + `account-flow`: 21 de 21.
  - **Fallos reproducibles: ninguno.** No se corrió una tercera suite completa después del ajuste de la prueba de la landing.
- **Regresiones visuales:** ninguna involuntaria. Ver §10.1 (panel y registro idénticos píxel a píxel) y §10.2 (invitación con estilos calculados idénticos).
