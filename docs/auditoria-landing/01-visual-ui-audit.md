# 01 · Auditoría visual y de UI

Base: el estado local actual. La landing tiene estas secciones:

1. Barra de invitados.
2. Hero con video.
3. «Todo para compartir».
4. Regalos, como tres hojas apiladas.
5. Testimonios.
6. Planes.
7. Cierre verde.
8. Pie.

Se midió en 9 anchos: 320, 360, 375, 390, 414, 430, 768, 1024 y 1440 px.

## Lo que está bien resuelto

- **Una sola tipografía (Geist)**, con títulos de tracking cerrado (−0,02 a −0,03 em) e interlineado corto (1,02–1,1). El hero tiene una jerarquía clara: título de 72 px y bajada de unos 20 px en compu; 33,5 px y 15,8 px en un iPhone de 390 px.
- **El ritmo de secciones es claro**:
  - fondos alternados: blanco, gris #f6f7f8 en Regalos, blanco en Testimonios, gris en Planes, verde en el cierre y oscuro en el pie;
  - padding de 60 px en compu y 40 px en celular;
  - ancho de contenido de hasta 1200 px.
- **Maquetas del producto real** («Hacer un regalo», filtros por monto, «Regalos recibidos») en lugar de iconos o ilustraciones. Es la decisión visual más fuerte de la página.
- **Sin overflow horizontal** en ningún ancho, y ninguna maqueta pisa su título (medido).
- **Foco visible** en todos los elementos al recorrer la página con Tab (medido sobre los primeros 14 elementos enfocables).

## Hallazgos

### F-15 · El CSS de la landing está muy fragmentado y se pisa a sí mismo
| Campo | Detalle |
|---|---|
| Categoría | UI / sistema de diseño / mantenibilidad |
| Severidad | P2 |
| Página / componente | `src/styles.css`, `src/gift-mocks.css` |
| Dispositivo | Todos |
| Problema | El estilo se fue armando agregando bloques al final que pisan los anteriores. No hay una escala de tokens para tamaños, radios, sombras ni colores. |
| Evidencia | `styles.css` tiene 1792 líneas, **81 valores distintos de `font-size`**, **31 de `border-radius`**, **36 de `box-shadow`**, **56 colores hex** y 16 `!important`. `.seed-hero .hero-copy h1` se redefine 16 veces y `.feat-card` aparece en 71 reglas. En esta misma sesión hubo varios casos de reglas que no aplicaban por especificidad o por orden, por ejemplo los ajustes de celular de «Regalos recibidos» y el `a:not(.seed-button)` del hero. |
| Impacto en el usuario | Indirecto: inconsistencias pequeñas (botones de 36, 44 y 52 px; radios de 8, 12, 14, 16, 20, 24 y 28 px) y regresiones al tocar una sección. |
| Impacto comercial | Hipótesis: cada cambio de diseño cuesta más y rompe otra cosa. Eso frena la iteración sobre la conversión. |
| Recomendación | Definir 5–6 tamaños de letra, 3 radios (8, 16 y píldora), 2 sombras («flota» y «diálogo») y una paleta con nombre. Después consolidar los bloques por sección. Sin cambiar el aspecto: es una refactorización visual neutra. |
| Esfuerzo | M–L |
| Dependencias | Tests de la landing (16) como red de seguridad; capturas antes y después. |
| Criterio de aceptación | Una sola definición por selector principal. Como mucho 8 tamaños de letra, 4 radios y 3 sombras en la landing. Capturas antes y después idénticas en 390 y 1440 px. |

### F-27 · La animación de entrada del hero oculta el título y los botones mientras carga
| Campo | Detalle |
|---|---|
| Categoría | Animación / conversión |
| Severidad | P2 |
| Página / componente | Hero (`hero-copy-in`) |
| Dispositivo | Sobre todo celular con red o CPU lentas |
| Problema | Título, bajada y botones entran con un fundido escalonado. Durante la carga se ven semitransparentes o directamente no se ven. |
| Evidencia | En el sitio publicado, a los 300 ms el título está en opacidad 0,33 y los botones en **0**. Recién a los 1,5 s se ven completos (medido en 375 px). La captura de la dueña del 2026-11-03, tomada mientras la página cargaba, muestra el hero sin botones. |
| Impacto en el usuario | Lo primero que ve no tiene acción. Si la carga se demora, la página parece incompleta. |
| Impacto comercial | Hipótesis: menos toques tempranos en el CTA principal. |
| Recomendación | Mostrar el texto y los botones desde el primer cuadro y animar solo el video o la portada. Si se quiere animar, que sea un desplazamiento corto sin pasar por opacidad 0. |
| Esfuerzo | S |
| Dependencias | Ninguna |
| Criterio de aceptación | En el primer pintado (FCP) los botones del hero ya tienen opacidad 1. |

### F-16 · Testimonios sin título de sección y con un rótulo en mayúsculas chicas
| Campo | Detalle |
|---|---|
| Categoría | UI / accesibilidad |
| Severidad | P3 |
| Página / componente | Testimonios (`.tq`) |
| Dispositivo | Todos |
| Problema | La sección se identifica con «/TESTIMONIOS», un `<p>` de 13 px en mayúsculas con espaciado, encima de una línea. No hay `h2`. |
| Evidencia | El esquema de títulos medido salta de los `h2` de Regalos al `h2` de Planes sin pasar por Testimonios. |
| Impacto en el usuario | Lector de pantalla: la sección no aparece en la navegación por títulos. Visual: es el único rótulo de ese estilo en la página. |
| Impacto comercial | Bajo. |
| Recomendación | Un `h2` visible en el estilo de los demás («Lo que dicen las parejas»), o un `h2` solo para lectores de pantalla si se quiere mantener la composición. |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | Testimonios aparece en el esquema de títulos como `h2`. |

### F-19 · Celular: página muy larga y paneles de Regalos con espacio vacío debajo
| Campo | Detalle |
|---|---|
| Categoría | Layout / ritmo |
| Severidad | P3 |
| Página / componente | Regalos (hojas apiladas) y página en general |
| Dispositivo | Celular |
| Problema | La página mide entre 9 y 12 pantallas en celular. Las tres hojas de Regalos ocupan una pantalla entera cada una (unos 2.500 px). Debajo del texto de cada hoja quedan entre 100 y 250 px vacíos. |
| Evidencia | Medido: 11,8 pantallas en 320×568, 9 en 390×844 y 8,5 en 430×932. Espacio bajo el texto: 231, 175 y 98 px en 390×844. |
| Impacto en el usuario | Recorrido largo hasta Planes y el cierre. El vacío puede leerse como «terminó la página». |
| Impacto comercial | Hipótesis: menos parejas llegan a Planes. |
| Recomendación | Mantener el efecto de hojas, pero dejar que cada hoja mida lo que mide su contenido más un margen (alrededor del 80% de la pantalla). Revisar si «Todo para compartir» (1645 px en celular) puede mostrar sus tres demos en un carrusel horizontal o más compactas. |
| Esfuerzo | M |
| Dependencias | Probar en iPhone real, por el `position: sticky` de Safari. |
| Criterio de aceptación | Como mucho 7 pantallas en 390×844, sin perder el apilado. |

### F-22 · Los «Regalar» de la demo parecen botones, pero llevan al registro
| Campo | Detalle |
|---|---|
| Categoría | UI / expectativa |
| Severidad | P3 |
| Página / componente | «Todo para compartir» → tarjeta Lista de regalos |
| Dispositivo | Todos |
| Problema | La tarjeta entera es un link a `/crear/cuenta`. Adentro hay pastillas «Regalar» con forma de botón. |
| Evidencia | Al recorrer los links, el nombre accesible incluye «$ 120.000 Juego de ollas Regalar…». La demo es `aria-hidden`, pero visualmente invita a regalar. |
| Impacto en el usuario | Una novia que toca «Regalar» termina en «¡Bienvenidos! Registrate». Hay una pequeña sorpresa. |
| Impacto comercial | Bajo. |
| Recomendación | Que la tarjeta muestre que lleva a crear la lista (un «Crear mi lista →» al pie) o que las pastillas no parezcan botones. |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | No hay controles con forma de botón dentro de una tarjeta-link. |

## Tipografía

- **Familia:** Geist en toda la landing. Las maquetas del micrositio usan Cormorant Garamond, y las comillas del testimonio usan Georgia (el único uso de Georgia).
- **Brief:** pide Instrument Serif y DM Sans, que no existen en el proyecto (ver F-20 en 06).
- **Escala visible en compu:** 72 / 48 / 36 / 34 / 22 / 18 / 15 / 14 / 13 / 12 px. Son 10 escalones; la referencia de la skill es 5. Ver F-15.
- **Párrafos:** de 16 a 18 px con interlineado de 1,45 a 1,55, y largo de línea de 32 a 34 em en los bloques de Regalos. Correcto.
- **Mínimo fuera de las maquetas:** 12 px, en los textos legales y el contador «01 / 04». Aceptable.

## Componentes

| Componente | Observación |
|---|---|
| Botón principal | El verde #959571 con texto blanco aparece en tres alturas: 44 px en el hero, 48 px en Regalos y 52 px en celular en «Todo para compartir». En el cierre es blanco con texto oscuro. Conviene unificar dos tamaños: barra y cuerpo. |
| Botón secundario | En el hero, «Ver ejemplo» es un link subrayado con flecha. En `/lista-de-regalos` usa el mismo patrón. Es consistente. |
| Flechas del carrusel | 44×44 px con fondo crema (`var(--section)`). Es el único uso de ese crema en una sección blanca. |
| Tarjetas de planes | Fondo blanco sobre gris, radio de 24 px, sin botón (ver F-12). |
| Barra flotante | Píldoras de vidrio (`backdrop-filter`), que se oscurecen al pasar el hero. El estilo de vidrio a veces no se activa al hacer scroll (ver F-21). |
| Sombras | Las maquetas usan sombras de 40 px para «flotar» y las hojas de Regalos una sombra superior. Está bien usado; el problema es la cantidad de variantes (36). |

## Responsive (resumen; detalle en 03)

- Sin overflow de 320 a 1440 px, ni en la landing ni en `/lista-de-regalos`.
- En tablet vertical (768–1024 px) Regalos pasa a una columna con el texto centrado. Las tres demos de «Todo para compartir» miden hasta 520 px de ancho, centradas.
