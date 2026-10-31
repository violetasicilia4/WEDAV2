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
Tiene servidor propio (API `/api/*` con SQLite): cuentas con correo y clave, sincronización del borrador, publicación del sitio, confirmaciones y aportes con comprobante. Sin sesión, el borrador vive en el navegador (localStorage). No hay hosting de producción (DP-14) ni cobro real (DP-15): solo un adaptador de pagos de prueba. Estado completo en `docs/product-blueprint/`. El panel, el editor del micrositio y la página pública de cada pareja son superficies distintas de la landing comercial (ruta `/`).

## Capabilities and Constraints
- Planes (fuente única en `src/lib/weda/plans.ts`): Regalos ARS 95.000, Celebración ARS 140.000, Celebración Plus ARS 150.000, de pago único. En el código la página queda publicada 6 meses (2026-10-28); la decisión vigente es 12 meses con «pagar = activar + publicar» (2026-10-30), todavía no implementada. Precios definitivos pendientes (DP-17). No cambiar precios, nombres, duración ni prestaciones sin documentarlo.
- Los aportes de regalos se registran por alias, con comprobante, y la pareja los confirma a mano: Weda no verifica transferencias. El plan Regalos menciona «tarjeta», que no existe (DP-18, DP-20). No hay integración con Mercado Pago ni con otros medios de pago.
- Sin integraciones nuevas ni cambios al modelo de datos sin una decisión aprobada (ver `docs/data-architecture/`).
- No hay estadísticas ni métricas de uso reales.

## Brand Commitments
- Nombre y logo: Weda, con la marca de dos óvalos. Tipografía Geist en landing, onboarding y panel; el micrositio (`/ejemplo*`, `/sitio/*` y su maqueta en la landing) conserva Cormorant Garamond y Arial.
- Español rioplatense con voseo ("creá", "armá"). No nombrar el país de forma literal en la comunicación: el sello local se transmite con el tono, los pesos y las fotos.
- Fondo del hero en video (`/hero.mp4`) con póster; sección azul pizarra (#707d87) para regalos; papel cálido (#f3f0e8).
- Decisiones ya tomadas por la persona dueña: precios "de pago único"; sección azul de regalos con pasos en tarjetas blancas y el botón de crear la lista debajo; etiqueta "REGALOS" en mayúscula y título en un renglón; testimonios con presencia de pantalla completa.

## Evidence on Hand
- Testimonios de la landing en `src/lib/testimonials.ts`, cargados por la dueña (2026-10-29), que responde por su autenticidad y el permiso de cada pareja (DP-19). No agregar testimonios inventados.
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
