# 03 · Auditoría mobile

## Cómo se midió

- **Herramienta:** Playwright con Chrome, en modo móvil (`isMobile` y `hasTouch`).
- **Anchos:** 320×568, 360×740, 375×667, 390×844, 414×896 y 430×932. En la revisión responsive del mismo día también se midieron todos los iPhone hasta 440×956, y en tablet 768×1024 y 1024×1366.
- **Qué se midió:**
  - overflow horizontal;
  - texto que no entra;
  - objetivos táctiles de menos de 44 px;
  - letra de menos de 12 px fuera de las maquetas;
  - contraste;
  - foco con teclado;
  - alto de cada sección.
- **Limitación:** no se probó en un iPhone físico. El efecto `position: sticky` de las hojas de Regalos conviene verificarlo en Safari real.

## Resultados por ancho (medido)

| Ancho | Overflow X | Pantallas de alto | Contraste bajo | Objetivos < 44 px | Letra mínima |
|---|---|---|---|---|---|
| 320 | 0 | 11,8 | 5 (verde) | 1 («Ir al contenido», 41 px) | 12 px |
| 360 | 0 | 9,6 | 5 | 1 | 12 px |
| 375 | 0 | 10,3 | 5 | 1 | 12 px |
| 390 | 0 | 9,0 | 5 | 1 | 12 px |
| 414 | 0 | 8,7 | 5 | 1 | 12 px |
| 430 | 0 | 8,5 | 5 | 1 | 12 px |
| 768 | 0 | 8,2 | 4 | 1 | 12 px |
| 1024 | 0 | 4,4 | 4 | 2 | 12 px |
| 1440 | 0 | 6,8 | 4 | 2 (+ «Iniciar sesión», 42 px) | 12 px |

«Ir al contenido» solo aparece al enfocarlo con el teclado, así que no afecta al uso táctil.

## Lo que está bien

- **Sin overflow en ningún ancho**, ni en la landing ni en `/lista-de-regalos`. El video del hero es 14% más ancho a propósito y su contenedor lo recorta: en un celular real la página carga a escala 1, verificado con `visualViewport.scale`.
- **El hero se adapta a cada iPhone:** título en 2 renglones, bajada en 2 renglones y nunca más ancha que el título. Los botones quedan dentro de la primera pantalla y la sección siguiente asoma.
- **Se puede usar con una mano:**
  - el menú se abre con el pulgar desde la barra;
  - los CTA miden entre 44 y 52 px;
  - las flechas de Testimonios miden 44 px y están a la derecha.
- **«Reducir movimiento»:** sin animaciones, sin video y sin scroll suave (medido: 0 animaciones en curso).
- **Maquetas de Regalos en celular:**
  - las tres ocupan la misma caja, entre 300 y 400 px según el ancho;
  - el texto va centrado debajo;
  - el texto arranca a la misma altura en las tres hojas, así que el pase de una hoja a otra cae parejo.

## Problemas

| ID | Sev. | Problema | Detalle |
|---|---|---|---|
| F-04 | P1 | La página tarda en responder en celulares lentos | Ver `04-performance-audit.md`. Consecuencia en celular: **los toques antes de que cargue la página se pierden**. El test del menú falla de forma intermitente: en 2 de 4 corridas el menú no se abrió (`#float-menu` siguió oculto). |
| F-27 | P2 | El hero se ve vacío durante la carga | Ver 01. En 375 px los botones tienen opacidad 0 a los 300 ms. |
| F-08 | P2 | Contraste del verde | Texto blanco sobre #959571 da 3,08:1 en la barra de invitados (14 px), «Crear mi evento» (14–16 px), «Crear mi lista de regalos» (15 px) y los links del cierre (15 px). WCAG AA pide 4,5:1 para texto de menos de 18,66 px en negrita o 24 px normal. La dueña aceptó el contraste (2026-11-01); se documenta igual, porque afecta a personas con baja visión y en exteriores con brillo. |
| F-19 | P3 | Página larga | Entre 9 y 12 pantallas. Las hojas de Regalos ocupan 3 pantallas. Ver 01. |
| F-21 | P3 | El vidrio de la barra a veces no se activa | El test del header falla de forma intermitente (`backdrop-filter` en `blur(0px)` después de hacer scroll). El cálculo de `--p` depende del evento `scroll`, que con Lenis puede llegar tarde. |
| — | Info | «Iniciar sesión» solo está en el menú en celular | Es aceptable: «Crear mi evento» queda visible en la barra. Quien ya tiene cuenta necesita dos toques. |

## Navegación, header y footer en celular

- **Barra:** el logo y una píldora con «Crear mi evento» y el menú. Se queda pegada arriba con un margen de 8 px. Se oscurece al pasar el hero (`is-over-light`).
- **Menú:** panel de pantalla completa debajo de la barra, con tres filas grandes: «Hacé un regalo», «Crear mi evento», «Iniciar sesión». Se cierra con Escape y devuelve el scroll (test). Bloquea el scroll del fondo mientras está abierto.
- **Pie:** el logo y la misión centrados, links en dos filas, los legales con objetivos de 44 px.

## Lectura

- **Párrafos:** de 15,8 a 16 px en celular, con largo de línea de 30–40 caracteres. Es correcto para celular.
- **Títulos de las hojas de Regalos:** 30 px, que en 320 px ocupan 3 renglones («Sin comisión: el regalo entero es para ustedes»). Aceptable.
- **Cantidad visible por pantalla:** una idea por pantalla en Regalos, que es buena para escanear pero deja mucho vacío (F-19).

## Tablet

- **768–1024 px vertical:**
  - Regalos va en una columna centrada;
  - cada hoja mide como mucho 900 px (antes ocupaba la pantalla entera, hasta 1366 px);
  - «Todo para compartir» va en una columna de 520 px.
- **Horizontal (1133–1366 px):** usa el diseño de compu.
- **Panel de pago de «Sin comisión»:** se reubicó arriba para no tapar el monto.
