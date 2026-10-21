# Auditoría de UX, usabilidad y flujos — Weda

**Alcance:** landing pública (`/`) y "Ver ejemplo" (`/ejemplo`, `/ejemplo/regalos`, con el pop-up de regalar y el de confirmar asistencia).
**Tipo de evaluación:** inspección experta (recorrido real en navegador + lectura del código). **No se hicieron pruebas con personas.** Todo lo que dice "hipótesis" necesita validación con usuarios reales.
**Fecha:** 13/10/2026. **Versión auditada:** `main` @ `58ad365`.
**Restricciones respetadas:** no se propone cambiar paleta, tipografías, estilo de cards/botones ni sistema de diseño. No se modificó código.

**Cómo se probó:** servidor local (`npm run dev`), navegador integrado de la app (escritorio ~1110 px y móvil 390×844), consulta del DOM y de las rutas, y lectura de `src/routes/*` y `src/components/*`. No se usó Playwright. Los enlaces externos (Google Maps) se verificaron solo hasta la URL generada; la carga del sitio externo no se probó.

---

## 1. Resumen ejecutivo

1. **La propuesta de valor se entiende** a nivel de frase ("Organizá tu casamiento en un solo lugar", lista de regalos + sitio + confirmaciones) y la demo es fácil de encontrar.
2. **El problema principal es la landing: ninguna de sus acciones de conversión funciona.** Los botones "Crear mi evento" (5 apariciones), "Crear mi lista de regalos", "Elegir experiencia" (3), "Hacé un regalo", "Ingresar" y el aviso "¿Invitado? Encontrá una lista de regalos" son anclas sin destino: no navegan, no dan feedback y no se pueden usar con teclado. Hoy el único camino que avanza es "Ver ejemplo".
3. **Un invitado real que llega por el aviso superior o por "Hacé un regalo" no tiene cómo encontrar una lista** (no hay buscador ni camino); es una promesa explícita sin cumplimiento.
4. **La demo cumple los cinco flujos de punta a punta** de forma autónoma: consultar datos, abrir mapas, regalar por alias, confirmar asistencia y moverse entre las tres partes sin perder contexto.
5. **Riesgos de comprensión en la demo:** el pago con "Tarjeta" permite "Enviar" sin pagar ni cargar nada; no se aclara en pantalla que el alias y el pago son de demostración; y combinar orden y rango de monto en un solo control impide filtrar y ordenar a la vez.
6. **Contenido heredado:** el pie de página de la landing mantiene enlaces y textos en inglés de la plantilla original (Shop All, Science, SeedLabs, Superfiliate, "Weda Health, Inc.") que no describen a Weda, y los testimonios son provisorios.

**Veredicto:** una persona que no conoce Weda **entiende qué es** y **puede recorrer la demo sola**, pero **no puede avanzar a usar el producto** y, si llega como invitada, **no encuentra una lista real**. La demo en sí funciona bien.

---

## 2. Inventario de pantallas, rutas y funcionalidades disponibles

| Ruta | Qué es | Estado |
|---|---|---|
| `/` | Landing (hero con video, 3 características con animaciones, bloque de regalos, testimonios, planes, pie) | Disponible; CTAs de conversión sin destino |
| `/ejemplo` | Invitación del casamiento ficticio (portada, bienvenida, "El día", dress code, fotos, playlist, cierre) | Disponible |
| `/ejemplo/regalos` | Lista de regalos (71 regalos, 4 categorías, filtro/orden por monto, buscador en móvil) | Disponible |
| Pop-up "Regalar" | Elegir pago (Alias/Tarjeta), alias con copiar, nombre, apellido, comprobante, Enviar, agradecimiento | Disponible (simulado) |
| Pop-up "Confirmá asistencia" | Nombre, apellido, ¿vas a venir?, restricción alimenticia, cargar otra persona, ver confirmados | Disponible (simulado) |

**Referencias a cosas no disponibles que la landing presenta como activas:** crear evento, crear lista de regalos, ingresar a una cuenta, elegir plan, gestionar invitados/invitaciones, newsletter, hacer un regalo como invitado.

---

## 3. Comprensión de la propuesta de valor

- **Qué es y para quién:** el H1 y la bajada lo dicen en una frase. Se identifica a quien se casa como destinatario ("sus próximos sueños", "tu casamiento").
- **Lista de regalos como valor central:** se entiende; aparece en el hero, en la primera característica, en un bloque propio ("Creá una lista de regalos simbólica…") y en el aviso superior.
- **Diferencia con "una invitación digital":** se logra por la combinación lista + sitio + confirmaciones, pero **la parte de "gestioná invitados" no tiene evidencia en la demo**: la demo solo muestra la vista de quien recibe la invitación; no hay ninguna pantalla del lado de la pareja. (Hipótesis H3.)
- **Precios:** "Pago único, pagás solo al publicar" sin ningún importe; la decisión de plan queda sin el dato más relevante. (U-LAN-06)
- **Mensajes repetidos:** "Crear mi evento" aparece 5 veces entre barra, hero, cabecera de sección y menú; "Crear mi lista de regalos" y "Elegir experiencia" son destinos aún inexistentes.

---

## 4. Auditoría de la landing

### 4.1 Navegación y jerarquía
- La acción principal ("Crear mi evento", píldora llena) es visible y se distingue de "Ver ejemplo" (enlace con flecha). La diferencia entre ambas se entiende por el texto.
- **Pero la primaria no hace nada** y es la acción que el usuario quiere completar. "Ver ejemplo" funciona y lleva a `/ejemplo`.
- La barra superior ("Hacé un regalo", "Ingresar", "Crear mi evento") promete tres destinos distintos; ninguno responde.
- El aviso "¿Invitado? Encontrá una lista de regalos →" se presenta como camino para invitados; no responde.

### 4.2 Contenido
- Los textos en español son comprensibles. El **pie de página** mezcla español e inglés y conserva títulos de la plantilla (Products, About, Inquire, Help, Social, Legal) con 20 enlaces de otra marca/tienda (Shop All, Science, SeedLabs, Superfiliate, Practitioners, Press, Careers…). Ninguno funciona. "Your email address" y "By signing up you consent to receive Weda emails." están en inglés.
- "© 2026 Weda (Weda Health, Inc.)" nombra una entidad que no corresponde al producto.
- Los **testimonios** son ficticios (el propio código lo indica) y se presentan con nombres propios.

### 4.3 Estados
- Sin estados de error/carga/vacío relevantes. El carrusel de testimonios sí responde (flechas y puntos).

---

## 5. Auditoría del micrositio de ejemplo

### 5.1 Llegada
- Se identifica de quién es (Ignacio & Martina) y la fecha (20-03-2027). La primera pantalla muestra foto, nombres, fecha y la etiqueta "¡NOS CASAMOS!"; una flecha indica que hay más abajo. Funciona como señal de scroll.
- El botón "× Volver a Weda" deja claro cómo salir de la demo.

### 5.2 Datos de la boda
- "El día" muestra fecha, tres momentos con hora, lugar y dirección, y "Ver mapa" que abre Google Maps en pestaña nueva (se anuncia a lectores de pantalla). Recepción y Fiesta comparten dirección con nombres distintos.
- Dress code: una línea ("Elegante sport") y cuatro círculos de color **sin nombre visible**.

### 5.3 Lista de regalos
- Acceso: tres puntos (barra superior "Regalá", botón del cierre "Ver lista de regalos", pie). Coherentes, aunque el rótulo de la barra ("Regalá") y el título de la página ("Lista de regalos") no coinciden.
- La explicación de qué ocurre al elegir un regalo es clara dentro del pop-up (pasos ordenados, alias, comprobante).
- Categorías: Luna de miel (50), Hogar (18), Experiencias (1), Proyectos futuros (2).

### 5.4 Confirmación de asistencia
- Disponible desde la barra y desde el cierre. Los campos son claros; los errores aparecen junto al campo; la pantalla final nombra a la persona y la opción elegida, y ofrece "Cargar otra persona".
- No hay campo de acompañantes: la regla "una confirmación por persona" se explica en el subtítulo.

### 5.5 Coherencia
- Las tres partes comparten portada, barra y vocabulario. Se conserva el contexto en todos los cambios probados.

---

## 6. Resultados de los cinco flujos

| # | Flujo | Resultado | Autónomo |
|---|---|---|---|
| 1 | Visitante nuevo: landing → entender → "Ver ejemplo" → demo | Se entiende la propuesta y se llega a la demo. Antes de eso un usuario puede probar 1–3 botones "Crear mi evento" sin respuesta. | Sí (con fricción) |
| 2 | Invitado que consulta información | Fecha, horarios, lugares y mapas, sin bloqueos | Sí |
| 3 | Invitado que quiere regalar | Elegir regalo → Alias → copiar → nombre/apellido/comprobante → Enviar → gracias → "Volver a la lista" (queda "Elegido por vos"). Con "Tarjeta" el flujo termina sin pago. | Sí |
| 4 | Invitado que confirma asistencia | Nombre, apellido, "Sí", restricción → Confirmar → agradecimiento con la opción elegida | Sí |
| 5 | Cambio de objetivo | Invitación → Regalá → Invitación → Confirmá asistencia: contexto conservado; los pop-ups cierran en la página donde se abrieron | Sí |

**Pasos intermedios con esfuerzo innecesario**
- Flujo 1: los CTAs principales sin respuesta (U-LAN-01).
- Flujo 3: si la persona sale a su app bancaria y cierra o recarga la página, el pop-up pierde el estado y debe volver a elegir el regalo (H1).

---

## 7. Problemas de usabilidad (por severidad)

### Críticos

**U-LAN-01 · CTAs de conversión sin destino**
- **Ubicación:** `/` — hero, barra superior, menú móvil, cabecera de "Todo para su gran día", bloque de regalos, planes.
- **Flujo afectado:** iniciar la creación de un evento.
- **Hallazgo:** "Crear mi evento" (×5), "Crear mi lista de regalos", "Elegir experiencia" (×3), "Hacé un regalo" (×2), "Ingresar" (×2) son `<a>` sin `href`. El clic no produce ningún cambio ni mensaje. Se ven con el mismo aspecto que los botones activos.
- **Evidencia:** en el DOM, `a` sin `href` (`src/routes/index.tsx`, componente `SeedLink` y `FloatNav`); clic → misma URL, sin diálogo; cursor `default`; no reciben foco con teclado.
- **Impacto:** la acción central de la landing no se puede completar y el usuario puede creer que el sitio está roto.
- **Severidad:** crítica. **Frecuencia:** todos los recorridos que intentan avanzar desde la landing.
- **Recomendación funcional:** que cada CTA o bien lleve a un destino real, o bien se presente de forma explícita como no disponible aún (texto + estado inhabilitado reconocible + explicación), o se retire hasta que exista.
- **Criterio de aceptación:** ningún botón/enlace visible de la landing queda sin respuesta; los no disponibles se anuncian como tales a lectores de pantalla.

**U-LAN-02 · Camino de invitados inexistente**
- **Ubicación:** `/` — aviso superior "¿Invitado? Encontrá una lista de regalos", "Hacé un regalo" (barra y menú).
- **Flujo afectado:** un invitado quiere encontrar la lista de una pareja.
- **Hallazgo:** son tres entradas que prometen un camino (buscar lista) y ninguna lleva a un buscador, formulario o instrucción.
- **Impacto:** el invitado queda sin salida; además se pierde la oportunidad de entender que el producto es usado por terceros.
- **Severidad:** crítica. **Frecuencia:** todo invitado que llega a la landing en lugar de al enlace de la pareja.
- **Recomendación funcional:** que el aviso explique qué debe hacer (por ejemplo, usar el enlace que le envió la pareja) o lleve a "Ver ejemplo" mientras no exista un buscador.
- **Criterio de aceptación:** al tocar cualquiera de las tres entradas, el invitado obtiene una indicación o un destino.

### Altas

**U-RGL-01 · "Tarjeta" permite enviar sin pagar**
- **Ubicación:** `/ejemplo/regalos` → pop-up → opción "Tarjeta".
- **Flujo:** regalar con tarjeta.
- **Hallazgo:** con "Tarjeta" aparece la nota "Con tarjeta vas a poder pagar desde el sitio… Para este ejemplo, usá el alias", pero con solo nombre y apellido el botón "Enviar" se habilita y muestra "¡Gracias!… Ignacio y Martina agradecen tu regalo." El regalo pasa a "Elegido por vos".
- **Impacto:** resultado incorrecto: parece que el regalo quedó pagado/registrado sin ningún pago.
- **Severidad:** alta. **Frecuencia:** cualquier invitado que elija Tarjeta (1 de las 2 opciones).
- **Recomendación funcional:** que la opción Tarjeta no permita enviar (o la oculte) mientras no exista, de modo coherente con su propio mensaje.
- **Criterio:** con Tarjeta no se puede llegar a "¡Gracias!" sin un paso de pago, o la opción no está disponible.

**U-LAN-03 · Promesa de "gestioná invitados" sin evidencia**
- **Ubicación:** `/` hero y características; `/ejemplo`.
- **Hallazgo:** la landing promete gestionar invitados e invitaciones; la demo solo muestra el lado del invitado.
- **Impacto:** quien compra decide sin ver cómo se gestiona.
- **Severidad:** alta (para la decisión de uso). **Estado:** hallazgo de inspección; el impacto en la decisión es hipótesis (H3).
- **Recomendación:** aclarar en la landing qué incluye hoy cada característica o mostrar la vista de la pareja en la demo cuando exista.
- **Criterio:** cada promesa de la landing tiene una evidencia visible en la demo o está marcada como próxima.

### Medias

**U-LAN-04 · Pie de página con contenido ajeno y en inglés**
- **Ubicación:** `/` pie.
- **Hallazgo:** 6 grupos y 20 enlaces de otra marca/tienda, en inglés; "Weda Health, Inc."; sin destino.
- **Impacto:** resta credibilidad y confunde sobre qué es Weda; el usuario puede preguntarse si hay una tienda o un laboratorio.
- **Severidad:** media. **Recomendación:** reemplazar por los enlaces que correspondan hoy (o retirarlos) y traducir los textos.
- **Criterio:** todos los textos del pie están en español y describen a Weda; ningún enlace queda sin destino.

**U-LAN-05 · Testimonios provisorios**
- **Hallazgo:** cuatro testimonios con nombres propios que son de ejemplo.
- **Impacto:** puede interpretarse como prueba social real. **Severidad:** media (hipótesis de confianza, H4).
- **Recomendación:** retirar o rotular como ejemplo hasta tener reales.

**U-LAN-06 · Planes sin precio y con rótulo inconsistente**
- **Ubicación:** `/` sección "Elegí el plan".
- **Hallazgo:** "Pago único, pagás solo al publicar" sin monto; los botones dicen "Elegir experiencia" aunque el título habla de "plan". La tarjeta "Premium" solo suma "Sitio de casamiento premium" sin explicar la diferencia.
- **Impacto:** no hay información suficiente para decidir. **Severidad:** media.
- **Recomendación:** mostrar el precio o aclarar cuándo se informa; unificar el término.

**U-RGL-02 · Orden y rango de monto en un solo control**
- **Ubicación:** `/ejemplo/regalos` — selector de monto.
- **Hallazgo:** "Menor a mayor/Mayor a menor" y "Hasta $ 200.000 / $ 200.000 a $ 500.000 / Más de $ 500.000" son excluyentes.
- **Impacto:** no se puede pedir "hasta $ 200.000, de menor a mayor". **Severidad:** media. **Frecuencia:** tareas de búsqueda por presupuesto.
- **Recomendación:** permitir elegir rango y orden por separado.
- **Criterio:** con un rango elegido, es posible ordenar dentro de ese rango.

**U-RGL-03 · Demostración no identificada como tal dentro del flujo**
- **Ubicación:** pop-up de regalar y de confirmar.
- **Hallazgo:** el alias `ignacio.martina`, el pedido de comprobante y el agradecimiento se muestran como reales; la única referencia a "ejemplo" está en la nota de Tarjeta y en el pie. No hay aviso al abrir los pop-ups.
- **Impacto:** un visitante podría intentar transferir o creer que su confirmación se envió a alguien. **Severidad:** media. **Estado:** hipótesis (H2); se contrapone con el pedido explícito del proyecto de no mostrar avisos de demo, por lo que conviene decidirlo con la persona responsable.
- **Recomendación:** definir un único punto, discreto, donde se aclare que es una demostración (por ejemplo, en el pop-up o en el pie de la demo).

**U-RGL-04 · El pop-up pierde el estado al cerrarse**
- **Hallazgo:** al cerrar el pop-up de regalar, se descartan nombre, método y comprobante; el alias solo se vuelve a ver reabriendo y repitiendo pasos.
- **Impacto:** quien sale a la app del banco y vuelve debe empezar de nuevo (hipótesis H1). **Severidad:** media.
- **Recomendación:** conservar los datos ingresados mientras dura la visita a la página.

### Bajas

- **U-RGL-05 · Categorías desparejas:** Experiencias tiene 1 regalo y Proyectos futuros 2; al elegirlas la lista parece vacía. Luna de miel concentra 50.
- **U-RGL-06 · Buscador solo en móvil:** en escritorio no existe aunque la lista tiene 71 elementos.
- **U-EJE-01 · Dress code con colores sin nombre visible:** cuatro círculos sin leyenda; su sentido (paleta sugerida) solo está para lectores de pantalla.
- **U-EJE-02 · "Regalá" vs "Lista de regalos":** mismo destino con dos rótulos.
- **U-EJE-03 · Foco al cerrar el pop-up de regalar:** al cerrarlo, el foco no vuelve al botón "Regalar" que lo abrió (prueba con Escape sintético; confirmar con teclado real). Un usuario de teclado pierde su posición.
- **U-EJE-04 · Objetivos táctiles de 32–36 px en móvil** (barra del ejemplo, enlaces del pie): por debajo de la referencia de 44 px aunque por encima del mínimo de 24 px.
- **U-EJE-05 · Contraste de texto chico sobre la tarjeta "El día":** dirección y etiqueta "EL DÍA" en blanco con transparencia sobre `#707d87` (≈ 3,3:1 a 12 px). Evaluar contra el criterio de 4,5:1 sin cambiar colores (por ejemplo, ajustando solo la opacidad del texto).
- **U-LAN-07 · Elementos inactivos sin rol ni estado:** los 35 enlaces sin `href` se leen como texto plano; `aria-disabled` no tiene efecto sobre un `<a>` sin rol.

---

## 8. Hipótesis que necesitan pruebas con usuarios reales

| ID | Hipótesis | Cómo validarla |
|---|---|---|
| H1 | Quien sale a su app bancaria y vuelve pierde la operación y abandona | Observar 5–8 personas haciendo el regalo en celular con el alias |
| H2 | Algunos visitantes creen que la demo es un evento real y que pagan o confirman de verdad | Preguntar al final de la demo qué creían que había pasado |
| H3 | La falta de una vista de la pareja reduce la confianza en "gestioná invitados" | Test de comprensión de la landing con novios |
| H4 | Los testimonios ficticios se perciben como reales y afectan la confianza si se descubre | Test de preferencia con y sin testimonios |
| H5 | El mensaje de bienvenida aparece fuera de la primera pantalla y algunas personas no saben que hay más contenido | Observar si usan la flecha o hacen scroll sin ayuda |
| H6 | Los invitados esperan buscar la lista por nombre de pareja desde la landing | Test de tareas: "encontrá la lista de Ignacio y Martina" |

---

## 9. Priorización (impacto × esfuerzo)

| Prioridad | Hallazgo | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | U-LAN-01, U-LAN-02 | Muy alto | Bajo–medio (definir destino o estado "próximamente") |
| 2 | U-RGL-01 | Alto | Bajo |
| 3 | U-LAN-04, U-LAN-05 | Medio | Bajo |
| 4 | U-LAN-06, U-LAN-03 | Medio–alto | Medio (requiere definición de producto) |
| 5 | U-RGL-02, U-RGL-04 | Medio | Medio |
| 6 | U-RGL-03 | Medio | Bajo (requiere decisión) |
| 7 | U-RGL-05, U-RGL-06, U-EJE-01…05, U-LAN-07 | Bajo | Bajo |

---

## 10. Checklist de regresión

**Landing**
- [ ] Cada botón y enlace visible navega, abre un diálogo o está declarado como no disponible.
- [ ] Los controles no disponibles no se ven como activos y se anuncian como tales.
- [ ] "Ver ejemplo" abre `/ejemplo`.
- [ ] El pie no contiene texto en inglés ni enlaces a otra marca.
- [ ] Los testimonios están rotulados o fueron retirados.
- [ ] Sin desbordamiento horizontal a 390 px.

**Invitación**
- [ ] Primera pantalla: foto, nombres, fecha, "¡NOS CASAMOS!" y flecha.
- [ ] La flecha baja a la bienvenida.
- [ ] Los tres "Ver mapa" abren una pestaña nueva con la dirección correcta.
- [ ] "Confirmá asistencia" abre el pop-up desde la barra y desde el cierre.
- [ ] "× Volver a Weda" lleva a `/`.

**Lista de regalos**
- [ ] El título aparece en la misma posición que "¡NOS CASAMOS!".
- [ ] Filtros por categoría, orden y rango funcionan; es posible combinar rango y orden.
- [ ] El conteo ("N regalos") coincide con las tarjetas.
- [ ] Alias: copiar, nombre, apellido y comprobante; "Enviar" bloqueado hasta completar y con mensaje de qué falta.
- [ ] Tarjeta no conduce a "¡Gracias!" sin pago.
- [ ] Un nombre de archivo largo no desborda el pop-up.
- [ ] Al cerrar el pop-up, el foco vuelve al botón de origen.
- [ ] Después de enviar, la tarjeta queda en "Elegido por vos".

**Confirmación de asistencia**
- [ ] Nombre y apellido obligatorios, con mensaje por campo.
- [ ] Si "No puedo ir", no se pide restricción.
- [ ] Si "Sí", la restricción es obligatoria.
- [ ] La pantalla final nombra a la persona y la opción elegida.
- [ ] "Cargar otra persona" reinicia el formulario y conserva el listado.

**Transversal**
- [ ] Todo es operable con teclado y el foco es visible.
- [ ] Los pop-ups se cierran con Escape y atrapan el foco.
- [ ] Móvil 390 px: sin desbordes, textos importantes sin cortar.
- [ ] Contraste del texto chico sobre la tarjeta "El día" ≥ 4,5:1.

---

## Limitaciones de esta auditoría

- Sin pruebas con usuarios: las severidades son juicio experto, no métricas de uso.
- Las pruebas de teclado usaron eventos sintéticos; conviene repetirlas con teclado y lector de pantalla reales.
- El pago y el envío de confirmaciones no tienen backend: se evaluó la experiencia simulada, no una operación real.
- No se verificó la carga de los sitios externos (Google Maps).
- La landing todavía no tiene flujo de creación de evento, cuenta ni planes; no se evaluó lo que no existe.
