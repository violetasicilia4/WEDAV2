# Auditoría integral de la landing de Weda — Resumen ejecutivo

Fecha: 2026-11-03 · Alcance: landing pública (`/`) y su página hermana `/lista-de-regalos`, el paso a registro (`/crear/cuenta`) y lo que el sitio publicado entrega al navegador.
Tipo: **solo lectura**. No se modificó código, estilos, configuración ni datos (ver §9).

## 1. Respuesta corta

> Si una pareja llega hoy desde Instagram, ¿la landing transmite valor, genera confianza y la lleva a registrarse desde el celular?

**A medias, y hoy el último paso está roto en producción.**

- **Lo que funciona:**
  - La landing se entiende rápido y se ve cuidada en celular.
  - Muestra el producto real: maquetas de la lista, el sitio y la confirmación hechas con datos del catálogo.
  - Dice cosas verdaderas que generan confianza: «Weda no cobra ni mueve el dinero de los regalos».
  - No tiene errores técnicos visibles: ningún tamaño tiene scroll horizontal, todos los links funcionan y la página respeta «reducir movimiento».
- **Lo que la frena:**
  1. **En el sitio publicado (`weda-v2.vercel.app` y `www.weda.app`) no se pueden crear cuentas ni iniciar sesión.**
     - La API responde `503 backend_unavailable`.
     - La interfaz no lo avisa: después de «Registrarme» la pareja pasa al onboarding como si se hubiera registrado.
     - Lo mismo pasa con «Iniciar sesión».
     - Es el hallazgo más grave de la auditoría (**F-01, P0**).
  2. El plan Regalos promete «**Alias y tarjeta para recibir**» y **la tarjeta no existe**. La propia `/lista-de-regalos` dice lo contrario (**F-02, P1**).
  3. El paso de la landing al registro **desmonta la landing y la vuelve a cargar dentro de un `iframe`**. Se pierde el scroll y se reinician las animaciones (**F-03, P1**).
  4. En un celular de gama media con red lenta la página tarda en responder:
     - TBT de 1,0 a 2,3 s e INP de 290 a 500 ms (aproximados).
     - Se descargan 1,7 MB de video y 106 KB de CSS del panel que no se usan (**F-04, F-05, F-06**).
  5. El diferencial, «sin comisión» y la lista de regalos, **no aparece en la primera pantalla** (**F-07**, hipótesis).

## 2. Estado general por área

| Área | Estado | Comentario |
|---|---|---|
| Claridad de propuesta | Bien | El hero y la bajada dicen qué es. Falta el diferencial arriba. |
| Conversión / registro | **Bloqueado en producción** | El registro funciona en local; en producción falla sin avisar (F-01). |
| Mobile | Bien | Sin overflow de 320 a 1440 px, objetivos táctiles de 44 px o más, tipografía legible. Es larga: entre 9 y 12 pantallas. |
| Visual / UI | Bien con deuda | Ejecución cuidada. El CSS está muy fragmentado: 81 tamaños de letra, 31 radios, 36 sombras (F-15). |
| Accesibilidad | Aceptable | Foco visible, `alt`, un solo `h1`, «reducir movimiento». Contraste 3,08:1 en el verde de los CTA (F-08). |
| Performance | Regular en móvil | En compu: LCP 0,8–0,9 s y CLS ~0. En móvil 4G lento con CPU 4× más lenta: LCP 3,4–3,6 s y TBT de 1 a 2 s. |
| Seguridad frontend | Bien | Sin source maps, sin secretos, cookies `HttpOnly`/`SameSite`, control de origen y límites de intentos. Faltan CSP y `frame-ancestors` (F-09). |
| Marca | Bien con señales genéricas | Producto real, tono propio. Algunos patrones de plantilla: tres tarjetas, tres planes, rótulo «/TESTIMONIOS» y carrusel (06). |

## 3. Top 10 problemas

| # | ID | Sev. | Problema |
|---|---|---|---|
| 1 | F-01 | P0 | En producción no hay cuentas (API 503) y el registro y el login siguen sin avisar. |
| 2 | F-02 | P1 | El plan Regalos promete «tarjeta», que no existe; se contradice con la FAQ. |
| 3 | F-03 | P1 | «Crear mi evento» e «Iniciar sesión» desmontan la landing y la recargan en un `iframe`: se pierden el scroll y el estado. |
| 4 | F-04 | P1 | En celulares lentos la página tarda en responder (TBT 1–2,3 s, INP 290–500 ms) y los toques antes de que cargue se pierden: el menú falla de forma intermitente. |
| 5 | F-05 | P1 | El video de 1,7 MB se descarga igual en datos móviles. |
| 6 | F-27 | P2 | La animación de entrada oculta el título y los botones del hero durante la carga. |
| 7 | F-06 | P2 | La landing carga 106 KB de CSS del panel y del micrositio que no usa. |
| 8 | F-07 | P2 | El diferencial («sin comisión», la lista de regalos) recién aparece en la tercera o cuarta pantalla del celular. |
| 9 | F-12 | P2 | Los planes no tienen acción al lado: el momento de decidir queda sin botón. |
| 10 | F-13 | P2 | «Registrarme con Google» se ve como un botón real, pero no funciona. |

## 4. Top 10 oportunidades

| # | Oportunidad | Hallazgos |
|---|---|---|
| 1 | Habilitar las cuentas en producción. Mientras tanto, decirlo con claridad y no simular un registro. | F-01 |
| 2 | Abrir el registro como un modal sobre la landing ya montada, que al cerrarse vuelva al mismo lugar. | F-03 |
| 3 | Llevar «sin comisión» y la lista de regalos a la primera pantalla: bajada o un renglón bajo los botones. | F-07 |
| 4 | Video liviano para celular (recorte vertical, menos de 600 KB) o solo portada con datos móviles. | F-05 |
| 5 | Separar el CSS del panel del de la landing. | F-06 |
| 6 | Que el hero se vea desde el primer cuadro y animar solo el video. | F-27 |
| 7 | Sumar una FAQ corta en la landing con las tres dudas que frenan: dinero, comisión y qué pasa con mis invitados. | F-24 |
| 8 | Volver a dar una acción a los planes («Empezar gratis» o «Armar mi lista»), o un CTA único bajo la grilla. | F-12 |
| 9 | Consolidar los tokens de diseño: tamaños, radios, sombras, colores. | F-15 |
| 10 | Cabeceras de seguridad (CSP, `frame-ancestors 'self'`, `Permissions-Policy`) y una URL canónica coherente con el sitemap. | F-09, F-11 |

## 5. Roadmap por etapas (detalle en `08-prioritized-roadmap.md`)

1. **Etapa 0 — Bloqueantes (antes de invertir en tráfico):**
   - F-01: cuentas en producción, o un aviso honesto.
   - F-02: corregir la promesa de «tarjeta».
2. **Etapa 1 — Conversión y mobile:**
   - F-03: registro en modal.
   - F-27: hero visible desde el primer cuadro.
   - F-07: diferencial arriba.
   - F-12: acción en los planes.
   - F-13: botón de Google.
3. **Etapa 2 — Performance y seguridad:**
   - F-04, F-05, F-06, F-17: peso, CSS y video.
   - F-09: cabeceras.
   - F-10: verificar el pago de prueba.
   - F-11: SEO.
4. **Etapa 3 — Calidad y marca:**
   - F-15: tokens.
   - F-16, F-19, F-20, F-22, F-23 y señales genéricas.

## 6. Qué preservar de la identidad de Weda

- **Tipografía:** Geist, una sola familia, con títulos de tracking cerrado. Fue una decisión explícita de la dueña. El brief de esta auditoría habla de Instrument Serif y DM Sans, pero ninguna de las dos existe en el proyecto (ver F-20). La recomendación es actualizar el brief, no la tipografía.
- **Voz:** voseo rioplatense, frases cortas y honestas («Weda no cobra ni mueve el dinero de los regalos»).
- **Hero:** el video en blanco y negro y color, con el título «Tu casamiento empieza antes del gran día.», la barra flotante de dos píldoras y el botón verde.
- **Maquetas del producto real**, con regalos, montos e invitados del catálogo de ejemplo, en lugar de ilustraciones o imágenes de stock.
- **Ritmo de secciones** blanco y gris (#f6f7f8), con el verde #959571 reservado al cierre, la barra de invitados y los botones principales.
- **Hojas apiladas de Regalos** y su cierre con un único botón.
- **Testimonios reales**, con foto y consentimiento.
- **Respeto por «reducir movimiento»** y el cuidado del celular: sin overflow y con objetivos táctiles de 44 px o más.

## 7. Diagnóstico de preparación para conversión

- **Contenido y diseño:** listos en un 75%. Faltan el diferencial arriba, una FAQ corta y acción en los planes.
- **Embudo técnico en producción:** **no está listo**. El registro no crea cuentas, y el paso al registro recarga la landing.
- **Recomendación:** no pagar tráfico ni pautar en Instagram hasta cerrar F-01 y F-02.

## 8. Método y límites

- **Medido:**
  - Mediciones con Playwright y Chrome real sobre el servidor local (estado actual del árbol de trabajo) y sobre el sitio publicado `https://weda-v2.vercel.app`, que corresponde al commit `af38336`.
  - Métricas tomadas con `PerformanceObserver` (FCP, LCP, CLS, long tasks para estimar TBT, event timing para estimar INP), con red 4G lenta y CPU 4× más lenta emuladas por CDP.
  - **No se usó Lighthouse**, porque no está instalado y la consigna prohibía instalar dependencias. Los valores son comparables pero **no son puntajes Lighthouse**.
- **Inspeccionado:** código fuente, bundles publicados, cabeceras HTTP y rutas de la API, solo con `GET` sobre producción.
- **No probado:**
  - Registro real en producción: no se enviaron formularios a producción.
  - Pagos.
  - Cuentas autenticadas reales.
  - Dispositivos físicos: todo es emulación.
- **Habilidades usadas como criterio:**
  - `design-taste-frontend` (tasteskill v2), instalada en el proyecto.
  - `web-design-guidelines`, `responsive-mastery` y `product-design`, disponibles en la sesión.
  - No existe una skill «Impeccable». `ui-ux-pro-max` solo figura en el catálogo, sin contenido.
  - Donde las reglas de la skill chocan con decisiones de marca (por ejemplo, prohíbe la navegación en píldoras de vidrio), prevaleció la decisión de Weda.

## 9. Confirmación de solo lectura

No se modificó ningún archivo del proyecto fuera de esta carpeta (`docs/auditoria-landing/`). El estado de git antes y después coincide (verificado con hashes). Hay cambios sin commitear **anteriores** a la auditoría, del turno de trabajo previo:

- `public/hero.mp4`
- `public/hero-poster.jpg`
- `src/gift-mocks.css`
- `src/routes/index.tsx`
- `src/styles.css`

No se hicieron commits, push ni deploy.
