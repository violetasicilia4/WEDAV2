# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Parejas jóvenes (aprox. 22 a 35 años) que se casan y esperan buen diseño y una experiencia digital cuidada. Hacen el trabajo de armar la invitación, la lista de regalos y la gestión de invitados, casi siempre desde el celular. Sus invitados (familia y amigos) entran con un link para ver los datos, confirmar asistencia y regalar.

## Product Purpose
Weda es una plataforma para crear la invitación digital de un casamiento: micrositio personalizado, lista de regalos, confirmación y gestión de invitados e información práctica del evento. Éxito: la pareja arma su evento gratis, lo siente propio y lo publica; sus invitados lo entienden sin explicaciones.

## Positioning
La lista de regalos digital es el diferencial comercial principal y va unida al micrositio: regalos, sitio y confirmaciones viven en el mismo lugar y se comparten con un link. El tono es de producto moderno con criterio estético, no de plantilla SaaS, agencia de marketing ni organizador de bodas tradicional.

## Operating Context
Es una demo sin backend: el estado se guarda en el navegador (localStorage). La publicación y el pago todavía no están conectados. El panel, el editor del micrositio y la página pública de cada pareja son superficies distintas de la landing comercial (ruta `/`).

## Capabilities and Constraints
- Planes (fuente única en `src/lib/weda/plans.ts`): Regalos ARS 95.000, Invitación ARS 180.000, Completo ARS 320.000, en pago único. No cambiar precios, nombres ni prestaciones sin documentarlo.
- La lista de regalos recibe por alias y tarjeta. No hay integración con Mercado Pago ni con otros medios de pago.
- Sin backend, sin integraciones nuevas, sin cambios al modelo de datos.
- No hay estadísticas ni métricas de uso reales.

## Brand Commitments
- Nombre y logo: Weda, con la marca de dos óvalos. Tipografía Geist en landing, panel y micrositios (Cormorant Garamond solo en la maqueta del sitio del casamiento).
- Español rioplatense con voseo ("creá", "armá"). No nombrar el país de forma literal en la comunicación: el sello local se transmite con el tono, los pesos y las fotos.
- Fondo del hero en video (`/hero.mp4`) con póster; sección azul pizarra (#707d87) para regalos; papel cálido (#f3f0e8).
- Decisiones ya tomadas por la persona dueña: precios "de pago único"; sección azul de regalos con pasos en tarjetas blancas y el botón de crear la lista debajo; etiqueta "REGALOS" en mayúscula y título en un renglón; testimonios con presencia de pantalla completa.

## Evidence on Hand
- Cuatro testimonios en `src/routes/index.tsx`, con parejas y fotos ficticias (`/parejas/*`). Son de demostración: no presentarlos como evidencia real de clientes.
- Sitio de ejemplo navegable en `/ejemplo` (pareja ficticia Tomás y Martina) y fotos de portada propias.
- No hay métricas, números de parejas ni prensa. No inventarlos.

## Product Principles
1. La lista de regalos es parte del núcleo de la propuesta, no una función más de una lista.
2. Mostrar el producto real (regalos, sitio, confirmación) antes que describirlo.
3. Un camino claro: probar gratis, armar el evento y recién después elegir plan.
4. No prometer lo que el producto todavía no hace.
5. Menos texto: lo que el diseño puede comunicar no se explica con párrafos.

## Accessibility & Inclusion
Respetar prefers-reduced-motion y ahorro de datos (ya implementado en el video del hero). Contraste legible, objetivos táctiles cómodos en celular y sin scroll horizontal.
