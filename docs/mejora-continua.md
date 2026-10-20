# Registro de mejora continua (dashboard)

Registro compacto para retomar el trabajo. Verificá siempre el estado real del código antes de confiar en él.

## Entorno (2026-10-20)
- Navegador: el integrado del escritorio (emulación de 393×852 y 1280×800; no es un dispositivo físico).
- Playwright está en `package.json` pero **no tiene su navegador instalado** (`npx playwright install` sin hacer): `npm run test:e2e` no se pudo ejecutar. No se usó el Chrome del sistema sin autorización.
- Detector de Impeccable (`impeccable detect`): solo regex sobre fuentes; 1 hallazgo menor preexistente (`panel.css` línea 241, borde inferior de 3 px en las solapas; es el indicador de solapa activa, se dejó).
- Línea de base: `tsc` sin errores, 91 tests pasando, build OK.

## Iteración 1 — recorridos 1 a 7 en el navegador
| Hallazgo | Sev. | Cambio | Verificación |
|---|---|---|---|
| Al aparecer un error de validación, el campo vecino se estiraba (`.pn-two`) | P2 | `align-items: start` | Ambos inputs miden 48 px con errores |
| Inicio: «Falta: Evento 1» a una pareja nueva | P2 | «Cargá la ceremonia y el lugar» si no hay eventos completos | Texto verificado en el panel vacío |
| Packs de regalos de 600–800 px en celular | P2 | Lista de regalos plegable (`PackGifts`), abierta en ≥ 641 px | 799 → ~440 px; en 1280 px siguen abiertos |
| Pantalla de función bloqueada: «El sitio … no está incluida» (género) y sin salida de la prueba | P2 | «se activa con el plan X» y enlace «Volver a probar todo» | Texto y acción verificados; el contenido se conserva |
| Resumen de publicación sin accesos a los pendientes | P2 | `publishSummary().todo` con enlaces (ver `ux-flows.md`) | Test unitario nuevo |

Recorridos comprobados con datos de prueba: 1 (registro → panel vacío), 2 (editar, ver vista previa, volver, valores conservados), 3 (agregar pack, la lista pública muestra los 8 regalos), 4 (alta con validación, edición, baja, deshacer), 5–7 (precio del plan = `plans.ts`, cambiar de plan conserva regalos/sitio/invitados, el botón de pagar está deshabilitado y rotulado «sin conexión»).

## Pendiente
- Importar archivo y exportar (necesitan elegir un archivo): solo cubiertos por tests unitarios de `guests-io`.
- Mesas con toque, y 320/360/430/768/1024/1440 px en cada pantalla: no se recorrieron una por una.
- Instalar el navegador de Playwright para poder correr `e2e/`.
- Próximo objetivo: pasada de accesibilidad (foco, lectores) y revisión de contraste con el detector sobre el servidor en marcha.
