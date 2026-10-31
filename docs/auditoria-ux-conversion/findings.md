# Registro de hallazgos

> **Documento histórico.** Describe el estado de su fecha y no se actualiza. Parte de lo que dice ya no es cierto (algunos hallazgos ya se resolvieron total o parcialmente). Estado vigente: [docs/product-blueprint/](../product-blueprint/00-product-blueprint.md) (2026-10-31).

Auditoría del 2026-10-28. Ordenados por severidad. «Arreglado» solo cuando hay cambio en el código **y** prueba que lo cubre (ver `test-results.md` para el resultado de la corrida final).

Severidad: **P0** crítico (seguridad, privacidad, pérdida de datos, confirmación de pago falsa) · **P1** alto (impide o engaña en un recorrido esencial) · **P2** medio (confusión o fricción importante) · **P3** bajo.

| ID | Sev. | Persona | Dónde | Resumen | Estado |
|---|---|---|---|---|---|
| F-01 | P0 | J, N, O | `publish-dialog.tsx` | Confirmación de pago falsa: «Pagar ARS…», «Procesando el pago…», «¡Pagaste tu plan!», «Total pagado» sin ningún cobro | Arreglado |
| F-02 | P0 | J, K, T | `publish-dialog.tsx`, `panel.tsx` | Sin cuenta, «Publicar» marcaba la página como publicada y decía «cualquiera con el link la puede abrir», pero solo existía en ese navegador | Arreglado |
| F-03 | P1 | J | `crear.cuenta.tsx` | «Registrarme con Google / Apple» no registraba con Google ni Apple (seguía sin cuenta) | Arreglado (botones quitados) |
| F-04 | P1 | P | `/encontrar` | El buscador de invitados mostraba parejas inventadas que abrían la lista de ejemplo, sin aviso | Arreglado |
| F-05 | P1 | T | `publish-dialog.tsx` | Con la página publicada, lo editado después no llegaba a los invitados y no había cómo actualizarla sin bajarla | Arreglado («Publicar los cambios») |
| F-06 | P1 | — | Cobro | No hay proveedor de pagos: publicar no cobra | Pendiente (backend D1) |
| F-07 | P2 | J, I | `panel.perfil.tsx` | Sin cuenta, Perfil mostraba una «Clave ••••••••» inexistente y «Cambiar» que siempre fallaba | Arreglado |
| F-08 | P2 | — | Pruebas | Las pruebas de navegador dependían de la clave de Google del entorno (campo «Dirección» ausente con clave) y llamaban a Google | Arreglado (servidor de pruebas sin clave) |
| F-09 | P2 | B | `panel.sitio.tsx` | El contador de secciones dentro del título cambiaba su nombre accesible («Tu invitación 7») | Arreglado |
| F-10 | P2 | todas | Landing | Los testimonios («Camila & Lucas», etc.) no vienen de clientes reales verificables | Pendiente: decisión de la dueña (ver abajo) |
| F-11 | P2 | A | Registro | «Aceptás los Términos de uso» no tiene página de términos | Pendiente: redacción legal |
| F-12 | P2 | — | Cuenta | No hay «¿Olvidaste tu clave?» ni cambio de clave o correo | Pendiente (backend D3, D4) |
| F-13 | P3 | Q | Confirmación | El correo ahora es obligatorio para confirmar; algunos invitados (mayores) pueden no tenerlo | Hipótesis: medir abandono |
| F-14 | P3 | L | Volumen | Sin fixture de 500 invitados / 100 regalos no se midió rendimiento | No ejecutado |
| F-15 | P3 | — | Lint | 2 errores de lint previos en `e2e/explore/action-fuzz.spec.ts` (uso de `any`) | Previo a la auditoría |

## Detalle

### F-01 · P0 · Confirmación de pago falsa
- **Reproducción:** con o sin cuenta → «Publicar» → elegir producto → «Pagar ARS 140.000» → «¡Pagaste tu plan Celebración!», «Pagaste hoy ARS 140.000», «Total pagado».
- **Esperado:** nunca afirmar un pago que no existió. **Real (antes):** lo afirmaba; no hay proveedor de pagos.
- **Causa raíz:** el flujo de pago simulado tenía textos «Pago de prueba» que lo aclaraban; se quitaron al pedir «sacar todo lo de demo» y quedó un pago que parecía real.
- **Arreglo:** la revisión muestra «Precio» y el botón dice «Publicar» (con cuenta); la confirmación dice «¡Tu página está publicada!»; se quitaron «Pagaste hoy», «Total pagado», «Ya pagaste» y «sigue pago». El comentario del componente prohíbe volver a esos textos sin un pago confirmado por el proveedor.
- **Prueba:** `e2e/desktop/journeys.spec.ts` («nunca dice «Pagar» sin proveedor», «nunca dice que se pagó»), `e2e/mobile-journeys.spec.ts` (Flujo 7).

### F-02 · P0 · Publicación falsa sin cuenta
- **Reproducción:** sin cuenta → Publicar → producto → pagar → «Tu página está publicada: cualquiera con el link la puede abrir». La cabecera pasaba a «Publicada». El link no existía para nadie más.
- **Arreglo:** sin cuenta, la revisión dice «Para publicar necesitás una cuenta…» y el botón es «Crear cuenta para publicar» (→ `/crear/cuenta`; lo armado pasa a la cuenta). Una publicación local vieja no se muestra como «Publicada» (cabecera, perfil y diálogo exigen cuenta).
- **Prueba:** Flujo 7 (celular), J-01.

### F-03 · P1 · Botones de Google/Apple que no hacían OAuth
- **Arreglo:** se quitaron. Volverán cuando exista OAuth (backend D2). **Prueba:** `account-flow.spec.ts` #2.

### F-04 · P1 · Buscador con parejas inventadas
- **Arreglo:** `/encontrar` pide pegar el link de la invitación (acepta link completo, sin https o la ruta) y ofrece ver un ejemplo. **Pruebas:** unitaria `invitationPath`, E2E P-02/P-05.

### F-05 · P1 · Cambios después de publicar no llegaban
- **Causa:** la página pública es una copia (snapshot) del momento de publicar; con la página publicada solo existía «Bajar la página».
- **Arreglo:** en «Tu publicación», «Publicar los cambios» (guarda lo pendiente y vuelve a publicar con el mismo link) y la línea «Lo que cambies en el panel se ve en tu página cuando tocás «Publicar los cambios». El link no cambia.» **Prueba:** E2E T-02.
- **Pendiente (producto):** avisar en el panel cuando hay cambios sin publicar (requiere que el servidor exponga «borrador más nuevo que lo publicado»).

### F-10 · P2 · Testimonios
- La landing muestra cuatro testimonios con nombre y foto. Si no son de clientes reales, publicarlos así puede considerarse publicidad engañosa (Ley 24.240 de Defensa del Consumidor). **No se tocó**: la dueña los eligió. Recomendación: reemplazarlos por testimonios reales con consentimiento, o quitarlos hasta tenerlos.
