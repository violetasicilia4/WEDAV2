# 07 · Pruebas funcionales

- **Entorno:** servidor local `http://localhost:8081` (estado actual del árbol de trabajo), más pruebas de solo lectura sobre producción.
- **Herramienta:** Playwright con Chrome, en compu (1440×900) y celular (390×844).
- **Sin efectos externos:** no se crearon cuentas ni datos. El registro se probó respondiendo 503 desde la propia prueba, sin tocar ninguna base.

## Qué funciona (medido)

| Prueba | Resultado |
|---|---|
| Todos los links de la landing (24) y de `/lista-de-regalos` (21) | Responden 200 o son anclas existentes (`#main`, `#top`, `#products`). Destinos: `/crear/cuenta`, `/crear/cuenta?modo=ingresar`, `/encontrar`, `/ejemplo`, `/ejemplo/regalos`, `/lista-de-regalos`, `/terminos`, `/privacidad`. |
| Suite `e2e/landing-mobile.spec.ts` (16 tests, solo lectura) | **14 pasan siempre. 2 fallan de forma intermitente**: el menú y el vidrio del header (ver abajo). |
| Menú de celular | Se abre debajo de la barra, se cierra con Escape y devuelve el scroll (cuando el toque llega después de la hidratación). |
| Diálogo «Ver lo que incluye» | Abre, muestra lo heredado y entra sin scroll (test). |
| Testimonios | Las flechas avanzan y retroceden, el contador va de «01 / 04» a «02 / 04» y da la vuelta a «04 / 04» (test). |
| Preguntas frecuentes de `/lista-de-regalos` | El `<details>` se abre (test). |
| Hojas de Regalos | Se apilan al bajar, con el botón dentro de la última (test). |
| Registro (local, con la API funcionando) | Formulario de 2 campos con `autocomplete` correcto (`email` y `new-password`) y etiquetas asociadas. El botón se bloquea mientras espera. |
| Errores de consola | 0 en los 9 anchos. |
| «Reducir movimiento» | 0 animaciones en curso, sin video y sin Lenis. |

## Qué falla o es intermitente

| ID | Qué | Evidencia | Reproducible |
|---|---|---|---|
| F-01 | En producción el registro y el login no crean ni validan cuentas, y siguen sin avisar | `GET /api/me` → 503 en los dos dominios. Simulación local con 503: se pasa a «Conozcámonos. ¿Cómo se llaman?» sin mensaje. | Sí, siempre |
| F-03 | Abrir el registro o el ingreso desmonta la landing; cerrarlo la recarga desde arriba | Ver abajo | Sí, siempre |
| F-04 | El menú no se abre si se toca antes de la hidratación | El test «menú…» falló en 2 de 4 corridas: `#float-menu` siguió oculto | Intermitente |
| F-21 | El vidrio del header no se activa al hacer scroll | El test «header…» falló en 2 de 4 corridas: `backdrop-filter: blur(0px)` | Intermitente |
| F-13 | «Registrarme con Google» no registra | Avisa que no está habilitado | Sí |

## F-03 · Investigación del inicio de sesión y registro sobre la landing

### Qué ve la persona

Toca «Iniciar sesión» o «Crear mi evento».
1. Aparece el cuadro sobre la landing oscurecida.
2. La landing del fondo **arranca de nuevo desde arriba** y repite la animación de entrada.
3. Al cerrar con la «X», vuelve a la landing **desde el principio**, aunque estuviera a mitad de página.

### Reproducción (medido)

Se bajó la landing a `scrollY = 1800`, se marcó el DOM y se tocó «Iniciar sesión»: en compu, el link de la barra; en celular, menú → «Iniciar sesión».

| Momento | Compu | Celular |
|---|---|---|
| Tiempo hasta ver el formulario | 528 ms | 748 ms |
| URL | `/crear/cuenta?modo=ingresar` | igual |
| ¿Recarga completa de la página? | **No.** La variable global marcada sigue viva: es navegación interna de React. | No |
| ¿La landing sigue montada? | **No.** El hero marcado desapareció del documento. | No |
| `scrollY` del documento principal | **0** (antes 1800) | 0 |
| Fondo | Un `iframe` con `src="/"`, otra landing completa que arranca en `scrollY 0` con la animación `hero-copy-in` | igual |
| Pedidos de red al abrir (servidor de desarrollo) | 179 | 177 |
| Al cerrar con la «X» | Vuelve a `/` con la landing nueva, `scrollY 0` y animaciones de entrada | igual |

### Causa raíz (código)

1. **Es una ruta, no un modal.** «Iniciar sesión» y «Crear mi evento» son `<Link to="/crear/cuenta">` (`src/components/float-nav.tsx:55-56` y el hero en `src/routes/index.tsx`). TanStack Router cambia de ruta y **desmonta `Index`** (la landing): se pierden el estado, el scroll y el video.
2. **El fondo es otra landing.** `src/routes/crear.tsx` (`CreateLayout`) muestra, en `/crear/cuenta`, un `<iframe className="pn-flow-bg" src="/">` con un velo encima. Ese `iframe` carga **otra instancia completa** de la app en la ruta `/`, con hero, demos, scroll suave y observadores. Por eso «la landing se reinicia»: lo que se ve detrás es una copia nueva que empieza de cero. El fundido agregado el 2026-11-03 evita el destello blanco, pero no el reinicio.
3. **Cerrar es navegar a `/`.** `FlowClose` es `<Link to="/">` (`src/components/panel/ui.tsx:31-33`), no «volver». Se monta otra landing desde arriba. `scrollRestoration: true` en el router no restaura porque es una navegación nueva, no un «atrás».
4. **Costo:** cada apertura carga dos aplicaciones, la de `/crear/cuenta` y la del `iframe`. En celular eso suma a F-04.

### Experiencia correcta (criterios)

- La landing **sigue montada** debajo: mismo scroll, mismo video y sin repetir animaciones.
- El cuadro aparece con una transición de 150–250 ms, el fondo oscurecido es la landing real y el foco queda atrapado dentro del cuadro.
- Al cerrar con la «X», Escape o un toque fuera, la persona vuelve **exactamente** donde estaba y el foco regresa al botón que lo abrió.
- Un link directo a `/crear/cuenta`, desde un correo o compartido, sigue funcionando como página completa.

### Alternativas evaluadas

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| **A. Modal controlado por un parámetro en la URL de la landing** (recomendada) | `/` acepta un parámetro de búsqueda `cuenta=registro\|ingresar` (`validateSearch`). `Index` muestra un `Dialog` (ya existe `@/components/ui/dialog`, Radix) con el mismo formulario de `crear.cuenta.tsx`, extraído a un componente. Los CTA navegan a `?cuenta=registro` con `resetScroll: false`. Cerrar hace `history.back()`, o navega sin el parámetro y sin resetear el scroll. | La landing nunca se desmonta. Funciona atrás y adelante. URL compartible. Reutiliza Radix (foco, Escape, `aria-modal`). | Hay que extraer el formulario a un componente compartido. |
| B. *Route masking* de TanStack (`mask`) | Navegar a `/crear/cuenta` mostrando la URL enmascarada, y que el layout de `/` renderice el modal | URL «linda» | TanStack no tiene rutas interceptadas como Next.js; obliga a un layout común y complica la hidratación. |
| C. Mantener la ruta, pero fondo estático | Reemplazar el `iframe` por la portada del hero desenfocada | Barato, elimina la doble carga | Se sigue perdiendo el scroll y el estado de la landing. |
| D. Panel lateral o inferior (en celular) | El mismo que A, con `Sheet` en lugar de `Dialog` | Más natural en celular | Mismo trabajo que A. |

**Recomendación: A** (y D para celular si se quiere un panel que sube desde abajo).

Para que nada cambie en las reglas de negocio:
- el formulario, sus validaciones y el destino después del registro (`/crear` o el panel) siguen iguales;
- la página completa `/crear/cuenta` se mantiene para los links directos, sin el `iframe` o con la opción C.

| Campo | Detalle |
|---|---|
| ID | F-03 |
| Categoría | UX / arquitectura de navegación |
| Severidad | P1 |
| Componentes | `float-nav.tsx`, `routes/index.tsx` (CTA), `routes/crear.tsx` (`iframe`), `components/panel/ui.tsx` (`FlowClose`), `routes/crear.cuenta.tsx` |
| Dispositivo | Todos; se nota más en celular |
| Esfuerzo | M |
| Dependencias | Extraer el formulario de cuenta a un componente compartido. Tests de `account-flow.spec.ts`. |
| Criterio de aceptación | Abrir y cerrar el registro desde `scrollY = 1800` deja `scrollY = 1800`, la landing no se desmonta, no se crea ningún `iframe` y la red no vuelve a pedir `/`. |

## No probado

- **Registro e ingreso reales en producción:** no se enviaron formularios a producción.
- **Flujo autenticado** (panel, publicar, pagos): requiere una cuenta y base de datos.
- **`/pago-de-prueba` y el webhook de pagos.**
- **Dispositivos físicos** (iPhone con Safari, Android con Chrome, el navegador interno de Instagram): todo fue emulación.
- **Lectores de pantalla reales** (VoiceOver, TalkBack): solo inspección de la semántica.
