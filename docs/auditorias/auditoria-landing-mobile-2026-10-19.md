# Weda · Landing en celular (2026-10-19)

Auditoría e implementación sobre el código existente (`src/routes/index.tsx`, `src/components/float-nav.tsx`, `src/components/landing-plans.tsx`, `src/styles.css`). Emulación de viewport en 320, 375, 390, 430 px, tablet (768, 1024) y escritorio (1440): **no se probó en dispositivos físicos ni en Safari iOS real**.

## Causas encontradas (observado a 390 px)

| Problema | Causa |
|---|---|
| Header tapaba contenido | `FloatNav` era `position: sticky` con `height: 0` y margen negativo: **no reservaba espacio** y flotaba sobre las secciones. Dos píldoras de 52 px (logo / botón + menú) a 8 px del borde (≈65 px) con ≈70 px entre ellas por donde se veía el contenido. |
| Aspecto impredecible | El fondo de las píldoras dependía del scroll (`--p`: transparente → 28 % blanco) y de la sección (`is-over-light`: 82 % oscuro), con sombra `0 6px 24px` y `blur(20px)`. |
| Riesgo de apilamiento | El menú desplegable es un hijo `position: fixed` del header: un `backdrop-filter` o `transform` en el header lo desancla del viewport. |
| Anclas | `scroll-padding-top: 80px` global, distinto de la altura real de la barra. |
| Hero | Altura con `lvh` (la pantalla sin la barra de Safari): el título de la sección siguiente quedaba bajo la barra del navegador. |
| Funciones | Tres contenedores grises de 343×343 (≈1.580 px en total), todos iguales. |
| Regalos | Fotos con proporciones mezcladas (343×215 y dos de 167×167). |
| Planes | Tarjetas de 546/625/546 px; «Ver todo lo que incluye» era texto subrayado; botón de 186 px de ancho; blanco sobre `#707d87` = 4,2:1. |

## Qué cambió (todo en `@media (max-width: 640px)`, al final de `styles.css`)

- **Header** (`.float-nav.is-landing`, clase nueva solo en la landing: `/encontrar` no cambia): una barra en el flujo, sticky arriba, de 48 px (antes ≈65 px, −26 %), logo a la izquierda y «Crear mi evento» + menú a la derecha. Fondo siempre igual (`#5a646c` al 97 %, texto blanco ≈6:1), sin sombras. El difuminado va en `::before` de la barra, no en el header. `env(safe-area-inset-*)` en padding (el sitio ya usa `viewport-fit=cover`). `html:has(.float-nav.is-landing) { scroll-padding-top }` para las anclas: sin márgenes sueltos por sección.
- **Hero**: mismo video y título; el texto es un solo bloque al pie, sobre una base oscura funcional (legibilidad); altura `100svh − 150 px` para que asome solo el título siguiente; botones de 48 px y enlace de 44 px. Subtítulo: «Creá tu lista de regalos, compartí tu sitio y organizá las confirmaciones de tus invitados.» (cambio de copy; también se ve en escritorio). El título «Tu gran día empieza acá.» no cambia (en una línea, definido antes; el pie lo repite como firma de marca).
- **Funciones**: gaps y contenedores más chicos; la lista de regalos conserva el contenedor completo con fondo cálido y título mayor; sitio y confirmación, 300 px.
- **Regalos**: «Una lista de regalos hecha para ustedes.» / «Desde ese viaje que sueñan hasta las cosas que quieren para su casa. Creen una lista a su manera y reciban los aportes directamente.» (también en escritorio); tres fotos con la misma proporción 4:3.
- **Testimonios**: tarjeta de 84 % (la siguiente asoma), la activa (`.is-on`, clase nueva) a opacidad plena y las demás atenuadas; puntos con zona de toque de 44 px; sin recortar ni cambiar textos.
- **Planes**: tarjetas verticales más compactas (477/529/478 px), «Todo lo de …» en tono secundario y lo que suma cada plan en peso 500, «Ver todo lo que incluye» como botón con «+», CTA a lo ancho al pie en `#66747f` (4,9:1). Precios, nombres y funciones intactos.
- **Footer**: curva superior de 24 px, igual que la sección de regalos.
- **Resultado**: la página pasa de 6.063 a 5.590 px aprox. (−8 %) a 390 px.

## Verificación

- `e2e/landing-mobile.spec.ts` (15 pruebas): dos píldoras transparentes arriba y de vidrio al scrollear, pegadas arriba; menú (se abre bajo la barra, Escape, devuelve el scroll); anclas bajo la barra; hero con el texto centrado, en una línea y botones ≥44 px; fotos 4:3; planes (precios, funciones, CTA al pie, desplegable); carrusel; sin scroll horizontal en 7 anchos; y una guarda de escritorio (barra con dos píldoras, título del hero de 66 px, padding de 72 px).
- Escritorio y tablet: comparación píxel a píxel de la página completa contra la versión anterior en 768, 1024 y 1440 px: **mismas alturas y diferencias solo en los dos textos cambiados** (subtítulo del hero y bloque de regalos).
- Corregido en el camino: reglas de celular que habían quedado dentro de un `@media (min-width: 901px)` (commits `b9c5b07` y `86b6d3b`) y afectaban al escritorio; ya corregido en `4d96fdc`.

## Pendiente y limitaciones

- No se probó en un iPhone real: la barra flotante de Safari, el cambio de altura al hacer scroll y el menú con teclado.
- Sigue pendiente (no corregido, por decisión de conservar la barra): el header flota sobre el contenido y puede tapar títulos al scrollear; las anclas ya lo respetan (`scroll-padding-top: 80px`).
- Blanco sobre `#707d87` (4,2:1) sigue en el footer, en la sección de regalos y en los botones de escritorio; en celular solo se corrigió el botón de los planes. Sugerido: usar `#66747f` (el tono de la invitación pública) también ahí. Decisión de identidad.
- El video del hero es más ancho que la pantalla por diseño (lo recorta el propio hero): no genera scroll.
- En pantallas apaisadas (más de 640 px de ancho) se mantiene el diseño anterior, sin la barra única.
- La firma del pie repite «Tu gran día empieza acá.»; se conservó como firma de marca.
