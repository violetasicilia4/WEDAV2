# Remediación post-auditoría

2026-10-29. Sobre la auditoría del 2026-10-28 (sin rehacer los 100 escenarios). **Sin commits, push, despliegues ni pagos reales.** Todos los cambios quedan sin commit en `main`, junto con los de la auditoría.

## A · Línea base confiable

**Causa de la intermitencia del alta, encontrada y corregida:**
- **Qué pasaba:** al tocar «Continuar» o «Registrarme» antes de que la página terminara de activarse (hidratación de React), el navegador hacía un envío nativo del formulario y **recargaba la misma pantalla**. En el log se ve como «navigated to /crear/fecha» mientras la prueba esperaba `/crear/foto`.
- **Por qué era más frecuente en desarrollo:** el servidor de desarrollo compila cada pantalla la primera vez, y eso ensancha la ventana. En el build de producción pasó 1 vez en 146.
- **Arreglo:** un script en el `<head>` frena el envío nativo hasta hidratar (`html[data-hydrated]`). Además, los botones del alta y del registro quedan deshabilitados hasta ese momento. Las pruebas esperan solas a que el botón se habilite. **No se agregaron reintentos.**
- **No era solo de las pruebas:** también le pasaba a personas con celulares lentos, que tocaban y «no pasaba nada».
- **Prueba de regresión:** `e2e/remediation.spec.ts`, «tocar Continuar antes de que la página esté activa», que demora el JavaScript a propósito.

**Contra el build de producción** (`node .output/server/index.mjs`, sin clave de Google):

| Corrida | Resultado | Fallas |
|---|---|---|
| Línea base (build anterior a estos cambios) | 143/146 en 13,5 min | K-01 (espera mal hecha en la prueba), enlace del hero de 43,99 px (real, por debajo del mínimo táctil), 1 demora del alta (el problema de hidratación) |
| Final (con todo lo nuevo) | **149/151** en 8,3 min | Selector ambiguo en «Por qué Weda» (prueba) y carrera en `save-the-date-order` (la prueba leía la página pública antes de que terminara el guardado diferido) |
| Reintento de los dos archivos, después de corregir las pruebas | 25/25 | — |
| Repetición ×3 de `save-the-date-order` + `remediation` | 42/42 | Sin intermitencias |

En la corrida final no hubo ninguna demora del alta.

## B · Cuenta, recuperación y correo
- Recuperar la clave completo, en servidor y pantallas. Detalle: `auth-and-email.md`.
- Adaptador de prueba de correo (`testOutbox`), usado solo por las pruebas automáticas.
- Perfil enlaza «pedí un enlace por correo».
- Google y Apple **no** se reactivaron; lo que falta está documentado.

## C · Legal y comercial
- **`/terminos`:** borrador nuevo. Lo pendiente queda marcado en la página («a completar» o «decisión pendiente») y no se indexa.
- **Enlaces:** desde el registro y desde el pie de la landing («Términos de uso · Privacidad»).
- **Testimonios:** el propio código decía «Parejas ficticias… nombres y fotos inventados». Se reemplazaron por «/Por qué Weda», con 4 funciones reales, sin nombres ni fotos de parejas. La prueba de la landing se actualizó.

## D · Pagos y publicación
- Arquitectura con un adaptador de **prueba**. Detalle: `payment-integration.md`.
- Pantallas nuevas: «Ir a pagar» (solo con proveedor), `/panel/pago` y `/pago-de-prueba`.
- Sin proveedor configurado, todo queda como antes: publicar no cobra.

## E · Fotos y vencimiento
- **Fotos:** se guardan como archivos en el servidor (`media.ts`, `/api/media/<sha256>.<ext>`). Se valida que sean imágenes de verdad y que no superen 4 MB por foto. Se ven desde cualquier dispositivo y la página publicada no guarda las fotos embebidas.
- **Vencimiento:** lo aplica el servidor, 6 meses desde la primera publicación en UTC.
  - Publicar cambios no lo extiende.
  - Vencida, la página pública muestra «Esta invitación ya no está disponible», y las confirmaciones y los regalos responden `site_expired`.
  - No se reabre sola y no se borra nada.
  - Las publicaciones anteriores al cambio calculan su fecha desde la primera publicación.

## F · Analítica mínima
- **`funnel_events`** (migración 6). El servidor registra:
  - `signup_completed`;
  - `payment_confirmed`, solo desde la notificación verificada;
  - `publication_completed`;
  - `rsvp_submitted`;
  - `gift_submitted`;
  - `public_invitation_opened`.
- **Eventos del navegador** (`src/lib/analytics.ts`):
  - visita a la landing, inicio del registro, evento creado, lista de regalos empezada y completa, sitio completo, plan elegido y checkout iniciado;
  - apagados salvo `VITE_ANALYTICS=on`;
  - el servidor acepta solo la lista cerrada y descarta las propiedades que no están permitidas (correos, nombres).
- **Pendiente:** no hay tablero ni proveedor externo; los eventos se consultan con SQL. No se afirma que se esté recibiendo ningún dato: con la analítica apagada no se manda nada.

## Otros
- **Enlace «Ver ejemplo» del hero:** `min-height: 44px`, porque medía 43,99 px en producción.
- **Lint:** se resolvieron los 2 errores previos de `action-fuzz.spec.ts`. Queda 0 errores y los mismos 10 avisos de antes.

## Archivos
- **Nuevos:**
  - `src/server/payments.ts` y `src/server/media.ts`;
  - `src/lib/analytics.ts` y `src/lib/analytics-events.ts`;
  - rutas `clave.index.tsx`, `clave.nueva.tsx`, `terminos.tsx`, `panel.pago.tsx` y `pago-de-prueba.tsx`;
  - pruebas del servidor `password-reset`, `payments-flow`, `expiry`, `media` y `funnel`;
  - pruebas de navegador `e2e/remediation.spec.ts` y `e2e/payments.spec.ts`;
  - 5 documentos en esta carpeta.
- **Modificados:**
  - servidor: `service.ts`, `api.ts`, `db.ts` (migraciones 4 a 6), `config.ts`, `mail.ts` y `public.ts`;
  - interfaz: `publish-dialog.tsx`, `remote.ts`, `site-providers.tsx`, `public-api.ts`, `__root.tsx`, `onboarding.tsx`, `crear.cuenta.tsx`, `crear.index.tsx`, `panel.tsx`, `panel.perfil.tsx` e `index.tsx`;
  - estilos: `styles.css` y `panel.css`;
  - configuración: `.env.example` y `.gitignore`;
  - pruebas existentes: `landing-mobile`, `save-the-date-order`, `action-fuzz` y los ayudantes de las pruebas del servidor.
