# Integración de pagos

Estado al 2026-10-29. **Hay arquitectura y adaptador de prueba; no hay proveedor real.** No existe cuenta comercial ni credenciales de Mercado Pago u otro proveedor, así que no se intentó una integración real ni se simula que exista.

## Qué está implementado y probado

| Pieza | Dónde | Pruebas |
|---|---|---|
| Orden asociada al casamiento (y por él, al usuario), con plan, monto y moneda (ARS) | tabla `orders`; `startCheckout` en `service.ts` | `payments-flow.test.ts` |
| Monto calculado en el servidor (precio del plan, o la diferencia si mejora); el precio que mande el navegador se ignora | `startCheckout` | «el monto lo pone el servidor» |
| Doble clic / recarga / volver atrás: reusa la orden pendiente del mismo plan y monto | `startCheckout` | «un doble clic reusa la orden» |
| Estados inequívocos: `pending`, `paid`, `failed`, `cancelled` | `orders.status` (CHECK) | varios |
| Notificaciones del proveedor verificadas (firma HMAC en el adaptador de prueba) | `POST /api/webhooks/payments/:provider` → `handlePaymentNotification` | «firma inválida no cambia nada» |
| Idempotencia de notificaciones: cada evento se procesa una vez | tabla `payment_events` (PK provider + event_id) | «repetida no se procesa dos veces» |
| Una orden cerrada no cambia por un evento posterior contradictorio | `handlePaymentNotification` | «no despaga» |
| Publicar exige pago confirmado (con proveedor configurado) | `entitledPlan` + `requirePaidOrder` | «sin pago confirmado no se publica» |
| La vuelta del navegador no es prueba de pago | `/panel/pago` consulta `GET /api/orders/:id` | E2E `payments.spec.ts`, «llegar sin pagar sigue pendiente» |
| Recuperar una operación interrumpida | `/panel/pago?orden=` vuelve a consultar; «Revisar de nuevo» | E2E |
| Pago separado de publicación | `/panel/pago`: «Pago confirmado» → «Publicar mi página» (acción aparte) | E2E |
| Trazabilidad casamiento → orden → publicación | `orders.wedding_id`, `payment_events.order_id`, `funnel_events` (`payment_confirmed`, `publication_completed`) | `funnel.test.ts` |
| Sin claves privadas en el frontend; sin datos de tarjeta | El navegador solo recibe la URL del checkout | revisión de código |
| Otra pareja no ve ni completa órdenes ajenas | `orderStatus`, `completeTestPayment` | «otra pareja…» |

## Adaptador de PRUEBA (`WEDA_PAYMENTS_PROVIDER=test`)
- `/pago-de-prueba?orden=…` muestra un aviso grande «PAGO DE PRUEBA · No es un pago real», el monto y tres botones: Aprobar, Rechazar o Cancelar (prueba).
- Los botones llaman a `POST /api/test-payments/:id`. El servidor arma una notificación **firmada** y la procesa por la misma vía que una real.
- Sin `WEDA_PAYMENTS_PROVIDER=test`, esas rutas responden 404.
- **Nunca debe estar activo en producción.** Está en `deployment-checklist.md`.

## Flujo en la interfaz
1. «Publicar» → elegir producto → revisión.
2. Sin el plan pagado: **«Ir a pagar ARS …»**. El servidor crea o reusa la orden, y el navegador va al checkout.
3. El proveedor vuelve a `/panel/pago?orden=…`, que consulta al servidor:
   - **pendiente:** «Esperando la confirmación del pago». Reintenta solo unas veces y tiene «Revisar de nuevo».
   - **pagado:** «Pago confirmado» y el botón «Publicar mi página».
   - **rechazado o cancelado:** un mensaje y «Volver a intentar».
4. **Sin proveedor configurado:** el botón dice «Publicar» y publicar no cobra. Es el comportamiento actual en producción hasta integrar un proveedor.

## Pendiente para un proveedor real (Mercado Pago Checkout Pro, si se elige)
- **Bloqueado por credenciales y decisión comercial:** la cuenta de vendedor y las credenciales (Access Token, Public Key, clave secreta de webhooks), la moneda y la facturación.
- **Adaptador `mercadopago` en `src/server/payments.ts`**, con las mismas dos operaciones:
  - `checkoutUrl`: crear una preferencia con `external_reference = order.id`, `back_urls` hacia `/panel/pago?orden=…` y `notification_url` hacia `/api/webhooks/payments/mercadopago`. Devolver el `init_point`.
  - `verify`: validar la firma `x-signature` / `x-request-id` según la documentación oficial vigente. Después, **consultar el pago a la API del proveedor** para leer `status` y `external_reference`, y no confiar solo en el cuerpo de la notificación. El `event_id` sale del id de la notificación.
- Ampliar `WEDA_PAYMENTS_PROVIDER` para aceptar `mercadopago` y las variables `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`.
- **Estados del proveedor:** traducir `approved` a `paid`, `rejected` a `failed`, y `cancelled` o `expired` a `cancelled`. `in_process` y `pending` quedan como `pending`.
- **Reembolsos y contracargos:** falta la decisión comercial y el estado `refunded`, que hoy no existe.
- **Pruebas con el sandbox del proveedor:** credenciales de prueba y una URL pública para el webhook (por ejemplo, un túnel).

## Pruebas
- **Servidor:** `src/test/server/payments-flow.test.ts`, 6 pruebas.
- **Navegador:** `e2e/payments.spec.ts`. Necesita un servidor con `WEDA_PAYMENTS_PROVIDER=test` en `WEDA_PAY_URL`; sin esa variable se saltea y lo dice.
