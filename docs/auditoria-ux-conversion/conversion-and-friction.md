# Conversión y fricción

Auditoría del 2026-10-28. Se separa lo **observado** (ejecutado en la app o en pruebas) de las **hipótesis** (requieren usuarios reales o analítica). No se estiman porcentajes de conversión.

## Recuentos medidos

### Camino mínimo: de la landing a la página publicada (con cuenta)
Medido por la prueba `e2e/audit.spec.ts` (K-01), que cuenta cada acción:

| Paso | Acciones |
|---|---|
| Landing → «Crear mi evento» | 1 toque |
| Cuenta: correo, clave, «Registrarme» | 2 campos + 1 toque |
| Nombres: dos nombres, «Continuar» | 2 campos + 1 toque |
| Fecha: dejarla vacía, «Continuar» | 1 toque |
| Foto: «Omitir por ahora» | 1 toque |
| Panel → «Publicar» → «Publicar Celebración» → «Publicar» | 3 toques |
| **Total** | **12 acciones** (4 campos, 8 toques), 5 pantallas + 1 diálogo, 1 decisión obligatoria (qué publicar) |

**Antes de la auditoría** (código del commit `bcf7fc4`; contado leyendo el flujo, **no medido** con una prueba): los mismos pasos, con «Pagar ARS…» en lugar de «Publicar» → también 12 acciones, pero sin cuenta terminaba en una publicación **falsa** (solo en ese navegador) y en un «pago» que no existía. La cantidad de acciones no cambió; cambió que ahora el resultado es real.

### Publicar cambios después de publicar
- **Antes:** no había camino. La única forma era «Bajar la página» → confirmar → «Volver a publicar» (4 toques, con la página caída en el medio) — y nada lo explicaba.
- **Ahora:** «Publicada» → «Publicar los cambios» (2 toques, la página nunca se cae). Medido en E2E T-02.

### Encontrar la lista de regalos como invitado
- **Antes:** escribir nombres → aparecían parejas inventadas → todas abrían la lista de ejemplo (camino engañoso).
- **Ahora:** pegar el link → «Abrir la invitación» (1 campo + 1 toque). Si no tiene el link: el texto le dice que se lo pida a los novios.

## Fricción observada

### A. Riesgo de abandono
- **Cuenta obligatoria al principio** (observado): el primer paso de «Crear mi evento» es registrarse. Para una pareja que solo quiere probar es una barrera; a cambio, todo lo que arma queda guardado y se puede publicar. *Hipótesis a medir:* abandono en `/crear/cuenta` (evento `signup_started` sin `signup_completed`).
- **Sin «¿Olvidaste tu clave?»** (observado): quien vuelve y no recuerda la clave no tiene salida en la app (solo escribir a hola@weda.app desde Perfil, que no ve si no entra).
- **Términos de uso inexistentes** (observado): el registro los menciona sin enlace.

### B. Clics de más
- **Onboarding de 4 pantallas** (cuenta, nombres, fecha, foto) antes del primer resultado. Fecha y foto son opcionales y se pueden saltear (1 toque cada una). *Propuesta (solo recomendada, no implementada):* nombres y fecha en una sola pantalla → 11 acciones en vez de 12, una pantalla menos. Riesgo: pantalla más cargada en celular de 320 px; la fecha sigue opcional. No se implementó porque el alta tiene muchas pruebas y validaciones propias y la ganancia es de una acción.

### C. Interacciones confusas (arregladas)
- Botones que prometían algo que no hacían: Google/Apple (F-03), «Cambiar» la clave sin cuenta (F-07).
- Mensajes de éxito que no correspondían a la operación real: «¡Pagaste tu plan!» (F-01), «Tu página está publicada» sin cuenta (F-02).

### D. Feedback faltante
- **Cambios sin publicar** (parcial): ahora se explica y hay botón (F-05), pero el panel no avisa *por sí solo* que hay cambios que los invitados todavía no ven. Requiere un dato del servidor (backend).
- **Correos** sin proveedor: el panel lo dice al pedir un comprobante («El envío de correos todavía no está configurado»).

### E. Carga cognitiva
- El diálogo de publicar muestra a la vez: qué se publica, qué queda vacío, qué queda como borrador, recomendaciones, plan, duración y precio. Es completo pero largo en celular. *Hipótesis:* plegar «Queda como borrador» y «Antes de publicar» cuando están vacíos ya ocurre; medir tiempo en el diálogo.

### F. Confianza y pago
- **No hay cobro** (F-06, backend D1). La interfaz ya no simula uno. Antes del lanzamiento comercial es el bloqueo principal.
- **Testimonios** sin respaldo verificable (F-10).

## Analítica mínima recomendada (no implementada: no hay analítica)

| Evento | Disparo | Propiedades | Etapa | Decisión que habilita | Privacidad |
|---|---|---|---|---|---|
| `landing_viewed` | carga de `/` | `referrer_type` (directo/ads/social), `device` | Adquisición | Qué canal trae visitas | Sin IP ni identificadores |
| `signup_started` | foco en el correo de `/crear/cuenta` | `device` | Registro | Cuánto pesa la cuenta obligatoria | — |
| `signup_completed` | respuesta 201 del servidor | — | Registro | Conversión del registro | Nunca el correo |
| `event_created` | nombres guardados en `/crear` | `has_date` | Alta | Abandono en el alta | Sin nombres |
| `gift_list_started` / `gift_list_completed` | primer regalo / alias cargado | `gift_count` | Regalos | Si la lista es el motor | Sin montos individuales |
| `microsite_editor_opened` | entrar a `/panel/sitio` | `section` | Sitio | Qué secciones se usan | — |
| `plan_selected` | elegir producto en Publicar | `plan_id` | Publicación | Qué producto prefieren | — |
| `checkout_started` / `payment_confirmed` | **solo** con proveedor real; `payment_confirmed` desde el webhook del servidor | `plan_id`, `amount` | Pago | Conversión de pago | Nunca datos de tarjeta |
| `publication_completed` | 200 de `/api/wedding/publish` | `plan_id`, `is_republish` | Publicación | Tiempo hasta publicar | — |
| `public_invitation_opened` | carga de `/sitio/:slug` | `slug_hash` | Invitados | Alcance real | Hash, no el slug |
| `rsvp_submitted` | 200 de `/rsvp` | `attending` | Invitados | Uso de la confirmación | Sin nombres ni correos |

Regla: los eventos de pago, publicación y confirmación se emiten **después** de la respuesta del servidor, nunca desde la interfaz antes de confirmar.
