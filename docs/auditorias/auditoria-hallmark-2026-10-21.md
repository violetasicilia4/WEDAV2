# Weda · Auditoría integral con Hallmark (2026-10-21)

Alcance: todo el frontend existente (landing, registro y alta, panel, constructor, regalos, invitados y mesas, invitación pública, diálogos). Hallmark en modo `audit` (sin rediseño: es un prototipo con identidad ya definida) y Impeccable como criterio de producto. Prototipo frontend: sin backend, pagos ni publicación real.

## Método
- Git y documentación revisados antes de tocar nada; el árbol ya tenía cambios locales de la sesión (no se revirtió ninguno).
- Arnés temporal (`public/__audit.js`, **borrado**) que carga cada ruta en iframes de 320, 360, 390, 414, 440, 768, 820, 1024, 1280 y 1440 px y mide: desborde horizontal, elementos fuera del viewport, texto recortado y áreas táctiles < 44 px (cuenta el `::after` que agranda el toque). Luego, en el navegador integrado con emulación táctil (320, 375 px), se recorrieron los estados con diálogos: Editar datos, Publicar (tres productos, «Ver más», resumen), Vista previa, Crear regalo, las 5 pestañas de Regalos, Agregar/Importar/Editar invitado, Mesas, las 7 secciones de «Tu página», `/crear` (4 pasos) y la invitación pública con su menú.
- Para ver pantallas con contenido se cargó `seedState()` (14 invitados, regalos) y **se restauró** el estado previo al terminar.

## Hallazgos y correcciones
| # | Gravedad | Hallazgo | Corrección |
|---|---|---|---|
| 1 | Alta | `/panel/regalos` ensanchaba la página en el celular (373 px en un viewport de 320–375): las solapas con scroll lateral sumaban su contenido oculto al ancho del documento, y la columna del panel se agrandaba con el contenido mínimo de los botones | `.pn-page { grid-template-columns: minmax(0,1fr) }` (sin más ensanches por contenido), `.pn-fade { contain: paint }` y, en ≤ 349 px, los dos botones del encabezado se apilan |
| 2 | Alta (regresión propia, detectada acá) | La barra inferior con cinco accesos (se agregó «Publicar») hacía más ancha la pantalla | Columnas `minmax(0,1fr)`, márgenes y etiquetas con `ellipsis` en ≤ 420 px |
| 3 | Media | Áreas táctiles de 32–40 px: botones del encabezado de Regalos, casilla «Todavía no tenemos fecha», «Ver más» de los productos, «Quitar la foto», enlace «Ingresá», barra y menú del micrositio, barra flotante y puntos de testimonios de la landing, logo de la barra flotante | Pisos táctiles (`@media (pointer: coarse)`) en `panel.css`, `styles.css` y `ejemplo.css`; en barras con altura fija el área se amplía con `::after` sin cambiar lo que se ve |
| 4 | Media | El pop-up de vista previa del celular tenía 11 px de scroll interno (marco más alto que el espacio disponible) | Alto del marco `min(70dvh, 740px, 100dvh − 250px)` |
| 5 | Baja | En la invitación pública, el acceso «Volver al panel» usaba una X, igual al botón de cerrar el menú | Flecha atrás (`ArrowLeft`) |
| 6 | Baja | Acciones principales poco accesibles: «Publicar» solo aparecía dentro de Inicio | Botón «Publicar» fijo arriba a la derecha, junto a «Vista previa», en todo el panel, y botón en el menú (decisión de la autora; ver `ux-flows.md`) |

Sin hallazgos (medido): desborde horizontal en las 16 rutas × 10 anchos, errores de consola en las rutas principales, diálogos con acciones siempre visibles, Invitados y Mesas con 14 invitados, secciones del editor, `/crear/*`, y coherencia entre la ventana en vivo, el pop-up de vista previa y la invitación pública (los tres son el mismo componente renderizado por `/sitio/…`).

## Falsos positivos descartados
- La landing `/` mostraba desborde de una «Compatibilidad cognitiva»: eran restos de otra página guardados en la caché HTTP del navegador para ese origen. Con `cache: no-store` y con otra URL `/` es la landing de Weda y no desborda. No hay código de otro proyecto en el repo.
- `span.sr-only`, `.dm-sr`, `.pn-sr`: textos solo para lectores de pantalla, recortados a propósito.

## Pruebas ejecutadas
| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit` | sin errores |
| `npx vitest run` | 95 de 95 |
| `npm run build` | compila |
| Navegador integrado (táctil, 320 y 375 px; iframes de 320 a 1440 px) | sin desborde en las rutas medidas; sin errores de consola |
| Playwright (`e2e/`) | **No se pudo ejecutar**: no hay navegador instalado. Los selectores del botón «Publicar» de ambos specs se actualizaron (ahora hay dos botones; se apunta al de `.pn-top`) |

## Pendiente y límites
- Teclado virtual real, Safari iOS y dispositivos físicos: no probados (la emulación táctil del navegador integrado no reproduce `visualViewport` real).
- La emulación del panel recorta capturas a ~650 px de ancho útil: los anchos 768–1440 se validaron por medición, no por captura completa de cada pantalla.
- Observación de tipografía (no corregida, regla del proyecto): el comentario de cabecera de `src/typography.css` dice que Geist se usa «en landing, onboarding, panel y micrositios», pero el código asigna al micrositio Cormorant Garamond (`--iv-font`) y Arial, tal como describe `CLAUDE.md`. El que está desactualizado es ese comentario, no el comportamiento.
- Hallmark propone estructura y tema por brief; no se aplicó ninguna recomendación de rediseño de marca, para conservar la identidad actual.
- Impeccable avisa una versión nueva (v4.7.0): no se actualizó.
