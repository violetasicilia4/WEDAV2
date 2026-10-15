# AUDIT_UX_UI — Diseño, jerarquía, navegación, responsive y accesibilidad

**Fecha:** 14/10/2026. **Alcance:** `/ejemplo`, `/ejemplo/regalos`, diálogos. Solo lectura.
**Marcas:** **[V]** verificado en pantalla/medición · **[I]** inferido · **[R]** recomendación.
**Importante:** esto es inspección experta, **no** pruebas con personas. Donde dice "probable", es hipótesis.

---

## 1. Orden actual verificado (Fase 3)

Recorrido real de `/ejemplo` [V]:

1. Portada (foto al ~98 % de la altura; nombre, fecha; nav arriba).
2. Franja "¡Nos casamos!" + fecha + 3 eventos (horario, lugar, dirección, mapa).
3. Dress code.
4. Fotos + hashtag.
5. Playlist (formulario + lista).
6. Cierre ("Que vengas ya es un regalo.", CTA RSVP y "Ver lista de regalos").
7. Footer.

`/ejemplo/regalos` [V]: Portada (misma) → "Lista de regalos" + filtros → grilla de 71 → pie "rg-next" → footer. Altura medida: ~15 086 px a 1440 px.

### Problemas del orden actual
| # | Problema | Evidencia | Severidad |
|---|---|---|---|
| O-1 | El invitado no ve en la primera pantalla *qué debe hacer* (RSVP) ni cuándo/dónde: la foto ocupa ~98 % y solo muestra nombre y fecha | [V] | P1 |
| O-2 | El RSVP —la acción principal— aparece recién al final del scroll o en la barra translúcida | [V] | P1 |
| O-3 | La playlist (acción opcional) pesa ~870 px y va antes del cierre, interponiéndose entre contenido emocional y la acción | [V] | P2 |
| O-4 | Dress code ocupa ~420 px para una línea + 4 muestras | [V] | P2 |
| O-5 | La lista de regalos es una página separada de ~15 000 px sin paginación, sin "ver más", sin acceso rápido a RSVP | [V] | P1 |
| O-6 | La fecha se repite (portada y franja) | [V] | P3 |

### Orden recomendado [R]
1. **Portada** — identidad + fecha + (acción primaria RSVP visible).
2. **Datos del evento** — cuándo/dónde, con mapa y calendario.
3. **RSVP** — bloque propio con CTA (no solo en la barra).
4. **Cuenta regresiva** (opcional) — emoción breve.
5. **Dress code** — compacto, junto a los datos del evento.
6. **Lista de regalos** — resumen (destacados) + enlace a la lista completa.
7. **Galería + hashtag** — emoción.
8. **Alojamiento / Transporte / FAQ** — logística secundaria, plegada.
9. **Playlist** — participación opcional.
10. **Cierre emocional** — con CTAs a RSVP y regalos.
11. **Footer**.

**Justificación:** primero lo que el invitado necesita para decidir si va (qué, cuándo, dónde) → luego la acción prioritaria (confirmar) → luego lo que aporta emoción → luego lo opcional. Se evita una página larga manteniendo logística plegable y regalos en página propia con resumen.

**Omisibles sin afectar la experiencia:** Playlist, Galería, Hashtag, Cuenta regresiva, FAQ, Alojamiento, Transporte, Mensajes.
**Siempre accesibles (aunque no se recorra la página):** RSVP, regalos, mapa/dirección y fecha/hora → [R] deben estar en la navegación o en una barra de acción.

---

## 2. Diseño visual: hallazgos (Fase 4)

### 2.1 Qué funciona [V]
- Portada editorial real: foto a pantalla casi completa, nombre en serif de alto contraste, fecha en mayúsculas pequeñas. Es la parte que **sí** parece invitación de casamiento.
- Superficies claras y cálidas (blanco / crema `#f5f2eb`), alternancia de fondo por bloque.
- Eventos en columnas con filetes finos: legible y ordenado.

### 2.2 Qué no funciona o es débil
| # | Hallazgo | Evidencia | Principio afectado | Sev. |
|---|---|---|---|---|
| D-1 | **Salto de registro editorial**: portada de revista → resto con apariencia de aplicación genérica (tarjetas, botones píldora grises, formularios) | [V] | Consistencia | P1 |
| D-2 | **Demasiados tamaños**: ≥13 tamaños distintos en `/ejemplo` (10, 12, 12.5, 13, 13.3, 14, 15, 16, 17.76, 18, 22.2, 31, 43, 77.7 px), varios fraccionarios por `clamp()` | [V] medición | Escala | P2 |
| D-3 | **Mayúsculas en 5 lugares** (fecha portada, "¡Nos casamos!", fecha de franja, etiquetas de evento, "Dress code") con dos estilos de etiqueta: 16 px / .14em vs 12 px / .1em | [V] | Jerarquía | P2 |
| D-4 | **Un solo momento serif en la mitad inferior**: el cierre y el hashtag usan Instrument Serif, pero títulos de bloque ("Elegante sport", "Un poco de nosotros.") están en DM Sans | [V] | Consistencia | P2 |
| D-5 | **Footer de Weda** (bloque azul-gris grande con logo de 38 px y frase de 25 px) compite con el cierre de la pareja | [V] | Jerarquía | P2 |
| D-6 | **Cierre con foto oscurecida**: velo y bordes redondeados; funciona pero el texto "Con todo cariño…" es pequeño frente al titular | [V] | Jerarquía | P3 |
| D-7 | **Playlist**: bloque de 2 columnas con lista larga; es el más alto de la página y el menos esencial | [V] | Densidad | P2 |
| D-8 | **Lista de regalos**: grilla de 71 tarjetas uniformes sin jerarquía (no hay destacados, ni "más regalados"); 50/71 son de luna de miel | [V] | Jerarquía | P1 |
| D-9 | **Dress code**: bloque de 424 px para poco contenido; ritmo vertical irregular | [V] | Ritmo | P3 |
| D-10 | **Galería en móvil**: la 5.ª foto se oculta (`.m5 {display:none}`); sin ampliar | [V] | Completitud | P2 |
| D-11 | **Textos secundarios** (direcciones 13 px, etiquetas 12 px, copyright 12 px) en el borde inferior legible | [V] | Legibilidad | P3 |
| D-12 | **Fotografía de la portada** con cielo muy azul: el velo uniforme anterior la enfriaba; hoy es un velo localizado (mejora ya aplicada) | [V] | Tratamiento de foto | — |

### 2.3 ¿Parece una invitación de casamiento o una landing/dashboard?
**Veredicto [I]:** la **portada y la franja de eventos** sí; **playlist, regalos y diálogos** se perciben como **producto** (útil y limpio, no editorial). No es un dashboard, pero tampoco una invitación "de boda" de punta a punta. La causa principal es la ausencia de un lenguaje editorial compartido (D-1, D-4).

---

## 3. Tres direcciones visuales (sin implementar)

> No crean una identidad nueva: son opciones sobre la base actual. **Constantes de Weda en las tres:** marca y navegación, componentes interactivos (botones, formularios, diálogos), accesibilidad (contraste ≥4,5:1, foco, 44 px), DM Sans para texto funcional.

### A. Editorial minimalista
- **Paleta:** blanco, crema `#f5f2eb`, gris azulado `#707d87` solo en acciones, negro cálido para texto.
- **Tipografía:** Instrument Serif solo en nombre, fecha y 1 frase; DM Sans para el resto.
- **Escala:** 108 / 40 / 24 / 16 / 14 / 12 (web); 56 / 30 / 22 / 16 / 14 / 12 (móvil).
- **Fotografía:** protagonista, bordes rectos o muy poco radio, sin velo salvo zona del texto.
- **Botones/superficies:** píldora sólida única; sin tarjetas con sombra; filetes finos.
- **Espacios en blanco:** muy amplios; poca densidad.
- **Distintivo:** casi sin color; todo lo hace la foto y el tipo.

### B. Romántica contemporánea
- **Paleta:** crema, arena, toques suaves de verde salvia o rosa empolvado (derivados de la foto).
- **Tipografía:** serif más presente (títulos de bloque en serif, itálica solo para una frase corta).
- **Escala:** 96 / 44 / 28 / 17 / 14 / 12.
- **Fotografía:** marcos con radio generoso, detalles de textura sutil.
- **Botones/superficies:** píldoras suaves; tarjetas tonales sin borde.
- **Espacios:** amplios con ornamentos mínimos (separadores).
- **Distintivo:** calidez y color derivado de la foto del evento.

### C. Clásica elegante
- **Paleta:** marfil, negro, un acento (burdeos o azul noche).
- **Tipografía:** serif en títulos y numerales, versalitas con interletrado moderado; sans solo funcional.
- **Escala:** 88 / 36 / 22 / 16 / 14 / 12, jerarquía tradicional y centrada.
- **Fotografía:** formato retrato/oval, marco fino.
- **Botones/superficies:** rectángulos de esquinas casi rectas; filetes dobles.
- **Espacios:** compactos y simétricos, composición centrada.
- **Distintivo:** formalidad; simetría estricta.

**Recomendación [R]:** A como base del sistema (es la más cercana a lo existente y a la identidad de Weda), con B como variante opcional por evento. C solo si hay demanda comprobada.

---

## 4. Sistema tipográfico (4.2)

### Roles actuales [V]
| Rol | Fuente | Tamaño (desktop) | Observación |
|---|---|---|---|
| Nombre de la pareja | Instrument Serif 400 | 64–108 px (77.7 a 1110) | Correcto; interlineado 1 |
| Hashtag / frase de cierre | Instrument Serif 400 | 28–36 / 42–62 px | Ya aplicado |
| Fecha portada y "¡Nos casamos!" | DM Sans 400, mayúsculas, .14em | 16 px | Dos etiquetas con estilo 16 px/.14em |
| Título de bloque | DM Sans 400 | 31 px | Sin serif |
| Texto principal | DM Sans 400 | 15–16 px | Aceptable |
| Etiquetas | DM Sans 400 mayúsculas | 12 px / .1em | Segundo estilo de etiqueta |
| Secundarios | DM Sans 400 | 12–14 px | Direcciones 13 px |
| Landing | Arial 400 | 42 px h1 | Fuera del alcance |

### Inconsistencias [V]
- Dos estilos de etiqueta.
- Fracciones (17.76, 13.32, 22.2 px).
- Peso único 400: la jerarquía depende solo del tamaño; no hay peso medio para etiquetas ni datos.
- Todos los títulos de bloque en sans, mientras el cierre y el hashtag van en serif.

### Escala propuesta [R]
| Rol | Desktop | Móvil | Fuente |
|---|---|---|---|
| Nombre de la pareja | 72–108 | 46–60 | Instrument Serif |
| Título de bloque | 36–44 | 28–32 | Instrument Serif (si dirección A/B) o DM Sans |
| Subtítulo / hora | 20–24 | 18–20 | DM Sans |
| Texto | 16 | 16 | DM Sans |
| Secundario | 14 | 14 | DM Sans |
| Etiqueta | 12, mayúsculas, .1em | 12 | DM Sans |

**Reglas para nombres largos [R]:** permitir 2 líneas por encima de 26 caracteres, reducir tamaño por `clamp()` según longitud (no por JS), `text-wrap: balance`, nunca truncar con puntos suspensivos en el nombre de la pareja.
**Identidad de Weda vs. de la invitación:** Weda = DM Sans/Arial funcional, controles y marca; invitación = serif y composición del evento.

---

## 5. Responsive y accesibilidad (Fase 5)

### 5.1 Resultados [V]
Anchos: **320, 360, 402, 768, 1110, 1440 px**; páginas: landing, `/ejemplo`, `/ejemplo/regalos`.

| Chequeo | Resultado |
|---|---|
| Desborde horizontal | 0 en los 18 casos |
| Nombres de regalos cortados | 0 (a 320 px se reduce 1 punto) |
| Eventos en móvil | 1 por renglón ≤520 px; sin cortes |
| Diálogos en viewport | Entran a 320–1440 px; a 320×568 el de regalo tiene scroll interno |
| Foco visible | Anillo en todas las paradas verificadas |
| Teclado | Orden lógico; foco atrapado y devuelto al disparador; RSVP completo con teclado ✅ |
| Contraste testimonios (landing) | 5,2–6,4:1 |
| Contraste navegación sobre foto | ≥4,69:1 sobre 3 fotos |
| Movimiento reducido | Reglas presentes para transiciones/hover; video del hero se pausa |

### 5.2 Problemas por severidad
| # | Problema | Cómo reproducirlo | Sev. |
|---|---|---|---|
| R-1 | **~30 enlaces sin `href` en la landing** (35 de 39 `<a>`): no son alcanzables con Tab ni activables | Tab desde el inicio de `/` → solo 10 paradas | **P0** (fuera del micrositio) |
| R-2 | Imágenes sin `width`/`height` (landing 10/10, micrositio 6/6, regalos 72/72) | Inspeccionar `<img>` | P2 (riesgo de CLS) |
| R-3 | 71 imágenes con `loading="lazy"` y `alt=""` en regalos: correcto como decorativas, pero el nombre del regalo vive solo en `h3` | Ver DOM | P3 |
| R-4 | Dos `h1` en `/ejemplo/regalos` ("Ignacio & Martina" y "Lista de regalos") | `document.querySelectorAll('h1')` | P2 |
| R-5 | Cierre de diálogo con Esc/botón no se pudo reproducir en headless (artefacto de foco), sí en el navegador real | — | Info |
| R-6 | Orientación horizontal en móvil **no verificada** | — | No verificado |
| R-7 | Lectores de pantalla **no verificados** | — | No verificado |
| R-8 | Teclado virtual real **no verificado**; diálogo limita altura con `dvh` y áreas seguras [I] | — | No verificado |
| R-9 | Contraste de la burbuja de navegación sobre fotos nuevas depende del fondo propio (62 %); validar con cada foto | — | P3 |

---

## 6. Evaluación de la experiencia de demostración (Fase 7)

| Pregunta | Respuesta honesta |
|---|---|
| ¿Se entiende qué se ve? | Sí al llegar desde la landing ("Volver a Weda" visible), pero no hay aclaración de que es un ejemplo (decisión previa de no poner leyendas) |
| ¿Parece invitación real? | La portada sí; la segunda mitad parece producto |
| ¿Orden natural? | Razonable, no óptimo (ver §1) |
| ¿Se encuentra el RSVP? | Sí, pero poco visible en primera pantalla |
| ¿Se entiende cómo llegar? | Sí (mapa); falta "cómo llegar" (transporte/estacionamiento) |
| ¿Lista con variedad y coherencia? | Variedad alta (71), pero 70 % luna de miel y dos categorías casi vacías |
| ¿Navegación invitación ↔ regalos? | Intuitiva |
| ¿Visualmente cuidada? | Portada sí; el resto "correcto" |
| ¿Jerarquía tipográfica clara? | Parcial (ver §4) |
| ¿Móvil diseñado o adaptado? | **Adaptado con cuidado** (eventos en lista, filtros apilados, diálogos); no distinto en concepto |
| ¿Qué reduce la confianza? | Éxitos sin aviso de demo, "Tarjeta" que no cobra, enlaces muertos en la landing, footer con textos en inglés |

## 7. Pendientes de contenido (no tocar copy, registrar)
- Fecha repetida (portada y franja).
- Footer de landing con textos en inglés y marcas heredadas ("Shop All", "SeedLabs", "Superfiliate").
- Éxito del RSVP y del regalo sin aviso de demostración.
- Categorías "Experiencias" (1) y "Proyectos futuros" (2) casi vacías.
- Plan Premium sin diferencial explícito (landing).
