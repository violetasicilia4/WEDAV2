# ROADMAP — Hallazgos priorizados y criterios de aceptación

**Fecha:** 14/10/2026. **Base:** `AUDIT_FUNCTIONAL.md`, `AUDIT_BLOCKS.md`, `AUDIT_UX_UI.md`, `AUDIT_SEO.md`.
**Esfuerzo relativo:** S (≤1 día) · M (2–5 días) · L (>1 semana).
**Prioridad:** P0 bloquea o genera errores importantes · P1 afecta comprensión, usabilidad o calidad · P2 mejora importante no bloqueante · P3 refinamiento.
**Reglas de uso:** este roadmap **no decide** la arquitectura del constructor ni implementa nada. Mantener separados: (a) corregir la demo, (b) construir producto, (c) copywriting.

---

## A. Corrección de la demo (antes de construir el producto)

### P0
| ID | Hallazgo | Evidencia | Impacto | Alcance | Dep. | Recomendación | Criterio de aceptación | Esf. |
|---|---|---|---|---|---|---|---|---|
| R-01 | Enlaces sin `href` en la landing (35/39 `<a>`) | Tab: 10 paradas; DOM | Acciones de conversión no operables ni alcanzables con teclado | Landing | Decisión de destinos | Definir destino real o transformar en botón con acción | 100 % de CTA alcanzables por Tab y con destino | M |
| R-02 | Demo no demuestra persistencia ni panel | Sin `localStorage`/red; sin ruta de panel | El producto central (recibir RSVP y regalos) no se ve | Demo | Decisión de producto | Definir si la demo mostrará un panel simulado de pareja o solo la vista del invitado | Decisión documentada | S |

### P1
| ID | Hallazgo | Evidencia | Impacto | Rec. | Aceptación | Esf. |
|---|---|---|---|---|---|---|
| R-10 | Éxitos de RSVP y regalo sin indicar demostración | "¡Gracias, Ana!" | El visitante puede creer que realizó un pago o envío real | Decidir si se agrega leyenda (conflicta con la regla actual de no tener "ejemplo" visible) | Decisión explícita + implementación si aplica | S |
| R-11 | Método "Tarjeta" permite enviar sin pagar | Auditoría previa | Percepción de flujo roto o engañoso | Alinear con flujo simulado o retirar la opción en demo | La opción no permite avanzar sin datos o está claramente simulada | S |
| R-12 | RSVP: falta acompañantes, contacto, nota y límite por invitación | Formulario | No cubre el caso real "vengo con 2 personas" de una sola vez | Definir modelo de invitación/grupo | Casos de uso definidos y probados | M |
| R-13 | Regalos: sin cantidad, aportes parciales ni mensaje | Modelo `Gift` | Pierde el caso de fondos y mensajes personales | Agregar campos al modelo y al pop-up | Flujo con mensaje opcional y aporte | M |
| R-14 | Categorías desbalanceadas (50/18/1/2) | Conteos | Filtros parecen vacíos | Redistribuir o reetiquetar contenido de demo | Ninguna categoría con <6 ítems | S |
| R-15 | RSVP solo en barra, cierre y footer; sin CTA persistente | Recorrido | Acción principal poco visible | Evaluar bloque RSVP y/o barra de acción | RSVP alcanzable en ≤1 toque desde cualquier punto | M |
| R-16 | Orden de bloques sin arquitectura validada | `AUDIT_UX_UI.md` §1 | Playlist antes del cierre; logística dispersa | Aplicar orden recomendado en la demo | Orden documentado y revisado con 5 personas | S |
| R-17 | Salto de registro editorial entre portada y resto | Medición y visual | Percepción de calidad | Elegir dirección visual (A/B/C) | Una dirección aprobada y aplicada a todos los bloques | L |
| R-18 | Bloques faltantes para una demo "completa": calendario, alojamiento, transporte, FAQ, cuenta regresiva, info adicional | `AUDIT_BLOCKS.md` | La demo no representa el plan más completo | Implementar bloques P1/P2 | Cada bloque cumple su criterio mínimo | L |
| R-19 | Datos existentes sin UI (`extraEvents`, `greetings`, `infoCards`, `calendar`) | `demo-wedding.ts` | Código muerto/engañoso | Usar o retirar | Cero datos huérfanos | S |

### P2
| ID | Hallazgo | Recomendación | Aceptación | Esf. |
|---|---|---|---|---|
| R-30 | ≥13 tamaños tipográficos | Escala de 6 roles | ≤7 tamaños base | M |
| R-31 | Mayúsculas en 5 usos y 2 estilos de etiqueta | Un estilo de etiqueta | 1 estilo | S |
| R-32 | Títulos de bloque en sans, momentos en serif | Definir regla por dirección visual | Regla documentada | S |
| R-33 | Footer de Weda compite con el cierre | Reducir presencia | Marca secundaria | S |
| R-34 | Playlist ~870 px y poco esencial | Compactar o plegar | ≤600 px | S |
| R-35 | Galería: 5.ª foto oculta en móvil; sin ampliar | Revisar composición | Todas visibles o lógica explícita | M |
| R-36 | Filtro de precio mezcla orden y rango | Dos controles | Orden y rango independientes | S |
| R-37 | Dos `h1` en regalos | Un solo `h1` | 1 `h1` | S |
| R-38 | Imágenes sin dimensiones | `width`/`height` o aspect-ratio | CLS < 0,1 | M |
| R-39 | 71 tarjetas sin paginación | Carga incremental | Primer render ≤24 tarjetas | M |
| R-40 | Estado vacío de búsqueda no verificado | Diseñar y probar | Mensaje y salida clara | S |

### P3
| ID | Hallazgo | Esf. |
|---|---|---|
| R-50 | Fecha repetida en portada y franja (pendiente de copy) | S |
| R-51 | Dress code ocupa ~420 px | S |
| R-52 | Copiar hashtag/alias con confirmación accesible (`aria-live`) | S |
| R-53 | Pruebas en orientación horizontal | S |
| R-54 | Destinos de luna de miel sin UI (solo datos) | S |

---

## B. SEO y calidad técnica

| ID | Hallazgo | Sev. | Esf. | Criterio |
|---|---|---|---|---|
| S-1 | `og:image` de la landing es un placeholder | P1 | S | Imagen real ≥1200×630 |
| S-2 | `og:*` del micrositio heredan los de la landing | P1 | S | `og:*` propios |
| S-4 | Política de indexación de la demo | P1 | S | Decisión + `robots` |
| S-12 | Producción sin verificar | P1 | S | HTML del build revisado |
| S-13 | Metadata por casamiento | P1 | L | Plantilla desde datos del evento |
| S-3/5/6/8 | Canonical, descripción duplicada, `h1` doble, sitemap | P2 | S | Ver `AUDIT_SEO.md` |
| S-9/10/11 | Dimensiones, paginación, Web Vitals | P2 | M | Ver `AUDIT_SEO.md` |

---

## C. Producto (previo al constructor modular; **no** implementar aún)

| ID | Capacidad | Prioridad | Dependencias | Esf. |
|---|---|---|---|---|
| C-01 | Persistencia (invitaciones, RSVP, regalos) | P0 | Modelo de datos | L |
| C-02 | Cuenta/propiedad del evento | P0 | C-01 | L |
| C-03 | Gestión de invitados y grupos | P0 | C-01, C-02 | L |
| C-04 | Almacenamiento y conciliación de comprobantes | P1 | C-01 | M |
| C-05 | Notificaciones (RSVP, regalos) | P1 | C-01 | M |
| C-06 | Moderación (playlist, mensajes, fotos) | P2 | C-01 | M |
| C-07 | Exportables CSV | P2 | C-03 | S |
| C-08 | Anti-spam y límites | P1 | C-01 | S |
| C-09 | Reglas de plan | P1 | C-02 | M |
| C-10 | Metadata y privacidad por casamiento | P1 | C-02 | M |

---

## D. Orden sugerido de ejecución

1. **Decisiones de producto (S):** destinos de la landing (R-01), leyenda de demo (R-10), política de indexación (S-4), alcance de la demo (R-02), dirección visual (R-17).
2. **Corrección rápida de la demo (S/M):** R-11, R-14, R-16, R-19, R-37, S-1, S-2, S-5.
3. **Experiencia:** R-12, R-13, R-15, R-36, R-38/39.
4. **Completar bloques de la demo:** R-18 (calendario → alojamiento/transporte → FAQ → cuenta regresiva).
5. **Dirección visual y tipografía:** R-17, R-30–R-33.
6. **Producto:** C-01 → C-02 → C-03 → C-04/05 → constructor modular.

## E. Lo que **no** debe hacerse todavía
- No construir el constructor modular ni un modelo de bloques.
- No implementar reglas de plan.
- No tocar copy sin etapa propia.
- No considerar la demo equivalente al producto real.
