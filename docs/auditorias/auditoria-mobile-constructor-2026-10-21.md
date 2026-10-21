# Weda · Auditoría mobile del constructor y del recorrido (2026-10-21, sesión parcial)

Método: inspección de código, skill Impeccable (product, adapt) y un arnés temporal (ya borrado) que cargaba cada ruta en un iframe del ancho a evaluar y medía desborde, objetivos táctiles, texto chico y etiquetas. Navegador integrado del escritorio (emulación táctil, no dispositivos físicos). Playwright sin navegador instalado: los e2e se actualizaron pero NO se ejecutaron.

## Hecho (verificado en el navegador, `tsc` y vitest en verde)
| Hallazgo | Cambio | Evidencia |
|---|---|---|
| La «tarjeta en vivo» era una segunda implementación: mostraba «Tomás & Martina» y la fecha larga; la página real dice «Tomás y Martina» y «17 . 04 . 27», con otra tipografía | Ahora es una **ventana de la página real** (iframe `/sitio/…?ventana`, sin barra ni pie), alineada a la sección y al evento abierto; solo para mirar. Sin marco de teléfono | Texto y tipografía idénticos; se refleja lo escrito en ~185 ms |
| La zona fija ocupaba 35 % del alto (41–57 % con teclado) y la tarjeta tenía scroll interno (106–186 px de 581) | Ventana de 140–200 px; con teclado abierto 96 px («compact») o solo una tira de 45 px («tight»); sin scroll interno | Medido a 844, 560 y 440 px de alto |
| Pestañas de Regalos desbordaban en todos los anchos (320–600 px): la última quedaba oculta | Centrado de la pestaña activa y borde desvanecido donde hay más (`useScrollFade`); se quitó `scroll-snap` que impedía mover la fila | Tras elegir «Cobro» queda visible |
| Chips de «Tu página»: estado solo por color de un punto | Ícono de estado (tilde / aviso / ojo tachado) + color; chips de 44 px; el activo se centra | Verificado |
| 30 objetivos táctiles de 32–40 px | Piso táctil único al final de `panel.css` para `pointer: coarse` | Quedaron 7 antes del último ajuste (`.is-small`, selects); ajuste aplicado, sin re-medir |
| Campos de registro y alta con etiqueta no asociada (`ac-email`, `ac-pass`, `on-first…`, `on-date`, `on-place`) | `Field` acepta `id`; las etiquetas apuntan al input | `tsc` OK; **sin re-medir en el navegador** |
| Sin desborde horizontal en `/panel`, `/panel/sitio` (7 secciones), `/panel/regalos` (5 pestañas), `/panel/invitados` (+ mesas), `/panel/vista-previa` y `/crear/cuenta`, `/crear` en 320–600 px | — | Arnés |

## Pendiente (no se alcanzó)
- Re-medir: piso táctil final y etiquetas del alta (`/crear/*`).
- Recorrer `/crear/fecha`, `/crear/foto`, Invitados (alta, filtros), diálogos (planes, datos, vista previa) y la vista previa a pantalla completa en 320–440 px.
- Pasada de escritorio en 768, 820, 1024, 1280 y 1440 px de todo el panel (solo se vio el editor a 1440 px).
- Teclado virtual real (iOS/Android) y dispositivos físicos: nada probado.
- Documentar el patrón nuevo en `design-system.md` / `ux-flows.md` (el texto vigente aún describe la tarjeta `lc-*`).
- Impeccable avisa de una versión nueva (v4.7.0): no se actualizó.
