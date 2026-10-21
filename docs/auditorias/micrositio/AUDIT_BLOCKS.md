# AUDIT_BLOCKS — Catálogo de bloques, prioridades y dependencias

**Estado:** propuesta de auditoría. **No define la arquitectura técnica del constructor** ni asigna bloques a planes de forma definitiva.
**Leyenda de tipo:** **V** = sección visual · **A** = atributo/configuración transversal · **F** = función/capacidad que opera detrás.
**Leyenda de estado:** ✅ existe en la demo · ◐ parcial · ✖ ausente. Las reglas de plan son hipótesis para validar (**[R]**).

> Principio: separar **lo que se ve** (bloque) de **lo que opera detrás** (capacidad). Una "Lista de regalos" es un bloque (V) que depende de capacidades independientes: catálogo, pagos/comprobantes, persistencia y estado compartido (F).

---

## 1. Resumen

| Prioridad | Bloques | Criterio |
|---|---|---|
| **P0 esenciales** | Portada, Datos del evento (fecha + lugares), RSVP, Navegación | Sin esto no hay invitación |
| **P1 importantes** | Lista de regalos, Mapa/cómo llegar, Dress code, Calendario (.ics), Cierre/mensaje, Footer | Enriquecen y resuelven preguntas frecuentes |
| **P2 complementarios** | Galería, Hashtag/fotos, Playlist, Cuenta regresiva, Alojamiento, Transporte, FAQ | Personalización e información adicional |
| **P3 avanzados** | Mensajes de invitados, Bilingüe, Subida de fotos, Mesas/ubicación, Personalización visual, Dominio propio, Estadísticas | Planes superiores o iteraciones futuras |

---

## 2. Catálogo de bloques visibles (V)

### P0 — Esenciales

#### B-01 Portada
- **Invitado:** saber de qué evento se trata en 2 segundos.
- **Pareja:** primera impresión; fijar tono editorial.
- **Tipo:** V. **Estado demo:** ✅. **Real:** no verificable.
- **Contenido/config:** foto, nombres, fecha, (opcional) ciudad, texto corto; recorte/foco de la foto.
- **Dependencias:** biblioteca de fotos; Navegación.
- **Aceptación:** nombre legible sobre cualquier foto (≥4,5:1), sin desborde con nombres largos, foto con foco configurable, `alt` editable.
- **Responsive:** foto ocupa casi toda la altura; en móvil nombre ≤2 líneas.
- **A11y:** un único `h1`; foto con texto alternativo; contraste con scrim propio.
- **Plan:** [R] todos.

#### B-02 Datos del evento (fecha y lugares)
- **Invitado:** saber cuándo y dónde, en qué orden.
- **Pareja:** evitar preguntas repetidas.
- **Tipo:** V. **Estado demo:** ✅ (3 eventos). **Real:** no verificable.
- **Contenido:** 1..N eventos (nombre, hora, lugar, dirección, nota, enlace de mapa, ícono).
- **Dependencias:** Mapa; Calendario.
- **Aceptación:** admite 1 a 6 eventos sin romper la composición; hora y dirección siempre visibles; "a confirmar" como estado.
- **Responsive:** columnas (≥521 px) → lista (≤520 px).
- **A11y:** lista semántica `<ol>`; enlaces de mapa con nombre accesible y aviso de pestaña nueva.
- **Plan:** [R] todos; cantidad máxima de eventos podría variar por plan.

#### B-03 RSVP (confirmación de asistencia)
- **Invitado:** confirmar rápido, sin cuenta, en móvil.
- **Pareja:** cerrar cantidades y restricciones.
- **Tipo:** V (acceso) + F (formulario, validación, almacenamiento, notificaciones).
- **Estado demo:** ◐ simulada. **Real:** no verificable.
- **Contenido/config:** campos (nombre, apellido, asistencia, menú), acompañantes, campo libre, fecha límite, mensaje de agradecimiento.
- **Dependencias:** Gestión de invitados (F), persistencia (F), notificaciones (F).
- **Aceptación:** envío recuperable ante error; confirmación imposible de duplicar sin aviso; estado de éxito y error; datos persistentes.
- **Responsive:** diálogo de alto máximo con scroll interno; teclado virtual sin tapar el botón principal.
- **A11y:** foco atrapado, foco devuelto al cerrar (✅ verificado), errores asociados a campos.
- **Plan:** [R] básico para todos; grupos/códigos de invitación en planes superiores.

#### B-04 Navegación
- **Invitado:** moverse entre Invitación, Regalos y RSVP.
- **Tipo:** V + A. **Estado demo:** ✅. **Aceptación:** accesos siempre alcanzables; sección actual indicada; contraste ≥4,5:1 sobre cualquier foto.
- **Plan:** [R] todos.

### P1 — Importantes

#### B-10 Lista de regalos
- **Invitado:** elegir y aportar sin fricción. **Pareja:** recibir aportes con mensaje e identificación.
- **Tipo:** V + F (catálogo, pago/comprobante, estado compartido, panel).
- **Estado demo:** ◐ simulada. **Real:** no verificable.
- **Contenido/config:** categorías, ítems (foto, nombre, texto, monto, cantidad, aportes parciales), métodos de pago, alias/instrucciones, mensaje.
- **Dependencias:** persistencia; comprobantes; panel de pareja.
- **Aceptación:** estado "regalado" compartido; mensaje opcional; estado vacío; cantidades y aportes parciales; demostración marcada como tal.
- **Responsive:** 3 columnas web / 2 móvil; filtros en una fila (web) y apilados (móvil).
- **A11y:** nombres en una línea con `title`; botones ≥44 px; filtros con etiquetas.
- **Plan:** [R] básico (lista simple) para todos; metas, aportes parciales y reportes en planes superiores.

#### B-11 Mapa / cómo llegar
- **Tipo:** V (enlace) + F opcional (mapa embebido).
- **Estado demo:** ◐ (solo enlace a Google Maps).
- **Aceptación:** enlace a mapa por cada lugar; opcional estacionamiento y transporte (ver B-23).
- **Plan:** [R] enlace en todos; mapa embebido en planes superiores.

#### B-12 Dress code
- **Estado:** ✅. **Aceptación:** título + descripción + muestras con nombre; no comunicar solo con color.
- **Plan:** [R] todos.

#### B-13 Agregar al calendario
- **Tipo:** F (archivo .ics / enlace). **Estado:** ✖ (datos `calendar` sin UI).
- **Aceptación:** descarga .ics con hora local y zona; funciona en iOS y Android.
- **Plan:** [R] todos.

#### B-14 Cierre / mensaje emocional
- **Estado:** ✅. **Aceptación:** frase editable; CTAs a RSVP y regalos visibles.
- **Plan:** [R] todos.

#### B-15 Footer
- **Estado:** ✅. **Aceptación:** marca de Weda reconocible pero secundaria; enlaces funcionales.
- **Plan:** [R] marca visible en planes básicos; opción de ocultar marca en planes superiores.

### P2 — Complementarios

| ID | Bloque | Objetivo invitado | Objetivo pareja | Estado demo | Config mínima | Aceptación mínima |
|---|---|---|---|---|---|---|
| B-20 | Galería | Conocer a la pareja | Contar su historia | ◐ (5 fotos; 4 en móvil) | 3–12 fotos, `alt`, orden | Sin miniaturas <120 px; ampliar; carga diferida |
| B-21 | Hashtag y fotos | Saber cómo compartir | Reunir fotos | ✅ (texto) | Hashtag, usuario | Copiar hashtag; enlace |
| B-22 | Playlist | Aportar música | Recibir ideas | ◐ simulada | Lista, enlace opcional | Moderación (F); persistencia (F) |
| B-23 | Alojamiento y transporte | Resolver logística | Reducir consultas | ✖ | Hoteles (nombre, enlace, código), traslados | Enlaces válidos; datos opcionales |
| B-24 | Cuenta regresiva | Emoción | Recordatorio | ✖ | Fecha/hora, zona | Nunca negativa; `aria-live` apagado |
| B-25 | Preguntas frecuentes | Responder dudas | Evitar mensajes | ✖ | 3–10 Q&A | Acordeón accesible |
| B-26 | Información adicional | Cualquier dato extra | Flexibilidad | ✖ (`infoCards` sin UI) | Título + texto | Orden configurable |

### P3 — Avanzados

| ID | Bloque | Tipo | Notas |
|---|---|---|---|
| B-30 | Mensajes de invitados | V + F | Requiere moderación, privacidad y origen (RSVP/regalo) |
| B-31 | Invitación bilingüe | A + F | Modelo de contenido por idioma; `lang` por sección |
| B-32 | Subida de fotos de invitados | V + F | Almacenamiento, moderación, límites |
| B-33 | Ubicación en mesas | V + F | Depende de gestión de invitados |
| B-34 | Personalización visual (colores/tipografías) | A | Dentro de límites del sistema editorial de Weda |
| B-35 | Dominio propio / URL personalizada | F | SEO e indexación por casamiento |
| B-36 | Estadísticas | F | Aperturas, confirmaciones, regalos |

---

## 3. Capacidades que operan detrás (F)

| ID | Capacidad | Hoy | Necesaria para |
|---|---|---|---|
| C-01 | Persistencia de datos (invitaciones, RSVP, regalos) | ✖ | RSVP, Regalos, Playlist, Mensajes |
| C-02 | Autenticación y propiedad del evento | ✖ [I] | Panel, edición |
| C-03 | Gestión de invitados y grupos | ✖ | RSVP real, mesas |
| C-04 | Almacenamiento de comprobantes | ✖ | Regalos por transferencia |
| C-05 | Integración de pagos | ✖ [I] | Método "Tarjeta" real |
| C-06 | Notificaciones (email/WhatsApp) | ✖ | RSVP, regalos |
| C-07 | Moderación | ✖ | Playlist, Mensajes, Fotos |
| C-08 | Exportables (CSV de invitados y regalos) | ✖ | Operación de la pareja |
| C-09 | Anti-spam / limitación de envíos | ✖ | RSVP, Regalos |
| C-10 | Generación de metadata por casamiento | ✖ | SEO y compartidos (ver AUDIT_SEO.md) |

---

## 4. Dependencias entre bloques

```
Portada ── Navegación ──┬── Datos del evento ── Mapa ── Alojamiento/Transporte
                        │         └── Calendario (.ics) ── Cuenta regresiva
                        ├── RSVP ── Gestión de invitados ── Mesas
                        └── Lista de regalos ── Comprobantes/Pagos ── Mensajes
Cierre ── (CTA a RSVP y Regalos)
```

## 5. Reglas de disponibilidad por plan (hipótesis a validar, no decisión)

| Plan hipotético | Bloques |
|---|---|
| Básico | Portada, Datos del evento, Dress code, RSVP básico, Cierre, Footer con marca |
| Intermedio | + Lista de regalos, Galería, Hashtag, Calendario, Mapa |
| Completo | + Playlist, Alojamiento/Transporte, FAQ, Cuenta regresiva, aportes parciales, exportables |
| Superior | + Mensajes, Bilingüe, Subida de fotos, Mesas, Dominio propio, Estadísticas |

> La demo actual debería representar el plan más completo, tal como se definió. Hoy **no** lo hace del todo: faltan B-13, B-23, B-24, B-25, B-26 y B-30.
