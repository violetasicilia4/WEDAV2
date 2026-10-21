# AUDIT_FUNCTIONAL — Inventario real de funcionalidades del micrositio de ejemplo

**Alcance:** `/ejemplo`, `/ejemplo/regalos`, diálogo de confirmación de asistencia (RSVP), pop-up de regalo.
**Fecha:** 14/10/2026. **Tipo:** auditoría de solo lectura (sin cambios de código, CSS, textos ni configuración).
**Cómo leer este documento:** cada afirmación se marca como **[V] verificado** (probado en el navegador o con script en esta auditoría), **[I] inferido** (deducido del código, sin ejecutarlo) o **[R] recomendación**.

> Regla de lectura: esto es una **demo**. Todo lo que funciona acá funciona con datos locales en memoria del navegador. Nada de esto prueba que el producto real (cuentas, pagos, persistencia) exista.

---

## 0. Cómo se verificó

| Método | Qué cubrió |
|---|---|
| Recorrido real en el navegador integrado y en Chrome headless (CDP) a 320, 360, 402, 768, 1110 y 1440 px | Visual, desbordes, foco, diálogos |
| Script de recorrido de punta a punta (`fetch`/`XHR`/`sendBeacon` instrumentados) | Que no haya red real en regalos ni RSVP |
| Teclado real (eventos Tab/Enter/Espacio/Esc) | Orden de foco, apertura/cierre de diálogos, RSVP completo |
| Lectura de código | Datos no renderizados, ausencia de persistencia |
| Medición de contraste sobre píxeles reales | Testimonios (landing) y navegación del micrositio |

**No se pudo verificar:** celular físico, teclado virtual real, lector de pantalla, Core Web Vitals reales (servidor de desarrollo, sin mediciones de campo).

---

## 1. Resumen por estado

| Estado | Cantidad | Ejemplos |
|---|---|---|
| Completa y verificada (demo) | 9 | Portada, eventos con mapas, navegación y anclas, filtros de regalos, foco en diálogos |
| Simulada | 6 | Flujo de regalo, comprobante, RSVP, playlist, copiar alias, "Tarjeta" |
| Parcial | 5 | RSVP (sin acompañantes ni contacto), regalos (sin cantidades ni mensaje), galería en móvil |
| Solo visual | 1 | Fecha con "Sábado" repetida (no es función; ver UX) |
| Rota | 0 | No se encontró ninguna funcionalidad rota en el recorrido |
| Ausente | 14 | Cuenta regresiva, alojamiento, transporte, FAQ, mensajes de invitados, calendario, bilingüe, etc. |
| No verificada | 4 | Teclado virtual, lector de pantalla, celular real, producción |

---

## 2. Inventario detallado

Formato: **Nombre** · estado · evidencia · archivo · prueba · problema · dependencias · prioridad sugerida.

### 2.1 Portada e invitación

| # | Funcionalidad | Estado | Evidencia | Archivo | Problema / observación | Prio |
|---|---|---|---|---|---|---|
| F-01 | Nombres de la pareja (h1) | Completa [V] | `Ignacio & Martina` en `<h1>`; fuente Instrument Serif cargada | `src/components/ejemplo-cover.tsx` | Con nombres largos solo se probó a 402 px (cabe con 31 px de margen); **no** se probó un nombre real largo (p. ej. "Maria Fernanda & Juan Sebastian") | P1 |
| F-02 | Fecha en portada | Completa [V] | "20 de marzo de 2027" (`wedding.dateShort`) | `src/lib/demo-wedding.ts` | Se repite con "Sábado 20 de marzo de 2027" en la franja de eventos | P3 |
| F-03 | Fotografía principal | Completa [V] | `/pareja-portada-5.webp`, `<img>` con alt, preload en SSR | `ejemplo-cover.tsx` | Recorte en móvil depende de `object-position` fijo; con otra foto hay que reencuadrar a mano | P2 |
| F-04 | Navegación superior (Invitación / Regalá / Confirmá asistencia) | Completa [V] | Enlaces con `href` real; el activo lleva `aria-current` | `src/routes/ejemplo.tsx` | — | P0 |
| F-05 | Acceso a información del evento | Completa [V] | "Invitación" salta a `#dia`; flecha de portada también | `ejemplo.tsx`, `ejemplo-cover.tsx` | — | P0 |
| F-06 | Acceso a regalos | Completa [V] | "Regalá" navega a `/ejemplo/regalos#regalos`, 80 px bajo el borde | `ejemplo.tsx` | — | P0 |
| F-07 | Acceso a RSVP | Completa [V] | Botón en barra, botón en cierre, botón en footer; abre diálogo | `ejemplo.tsx`, `ejemplo.index.tsx` | RSVP solo se alcanza por barra (que en pantalla inicial es translúcida), cierre o footer. No hay CTA fijo | P1 |
| F-08 | Anclas internas | Completa [V] | `#dia`, `#dresscode`, `#fotos`, `#musica`, `#regalos` existen; FAB de playlist aterriza a 80 px | `ejemplo.index.tsx` | `#fotos` y `#dresscode` no tienen enlace propio (no hay índice) | P3 |
| F-09 | Scroll / fin de página | Completa [V] | Footer termina exactamente en la altura del documento (hueco 0) | `ejemplo.tsx` | — | — |
| F-10 | Contraste de navegación sobre foto | Completa [V] | Mínimo 4,69:1 sobre tres fotos probadas (clara, oscura, irregular) con burbuja de fondo propio | `src/ejemplo.css` | El valor sale del fondo propio de la burbuja, no de la foto | P2 |
| F-11 | Adaptación a otras imágenes/tamaños | Parcial [V] | Probado con 3 fotos existentes | `ejemplo-cover.tsx` | No hay lógica de recorte por foco; `object-position` global | P2 |

### 2.2 Información del evento

| # | Funcionalidad | Estado | Evidencia | Archivo | Problema | Prio |
|---|---|---|---|---|---|---|
| F-20 | Ceremonia / Recepción / Fiesta | Completa [V] | 3 eventos con hora, lugar, dirección | `ejemplo.index.tsx` (`Intro`), `demo-wedding.ts` (`events`) | — | P0 |
| F-21 | Enlaces a mapas | Completa [V] | 3 enlaces a `google.com/maps/search/?api=1&query=…`, `target=_blank`, `rel=noopener` | `Intro` | Solo Google Maps; sin "cómo llegar", sin coordenadas, sin estacionamiento | P1 |
| F-22 | Varios lugares/eventos | Parcial [V] | Layout admite 1 a 5 (probado 1–5 con clonado de DOM) | `src/ejemplo.css` | Los datos reales de 4+ eventos (`extraEvents`: Civil, Brunch) **existen pero no se muestran** | P1 |
| F-23 | Información ausente/incompleta | No verificada | No hay estados definidos para dirección faltante o hora "a confirmar" | — | Sin pruebas de datos faltantes | P1 |
| F-24 | Legibilidad en móvil | Completa [V] | ≤520 px: un evento por renglón, dirección visible, sin cortes a 320–402 | `src/ejemplo.css` | — | P1 |

### 2.3 RSVP y gestión de invitados

| # | Funcionalidad | Estado | Evidencia | Archivo | Problema | Prio |
|---|---|---|---|---|---|---|
| F-30 | Formulario de confirmación | Simulada [V] | Nombre, apellido, "¿Vas a venir?" (Sí/No), menú (6 opciones) si va | `src/components/rsvp-dialog.tsx` | Sin teléfono/email, sin notas, sin comentario | P0 |
| F-31 | Confirmación por grupo / acompañantes | Parcial [V] | "Cargar otra persona" permite sumar personas una por una; **no** hay cantidad de acompañantes ni código de invitación | `rsvp-dialog.tsx` | No distingue titular vs acompañante; no hay límite por invitación | P1 |
| F-32 | Restricciones alimentarias | Simulada [V] | 6 opciones (sin restricciones, vegetariano, vegano, sin TACC, sin lactosa, kids) | `demo-wedding.ts` (`menus`) | Sin campo libre ("otras alergias") | P1 |
| F-33 | Revisión antes de enviar | Simulada [V] | Vista "Revisá tu confirmación" con "Enviar confirmación" / "Cargar otra persona" | `rsvp-dialog.tsx` | — | — |
| F-34 | Estado de éxito | Simulada [V] | "¡Gracias, X!" / "¡Gracias! Enviamos N confirmaciones." | `rsvp-dialog.tsx` | No indica que es demostración | P1 |
| F-35 | Estado de error / validación | Simulada [V] | Mensajes por campo; el foco salta al primer campo inválido (verificado con teclado) | `rsvp-dialog.tsx` | No hay estado de error de red (no hay red) | P1 |
| F-36 | Fecha límite | Solo visual [V] | Texto "Respondé antes del 20 de enero." | `rsvp-dialog.tsx` | No hay lógica de cierre ni de fecha | P2 |
| F-37 | Persistencia | **Ausente** [V] | Sin `localStorage`/`sessionStorage`/red; al recargar se pierde | — | La demo no demuestra que "llegue" a una lista de invitados | P0 (producto) |
| F-38 | Integración con gestión de invitados | **Ausente** [V] | No hay ruta ni componente de panel | — | Es la funcionalidad central del producto y no se muestra | P0 (producto) |
| F-39 | Privacidad / validación de datos | Parcial [I] | Validación mínima de longitud (≥2 caracteres) | `rsvp-dialog.tsx` | Sin consentimiento, sin política, sin anti-spam | P1 |
| F-40 | Comportamiento sin conexión | **No verificada** | No hay llamadas de red que fallen | — | Cuando exista envío real, no hay estado de error definido | P1 |

### 2.4 Lista de regalos

| # | Funcionalidad | Estado | Evidencia | Archivo | Problema | Prio |
|---|---|---|---|---|---|---|
| F-50 | Catálogo | Simulada [V] | 71 regalos (Luna de miel 50, Hogar 18, Experiencias 1, Proyectos futuros 2) | `demo-wedding.ts` (`gifts`) | Desbalance fuerte entre categorías | P1 |
| F-51 | Categorías (filtro) | Completa [V] | Chips Todos / Luna de miel / Hogar / Experiencias / Proyectos futuros; conteos verificados | `ejemplo.regalos.tsx` | Dos categorías parecen vacías | P1 |
| F-52 | Búsqueda | Completa [V] | "barco" → 1 resultado ("Excursión en barco") | `ejemplo.regalos.tsx` | Sin estado vacío verificado | P1 |
| F-53 | Filtro / orden de precio | Completa [V] | "Hasta $ 200.000" → 16, máximo exacto 200.000 | `ejemplo.regalos.tsx` | Un solo control mezcla **orden** y **rango** | P2 |
| F-54 | Tarjetas de regalo | Completa [V] | Foto, nombre en una línea (ninguno se corta a 320–1440), precio, botón | `ejemplo.regalos.tsx` | — | — |
| F-55 | Selección de regalo | Simulada [V] | Abre pop-up; al enviar la tarjeta queda "Elegido" | `ejemplo.regalos.tsx` | El estado "Elegido" se pierde al recargar; no hay "ya fue regalado por otra persona" | P1 |
| F-56 | Cantidades / múltiples compras | **Ausente** [V] | El modelo `Gift` tiene `taken?`, sin cantidad ni "aportes parciales" | `demo-wedding.ts` | Regalos de fondos (p. ej. luna de miel) normalmente aceptan aportes | P1 |
| F-57 | Regalos simbólicos | Parcial [I] | Existen como ítems (viaje, experiencias), sin barra de progreso ni meta | `demo-wedding.ts` | — | P2 |
| F-58 | Mensaje asociado al regalo | **Ausente** [V] | El pop-up solo pide nombre y apellido | `ejemplo.regalos.tsx` | Los invitados suelen querer dejar un mensaje | P1 |
| F-59 | Alias / instrucciones de transferencia | Simulada [V] | Alias `ignacio.martina`, botón copiar (usa portapapeles) | `ejemplo.regalos.tsx` | Alias ficticio; sin CBU/CVU ni titular | P1 |
| F-60 | Carga de comprobante | Simulada [V] | `<input type=file>`; "Enviar" se habilita al cargar; **no** se sube a ningún lado (sin red) | `ejemplo.regalos.tsx` | Validación solo de presencia, sin tipo/tamaño visibles | P1 |
| F-61 | Validación de datos | Simulada [V] | "Para enviar falta: nombre, apellido, comprobante" | `ejemplo.regalos.tsx` | — | — |
| F-62 | Confirmación del flujo | Simulada [V] | "¡Gracias, Ana!" | `ejemplo.regalos.tsx` | No indica que es demostración | P1 |
| F-63 | Método "Tarjeta" | Parcial [V, auditoría previa `docs/auditorias/auditoria-ux-weda.md`] | Permite "Enviar" sin pagar ni cargar nada | `ejemplo.regalos.tsx` | Parece un pago real que no existe | P1 |
| F-64 | Errores y estados vacíos | Parcial [I] | No hay "sin resultados" verificado ni error de carga de imagen | — | Falta estado vacío de búsqueda/filtro | P1 |
| F-65 | Destinos de luna de miel | Solo datos [V] | `destination` existe en cada regalo, **no** hay UI que lo use | `demo-wedding.ts` | Pedido explícito: "solo datos" | P3 |
| F-66 | Diferencia demo vs operación real | **Ausente** [V] | Sin red real; sin aviso | — | Un usuario podría creer que pagó | P1 |

### 2.5 Bloques complementarios

| # | Bloque | Estado | Evidencia | Notas |
|---|---|---|---|---|
| F-70 | Dress code | Completa [V] | "Elegante sport" + 4 colores con nombre | Contenido corto para un bloque de ~420 px de alto |
| F-71 | Galería | Parcial [V] | 5 fotos en escritorio; en ≤700 px la quinta se oculta (`.m5 {display:none}`) | Solo 4 en móvil; sin ampliar (lightbox) ni carrusel |
| F-72 | Hashtag | Completa [V] | `#IgnacioYMartina2027` + `@ignacioymartina.casamiento` | Solo texto; sin enlace ni copiar |
| F-73 | Playlist | Simulada [V] | Agregar canción suma a la lista (7 canciones tras agregar 1) | Sin persistencia ni moderación; sin enlace a Spotify |
| F-74 | Mensajes de invitados | **Ausente** [V] | Datos `greetings` en `demo-wedding.ts` sin renderizar | — |
| F-75 | Cuenta regresiva | **Ausente** [V] | No existe en rutas ni componentes | — |
| F-76 | Alojamiento / hoteles | **Ausente** [V] | No existe | — |
| F-77 | Transporte / cómo llegar | **Ausente** [V] | No existe (solo enlace a mapa) | — |
| F-78 | Preguntas frecuentes | **Ausente** [V] | No existe | — |
| F-79 | Invitación bilingüe | **Ausente** [V] | `<html lang="es">` fijo | — |
| F-80 | Información adicional | **Ausente** [V] | `infoCards` en `demo-wedding.ts` sin renderizar | — |
| F-81 | Personalización de colores y tipografías | **Ausente** [V] | Paleta y fuentes fijas en CSS | Esto no debe existir en la demo; sí en el producto |
| F-82 | Agregar al calendario (.ics) | **Ausente** [V] | `calendar` y `weddingStart` existen como datos; UI retirada | — |
| F-83 | Compartir / QR | **Ausente** [V] | No existe | — |
| F-84 | Subida de fotos de invitados | **Ausente** [V] | El texto invita a subir fotos (hashtag) pero no hay función | — |
| F-85 | Música de fondo | **Ausente** [V] | El FAB solo salta a la playlist | — |

---

## 3. Dependencias entre funcionalidades

- **RSVP real** depende de: modelo de invitado/invitación, persistencia, panel de gestión, notificaciones y fecha límite.
- **Regalo real** depende de: persistencia, almacenamiento de comprobantes, conciliación manual o integración de pagos, estado "regalado" compartido entre invitados.
- **Cuenta regresiva / calendario / mapa** dependen de `weddingStart` y de la zona horaria del evento (hoy un único dato).
- **Mensajes de invitados** dependen de moderación y de RSVP/regalo (origen del mensaje).
- **Bilingüe** depende de un modelo de contenido con idiomas, no de CSS.

## 4. Lo que la demo **no** demuestra (aunque lo parezca)

1. Que una confirmación llegue a alguien (no hay red ni almacenamiento).
2. Que un comprobante se guarde.
3. Que un regalo quede reservado para el resto de los invitados.
4. Que exista un panel para la pareja.
5. Que "Tarjeta" cobre algo.
