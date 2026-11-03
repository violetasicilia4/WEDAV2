# 08 · Roadmap priorizado

Severidades:
- **P0:** impide el uso o compromete datos.
- **P1:** problema grave de conversión, funcionalidad, mobile o seguridad.
- **P2:** problema importante de calidad o usabilidad.
- **P3:** refinamiento.

Esfuerzo:
- **S:** menos de medio día.
- **M:** de 1 a 3 días.
- **L:** más de 3 días.

## Índice de hallazgos

| ID | Sev. | Categoría | Hallazgo | Esfuerzo | Doc. |
|---|---|---|---|---|---|
| F-01 | **P0** | Funcional / datos | Producción sin cuentas (API 503); el registro y el login siguen sin avisar | S (aviso) / M–L (infraestructura) | 02, 07 |
| F-02 | **P1** | Contenido / legal | Plan Regalos promete «tarjeta» | S | 02 |
| F-03 | **P1** | UX / navegación | El registro y el ingreso desmontan la landing y la recargan en un `iframe` | M | 07 |
| F-04 | **P1** | Performance / interacción | TBT 1–2,3 s e INP 290–500 ms en celular lento; toques perdidos | M | 04 |
| F-05 | **P1** | Performance / datos | Video de 1,7 MB en datos móviles | S–M | 04 |
| F-27 | P2 | Animación / conversión | El hero se ve sin botones durante la carga | S | 01 |
| F-06 | P2 | Performance | 106 KB de CSS del panel en la landing | S–M | 04 |
| F-07 | P2 | Propuesta de valor | Diferencial fuera de la primera pantalla | S | 02 |
| F-08 | P2 | Accesibilidad | Contraste de 3,08:1 en el verde (decisión aceptada por la dueña) | S | 03 |
| F-09 | P2 | Seguridad | Sin CSP, `frame-ancestors` ni `Permissions-Policy` | S–M | 05 |
| F-10 | P2 | Seguridad | Pago de prueba: verificar que nunca se habilite en producción | S | 05 |
| F-12 | P2 | Conversión | Planes sin acción contigua | S | 02 |
| F-13 | P2 | Confianza | Botón de Google que no funciona | S | 02 |
| F-15 | P2 | Sistema de diseño | CSS fragmentado (81 tamaños, 36 sombras, etc.) | M–L | 01 |
| F-17 | P2 | Performance | `fondo-ramo.jpg` (191 KB) descargada sin verse | S | 04 |
| F-20 | P2 | Marca | El brief de identidad no coincide con el producto | S | 06 |
| F-24 | P2 | Confianza | Sin FAQ en la landing | S | 02 |
| F-25 | P2 | Contenido | «Publicada 6 meses» contra la decisión de 12 | S | 02 |
| F-11 | P3 | SEO | El canonical y el sitemap no coinciden con el dominio | S | 05 |
| F-14 | P3 | Claridad | «Iniciar sesión» titulado «Crear mi evento» | S | 02 |
| F-16 | P3 | UI / accesibilidad | Testimonios sin `h2`; rótulo en mayúsculas chicas | S | 01 |
| F-18 | P3 | Performance | Fuente sin precarga | S | 04 |
| F-19 | P3 | Layout | Página larga y vacíos en las hojas de Regalos (celular) | M | 01 |
| F-21 | P3 | UI | El vidrio del header a veces no se activa | S | 03 |
| F-22 | P3 | UI / expectativa | «Regalar» en la demo lleva al registro | S | 01 |
| F-23 | P3 | Navegación | El pie repite el destino `/ejemplo` | S | 02 |

## Etapas

### Etapa 0 — Antes de invertir en tráfico (bloqueantes)

1. **F-01:**
   - Decidir el hosting con base de datos (DP-14).
   - Mientras tanto, no simular el registro ni el ingreso: avisar antes o en el formulario, y no dejar pasar un ingreso fallido.
   - Criterio: en producción `GET /api/me` responde 200 o 401; con 503 hay un mensaje visible y el login no avanza.
2. **F-02:** sacar «tarjeta» de los textos del plan. Criterio: ningún texto público promete tarjeta.
3. **F-10** (junto con F-01): asegurar que `payments.provider` nunca sea `test` en producción.

### Etapa 1 — Conversión y mobile (2–3 semanas de trabajo parcial)

4. **F-03:** registro e ingreso como `Dialog` sobre la landing montada (opción A de 07). Al cerrar, se vuelve al mismo `scrollY`.
5. **F-27:** el hero se ve completo desde el primer cuadro.
6. **F-07:** el diferencial en la primera pantalla (copy a validar con la dueña).
7. **F-12:** un CTA bajo los planes.
8. **F-13:** ocultar o marcar con claridad el botón de Google.
9. **F-24:** una FAQ corta en la landing, reutilizando los datos de `/lista-de-regalos`.
10. **F-14** y **F-23:** títulos y pie.

### Etapa 2 — Performance y seguridad

11. **F-05:** un video para celular de menos de 600 KB, que empiece después de la hidratación.
12. **F-06** y **F-17:** CSS del panel fuera de la landing; quitar `fondo-ramo.jpg`.
13. **F-04:** perfilar en un dispositivo real, diferir demos y Lenis y revisar el chunk principal. Criterio: con CPU 4× y 4G lento, TBT aprox. menor a 600 ms, INP aprox. menor a 200 ms, y el test del menú pasa 10 de 10 veces.
14. **F-09:** cabeceras de seguridad (`frame-ancestors 'self'`, CSP en modo *report-only*, `Permissions-Policy`).
15. **F-11:** un solo dominio canónico.
16. **F-18:** precargar la fuente.
17. **Medir con Lighthouse** en CI o localmente, cuando se pueda instalar, para tener puntajes oficiales.

### Etapa 3 — Calidad y marca

18. **F-15:** tokens y consolidación del CSS, con capturas antes y después idénticas.
19. **F-16:** `h2` en Testimonios, sin rótulo ni numeración índice.
20. **F-19:** hojas de Regalos que midan lo que mide su contenido y una página más corta en celular.
21. **F-20:** un único documento de identidad vigente (Geist; blanco, gris y verde).
22. **F-08:** revisar el contraste del verde, si la dueña lo reconsidera (por ejemplo, un verde más oscuro solo para texto chico).
23. **F-21** y **F-22:** el estado del header y las tarjetas-link.

## Qué no tocar (preservar)

- **Geist** como única familia.
- **El verde #959571** como único acento.
- **El ritmo blanco y gris.**
- **El hero:** video, título y su posición, barra en píldoras y botón verde.
- **Las maquetas del producto real.**
- **Las hojas apiladas de Regalos.**
- **Los testimonios reales.**
- **La voz rioplatense y honesta.**
- **«Reducir movimiento»** y cero overflow.
- **Los controles de seguridad del servidor:** cookies, `Origin`, límites de intentos.

## Nota sobre impacto

No hay datos de analítica. Todo impacto comercial de este informe es una **hipótesis razonada**. Antes de la etapa 1 conviene medir el embudo mínimo con los eventos que ya existen (`/api/events`): llegada → toque en un CTA → formulario visible → registro exitoso o fallido.

## Seguimiento — correcciones aplicadas (2026-11-03)

La dueña eligió corregir ocho puntos y desestimar el resto. Las mediciones son con el mismo perfil de la auditoría (celular 390×844, 4G lento y CPU 4×), sobre el build local de producción.

| Punto | Hallazgo | Qué se hizo | Resultado medido |
|---|---|---|---|
| 1 | F-04 | Íconos y `cn` agrupados en un solo archivo que se precarga (`ui-core`), en lugar de descubrirse tarde; video en celular después de la hidratación | TBT aprox. de 1,0–2,3 s a **0,22–0,24 s**; INP aprox. del menú de 290–500 ms a **184–224 ms**; el test del menú pasa 5 de 5 veces |
| 2 | F-05 | Video vertical para celular (`hero-mobile.mp4`, 432×720, recortado a lo que se ve) | **0,36 MB** en vez de 1,7 MB |
| 3 | F-27 | El texto y los botones del hero no pasan por opacidad 0; queda un desplazamiento corto y el acercamiento del fondo | Visibles desde el primer cuadro |
| 4–5 | F-06, F-17 | `panel.css` y `lista-regalos.css` viajan con el código de sus pantallas; se quitaron los fondos `fondo-ramo.jpg` y `fondo-cards.webp`, que no se veían | La landing ya no tiene hojas de estilo del panel en su HTML; imágenes de 702 a **428 KB**; peso total de 2,75 a **1,12 MB** y pedidos de 56 a **42** |
| 6 | F-12 | Un único «Empezar gratis» debajo de los tres planes («Elegís el plan recién al publicar») | — |
| 7 | F-15 | 494 declaraciones que nunca se aplicaban y 159 reglas vacías eliminadas; tokens `--fs-*`, `--r-*`, `--sh-*` y `--ring-*`; valores casi iguales llevados al token más cercano (letra ±1 px, radios ±2–4 px, sombras ±0,01 de opacidad). Se conservaron exactos el logo y el menú de la barra | `styles.css` de 1.804 a 1.567 líneas. En la interfaz real (sin maquetas): tamaños de letra de 28 a 25, radios de 14 a 13, sombras 3. Las comparaciones de estilos de 2.706 elementos solo muestran esas diferencias previstas |
| 8 | F-09, F-11 | CSP, `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'` y `Permissions-Policy` en `vite.config.ts` (Nitro); dominio canónico único `https://www.weda.app` | Sin bloqueos de la CSP en `/`, `/lista-de-regalos`, `/crear/cuenta`, `/crear`, `/ejemplo`, `/ejemplo/regalos`, `/encontrar` y `/terminos`. Canonical, `og:url`, sitemap y robots apuntan a `www.weda.app` |

FCP pasó de 2,1–2,3 s a 1,2–1,5 s y LCP de 3,4–3,6 s a 2,5 s. Pendiente de verificar después del deploy: las mismas mediciones sobre `www.weda.app`, y la búsqueda de lugares de Google y la playlist de Spotify con la CSP activa (no se pudieron probar sin una clave de Google ni con un sitio publicado con playlist).
