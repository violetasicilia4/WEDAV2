# 06 · Calidad visual y percepción de marca

La mirada es la de un director de arte que evalúa una marca premium.

## Veredicto

**Parece diseñada por personas, no generada por IA, pero todavía tiene pasajes de plantilla.**

Lo que la salva de lo genérico:
- el video propio con su color;
- las maquetas del producto real, con regalos, montos y nombres del catálogo;
- el tono rioplatense honesto;
- la contención: una sola familia tipográfica y un verde usado con disciplina.

Lo que la acerca a una plantilla SaaS: la sucesión «tres tarjetas de funciones → tres planes → carrusel de testimonios → franja de cierre», el rótulo «/TESTIMONIOS» y la cantidad de variantes de estilo detrás de escena (81 tamaños de letra, 36 sombras).

## 1. ¿Qué hace reconocible a Weda?

- El hero en video con «Tu casamiento empieza antes del gran día.», que es emocional, local y sin clichés de boda.
- Las maquetas del producto: «Hacer un regalo» con el sello «0% · sin comisión», los filtros por monto y «Regalos recibidos» con nombres. Muestran el producto en lugar de describirlo, como pide el principio 2 de `PRODUCT.md`.
- La voz honesta: «Weda no cobra ni mueve el dinero de los regalos».
- La paleta contenida: blanco, gris #f6f7f8, tinta #3b3c3a y el verde oliva #959571 como único acento.
- Las hojas de Regalos que se apilan al bajar.

## 2. ¿Qué parece genérico?

| Señal | Dónde | Por qué resta |
|---|---|---|
| Tres tarjetas iguales en fila | «Todo para compartir» | Es el patrón número uno de las plantillas. Lo salvan las demos reales, pero la composición es la de siempre. |
| Tres planes en tarjetas iguales | Planes | Esperable para precios; sin acción, queda como una tabla (F-12). |
| Rótulo «/TESTIMONIOS» en mayúsculas chicas con línea encima | Testimonios | Es el adorno que la skill `design-taste-frontend` lista como señal de plantilla (eyebrow, tracked caps, hairline). Es el único en la página. |
| Carrusel con flechas y contador «01 / 04» | Testimonios | La numeración índice es otra de las señales que la skill marca. |
| Franja de cierre con frase y dos acciones | Cierre | Es correcta, pero muy estándar. |
| Barra en píldoras de vidrio | Header | La skill la prohíbe. **Es una decisión de marca de la dueña: se preserva.** |

## 3. Decisiones bien resueltas

- **Una sola tipografía** con jerarquía por tamaño y no por estilos.
- **El verde se reserva** para la barra de invitados, los botones principales y el cierre. El resto es blanco y gris.
- **Las maquetas** usan regalos e invitados del ejemplo, no rectángulos grises.
- **El ritmo de secciones** de 60/40 px y 1200 px de ancho: ordenado, sin amontonar.
- **El pase de las hojas de Regalos en celular:** la maqueta y el título caen en el mismo lugar en las tres.
- **El cuidado del celular:** cero overflow, objetivos táctiles de 44 px o más, «reducir movimiento».

## 4. Qué le resta calidad percibida

1. **Lo que no es verdad o no funciona:**
   - «tarjeta» en el plan (F-02);
   - «Registrarme con Google» que no registra (F-13);
   - el registro que no crea la cuenta en producción (F-01).
   Para una marca premium, eso pesa más que cualquier ajuste visual.
2. **El hero se ve vacío durante la carga (F-27):** la primera impresión es texto apareciendo de a poco y sin botones.
3. **Inconsistencias pequeñas acumuladas:**
   - botones de 36, 44, 48 y 52 px;
   - siete radios distintos a la vista;
   - comillas en Georgia, una tercera familia que aparece una sola vez.
4. **Vacíos sin intención:** las hojas de Regalos tienen de 100 a 250 px vacíos en celular (F-19).
5. **La transición al registro** recarga la landing detrás (F-03). Se percibe como «se rompió algo».

## 5. Qué cambiaría para un estándar premium internacional (sin reinventar la identidad)

1. **Verdad primero:** cerrar F-01, F-02 y F-13. Un producto premium no promete lo que no hace.
2. **Primera pantalla completa desde el cuadro 1:** título, bajada, botones y una línea con el diferencial («Sin comisión: el dinero va directo a tu cuenta»).
3. **Cambiar «Todo para compartir»** de tres tarjetas iguales a una composición con jerarquía: la lista de regalos grande, con el sitio y la confirmación como acompañantes. Así la lista es protagonista también en la estructura.
4. **Testimonios con un `h2` en el estilo de la página**, sin rótulo ni numeración índice. Por ejemplo, una cita grande y la foto, con flechas discretas.
5. **Tokens consolidados (F-15):** dos tamaños de botón, tres radios, dos sombras, cinco o seis tamaños de letra. La calidad premium se nota en la consistencia más que en el adorno.
6. **El registro como capa sobre la landing (F-03),** con transición suave, y volver exactamente al mismo lugar al cerrar.

## F-20 · El brief de identidad no coincide con el producto
| Campo | Detalle |
|---|---|
| Categoría | Marca / gobierno de diseño |
| Severidad | P2 |
| Página / componente | Documentación de identidad |
| Dispositivo | — |
| Problema | El brief de esta auditoría describe Instrument Serif para títulos, DM Sans para texto y una paleta blanco, crema, ink y slate. El producto usa **solo Geist**, una paleta blanco, gris #f6f7f8, tinta #3b3c3a y verde #959571, y el slate (#707d87) quedó en desuso en la landing. |
| Evidencia | `public/fonts/` tiene Geist y Cormorant (solo el micrositio). `.claude/rules/frontend-ux.md` fija Geist. La memoria del proyecto registra que la dueña rechazó Instrument Serif y la dirección «editorial premium» el 2026-11-01. |
| Impacto en el usuario | Ninguno directo. |
| Impacto comercial | Riesgo de que diseño, agencia o IA trabajen con un brief desactualizado y propongan cambios ya rechazados. |
| Recomendación | Actualizar el brief y `docs/design-system.md` para que digan lo mismo. **No cambiar la tipografía.** |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | Un único documento de identidad vigente, coherente con el código. |

## Diferenciación frente a competidores (cualitativo)

- **Puntos fuertes:** la transparencia sobre el dinero (sin comisión, transferencia directa), y el sitio, la lista y la confirmación juntos, mostrados con maquetas reales.
- **Riesgo:** si la lista de regalos no lidera visualmente (F-07), Weda se lee como «otra web de casamientos» y no como «la lista que no te cobra».
