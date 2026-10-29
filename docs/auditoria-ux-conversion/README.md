# Auditoría UX, conversión y calidad de punta a punta — Weda

**Fecha:** 2026-10-28 · **Alcance:** landing, alta, panel (regalos, sitio, invitados, publicar), página pública y flujos del invitado, en celular y compu · **Sin commits, push ni despliegues.**

## Estado del producto
Los recorridos principales funcionan con datos reales cuando la pareja tiene cuenta: armar, guardar en la cuenta, publicar, confirmar asistencia y regalar con comprobante. Antes de esta auditoría había **dos confirmaciones falsas graves** (pago y publicación), además de botones y pantallas que prometían algo que no hacían. Quedaron corregidas.

**El bloqueo principal para el lanzamiento comercial no es de interfaz: no hay proveedor de pagos**, así que hoy publicar no cobra.

## Números

| | |
|---|---|
| Personas | 20 (A–T) |
| Escenarios generados | 100 (5 por persona) |
| Ejecutados | 93 |
| Pasan | 89 |
| Pasan tras reintento | 4 (B-03 y E-01: intermitentes del alta; J-01 y L-04: pruebas desactualizadas, corregidas) |
| Fallan | 0 |
| Bloqueados | 0 |
| No ejecutados | 7 (pagos reales ×3, volumen, conflicto entre pestañas, recarga durante publicar, vencimiento) |

Detalle: [personas-and-scenarios.md](personas-and-scenarios.md). Pruebas: [test-results.md](test-results.md).

## Hallazgos críticos (P0/P1)
- **F-01 · P0 · Pago falso.** «Pagar», «Procesando el pago…», «¡Pagaste tu plan!» y «Total pagado», sin ningún cobro. **Arreglado.**
- **F-02 · P0 · Publicación falsa sin cuenta.** Decía «publicada, cualquiera con el link la puede abrir» y solo existía en ese navegador. **Arreglado:** publicar pide cuenta.
- **F-03 · P1 · Google y Apple.** Los botones no registraban con Google ni con Apple. **Arreglado:** se quitaron.
- **F-04 · P1 · `/encontrar`.** Mostraba parejas inventadas como si fueran reales. **Arreglado:** ahora se pega el link de la invitación.
- **F-05 · P1 · Cambios sin publicar.** Lo editado después de publicar no llegaba a los invitados y no había cómo actualizar la página. **Arreglado:** botón «Publicar los cambios».
- **F-06 · P1 · Sin proveedor de pagos.** **Pendiente** (backend).

Registro completo: [findings.md](findings.md).

## Arreglos implementados
1. Diálogo de publicar honesto: precio sin «pagar», cuenta obligatoria y «¡Tu página está publicada!» solo cuando el servidor publicó.
2. Botón «Publicar los cambios», con el mismo link.
3. Sin botones de Google ni Apple.
4. `/encontrar` con el link de la invitación.
5. Perfil sin cuenta, sin la clave falsa ni el «Cambiar» que siempre fallaba.
6. Título «Tu invitación» con nombre accesible correcto.
7. `/encontrar` legible a 320 px.
8. Pruebas que ya no dependen de la clave de Google ni llaman a Google.

## Bloqueos que siguen
Proveedor de pagos, recuperar clave, correo configurado, términos de uso y política de privacidad definitivos, testimonios reales, vencimiento en el servidor, almacenamiento de fotos y analítica. Detalle en [backend-dependencies.md](backend-dependencies.md) y prioridades en [recommended-priorities.md](recommended-priorities.md).

## Estado final de las pruebas
- **Tipos y `build`:** OK.
- **Vitest:** 175/175.
- **Lint:** sin errores nuevos (los 2 previos siguen en una prueba exploratoria).
- **Playwright:** 139/146 en la corrida completa y las 7 restantes pasan al reintentar (3 intermitentes y 4 pruebas desactualizadas corregidas).

## Documentos
- [personas-and-scenarios.md](personas-and-scenarios.md)
- [customer-journey-map.md](customer-journey-map.md)
- [findings.md](findings.md)
- [conversion-and-friction.md](conversion-and-friction.md)
- [state-consistency.md](state-consistency.md)
- [mobile-and-accessibility.md](mobile-and-accessibility.md)
- [test-results.md](test-results.md)
- [backend-dependencies.md](backend-dependencies.md)
- [recommended-priorities.md](recommended-priorities.md)

---

## Actualización 2026-10-29 · remediación post-auditoría
Resueltos o encaminados:
- la intermitencia del alta, con la causa encontrada;
- recuperar la clave;
- términos de uso en borrador;
- testimonios inventados reemplazados;
- arquitectura de pagos con adaptador de prueba;
- fotos como archivos;
- vencimiento aplicado por el servidor;
- analítica mínima.

Sigue bloqueando el lanzamiento comercial:
- el **proveedor de pagos real**;
- el **correo configurado**;
- la **revisión legal**.

Documentos: [post-audit-remediation.md](post-audit-remediation.md), [production-readiness.md](production-readiness.md), [payment-integration.md](payment-integration.md), [auth-and-email.md](auth-and-email.md), [deployment-checklist.md](deployment-checklist.md).
