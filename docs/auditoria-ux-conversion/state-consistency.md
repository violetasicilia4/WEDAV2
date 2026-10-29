# Consistencia de estados

Auditoría del 2026-10-28. «Interfaz» = estado en el navegador (localStorage). «Servidor» = SQLite vía `/api`. Garantías marcadas como **faltan** no se simularon en la interfaz.

## Publicación

| Desde | Acción | Antes de la auditoría | Ahora | Garantía real |
|---|---|---|---|---|
| Sin cuenta, borrador | Publicar | Interfaz marcaba `publication.live = true`, cabecera «Publicada», «cualquiera con el link…» | Pide crear cuenta; nada cambia | — (no hay publicación sin servidor) |
| Sin cuenta, publicación local vieja | Abrir panel | «Publicada» | «Publicar» (se ignora la local) | — |
| Con cuenta, borrador | Publicar | Pausa de «pago» de 1,4 s y luego servidor | Servidor directo; si falla, se deshace y muestra el error | **Servidor**: snapshot + slug estable |
| Con cuenta, publicada | Editar | La pública no cambia; sin forma de actualizar | La pública no cambia hasta «Publicar los cambios» | **Servidor**: snapshot nuevo, mismo slug |
| Con cuenta, publicada | Bajar | Servidor `taken_down`; la pública avisa «no disponible» | Igual | **Servidor** |
| Con cuenta, dada de baja | Volver a publicar | Servidor `live` | Igual | **Servidor** |
| Publicada | Vence (6 meses) | La interfaz calcula «hasta el…» | Igual | **Falta**: el servidor no aplica vencimiento (D7) |

## Pago

| Estado | Antes | Ahora | Garantía real |
|---|---|---|---|
| Elegir plan | «Pagar ARS…» | «Precio ARS… · pago único», botón «Publicar» | **Falta** proveedor (D1) |
| «Pagado» | `publication.payments` mostrado como «Total pagado» | Ya no se muestra en ningún lado | **Falta**: solo un webhook del proveedor debe crear un pago `paid` |
| Pago rechazado / interrumpido | No existía | No existe | **Falta** (D1) |
| Doble clic | Botón deshabilitado durante la pausa | Botón deshabilitado y `pay()` ignora clics mientras publica | Servidor: publicar dos veces actualiza el mismo snapshot |

## Regalos (invitado → pareja)

| Desde | Acción | Ahora | Garantía real |
|---|---|---|---|
| Carrito | Enviar sin comprobante | Botón deshabilitado, «Para enviar falta: comprobante.» | **Servidor** rechaza `receipt_required` |
| Carrito | Corte de red al enviar | Error, reintentar con la misma clave | **Servidor**: idempotente; regalo y comprobante en un solo envío (nunca uno sin el otro) |
| Aporte | Confirmarlo sin comprobante | — | **Servidor** rechaza `receipt_required` |
| Aporte | Otro invitado elige el mismo regalo | «Ya elegido» | **Servidor**: `gift_taken` |

## Confirmación de asistencia

| Acción | Ahora | Garantía real |
|---|---|---|
| Confirmar | Servidor; el panel lo ve | **Servidor** |
| Cambiar la respuesta | Actualiza a la misma persona (nombre normalizado) | **Servidor** |
| Enviar dos veces | No duplica | **Servidor** + bloqueo de doble clic |
| Sin red | No simula el envío | — |

## Alta y cuenta

| Acción | Ahora | Garantía real |
|---|---|---|
| Registrarse con evento empezado | El borrador pasa a la cuenta | **Servidor** |
| Ingresar con otra cuenta que ya tiene casamiento | Abre el de la cuenta; el local queda aparte | **Servidor** |
| Volver atrás en el alta | Conserva lo cargado | Interfaz |
| Guardado que falla | Aviso + reintentar; no aparenta éxito | **Servidor** (revisión optimista) |
| Recuperar clave | No existe | **Falta** (D3) |
