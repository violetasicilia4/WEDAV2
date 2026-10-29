# Dependencias de backend y servicios externos

Auditoría del 2026-10-28. Lo que no se puede resolver del todo desde la interfaz. Para cada punto: qué existe hoy, qué garantía falta y qué API o estado haría falta. No se implementó arquitectura especulativa.

## Mapa de implementación (qué es real y qué no)

| Funcionalidad | Estado real |
|---|---|
| Cuenta con correo y clave (registro, ingreso, salida) | **Real** (servidor, SQLite, cookie httpOnly) |
| Guardar el casamiento en la cuenta y abrirlo en otro dispositivo | **Real** (`PUT /api/wedding`, revisión optimista) |
| Usar Weda sin cuenta | **Estado local** (localStorage de ese navegador) |
| Publicar / bajar / volver a publicar | **Real con cuenta** (`/api/wedding/publish`). Sin cuenta: ahora pide crear la cuenta (antes simulaba) |
| Página pública `/sitio/:slug` | **Real** (snapshot publicado) |
| Confirmación de asistencia del invitado | **Real** en sitios publicados; en `/ejemplo`, solo en la sesión del navegador |
| Regalo del invitado + comprobante | **Real** en sitios publicados (comprobante obligatorio, privado); en `/ejemplo`, solo en la sesión |
| Cobro del plan | **Falta**: no hay proveedor de pagos. Publicar hoy no cobra |
| Registro con Google / Apple | **Falta** (no hay OAuth). Los botones simulaban; se sacaron |
| Recuperar o cambiar la clave, cambiar el correo | **Falta** |
| Correos (constancia, pedir comprobante, baja) | **Real en código, sin proveedor configurado** (Resend; sin clave no sale nada) |
| Buscador de casamientos para invitados (`/encontrar`) | **Falta**: mostraba parejas inventadas; ahora deriva al link de los novios |
| Buscador de lugares (Google Places) | **Externo, real** (clave de navegador configurada) |
| Playlist de Spotify | **Externo, real** (reproductor embebido de Spotify) |
| Fotos | Se guardan dentro del borrador (sin almacenamiento de archivos aparte); límite de 6 MB por borrador |
| Analítica | **Falta** (no hay ninguna) |

## Dependencias por prioridad

### D1 — Proveedor de pagos (bloquea el lanzamiento comercial) · P0
- **Hoy:** el diálogo muestra el precio del plan y publica sin cobrar. Ya no dice «Pagar», «Pagaste» ni «Total pagado» (antes lo decía sin cobrar: confirmación de pago falsa).
- **Falta:** integración con un proveedor (por ejemplo Mercado Pago Checkout Pro), órdenes con estados `pending → paid | failed | cancelled`, webhook firmado que marque `paid`, y `WEDA_REQUIRE_PAID_ORDER=true` para que el servidor exija una orden pagada antes de publicar. Ya existen `/api/orders` (crea `pending`) y `POST /api/webhooks/payments` (responde 501).
- **Garantía esperada:** la interfaz solo muestra «pagado» cuando el servidor tiene una orden `paid` confirmada por el proveedor; un pago interrumpido o rechazado deja la orden `pending`/`failed` y la página sin publicar; reintentar no crea dos órdenes pagadas.

### D2 — OAuth (Google / Apple) · P2
- **Hoy:** sin botones (se sacaron porque no hacían lo que decían).
- **Falta:** flujo OAuth en el servidor (`/api/auth/google/callback`), vinculación con usuarios existentes por correo verificado.

### D3 — Recuperar clave, cambiar correo y clave · P1
- **Hoy:** Perfil dice «Cambiar el correo o la clave todavía no está disponible» con cuenta. No hay «¿Olvidaste tu clave?».
- **Falta:** tokens de un solo uso con vencimiento, enviados por correo (depende de D4).

### D4 — Proveedor de correo configurado · P1
- **Hoy:** código listo (Resend). Sin `RESEND_API_KEY` no sale nada y el panel lo avisa.
- **Falta:** cuenta, dominio verificado (SPF/DKIM) y variables en el hosting. Ver `docs/datos-personales.md`.

### D5 — Búsqueda de casamientos para invitados · P2
- **Hoy:** `/encontrar` ya no muestra parejas inventadas: indica usar el link de los novios.
- **Falta:** decisión de privacidad (¿se puede buscar a una pareja por nombre?) y un endpoint de búsqueda sobre publicaciones con opt-in de la pareja.

### D6 — Almacenamiento de fotos · P2
- **Hoy:** las fotos viajan dentro del borrador (data URL). Con muchas fotos se llega al límite (6 MB) y al límite del navegador sin cuenta.
- **Falta:** subida a un almacenamiento de archivos con URLs firmadas o públicas, y miniaturas.

### D7 — Vencimiento de la publicación · P2
- **Hoy:** la interfaz muestra «publicada hasta» (6 meses) calculado en el cliente; el servidor no aplica vencimiento (`expires_at` NULL).
- **Falta:** guardar `expires_at` al publicar y que `/api/public/:slug` responda «vencida» después.

### D8 — Analítica de embudo · P2
- Ver `recommended-priorities.md` y `conversion-and-friction.md` (plan mínimo de eventos). No se emitió ningún evento.

### D9 — Envío programado de recordatorios · P3
- **Hoy:** «Pedir comprobante» es manual (la pareja lo toca). Con la regla nueva (sin comprobante no hay regalo) casi no hace falta.
