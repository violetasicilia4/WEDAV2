# Weda · Auditoría del estado del repositorio (2026-11-03)

> **Actualización 2026-11-04 (D-06, PAY-07):** el modelo comercial vigente es trial de 14 días → pausa sin perder datos → contratar = publicar → **permanencia indefinida, sin vencimiento** ([spec](../specs/PAY-07-trial-contratacion-permanencia/spec.md); reglas BR-63, BR-64 y BR-65 del [catálogo](../docs/product-blueprint/02-business-rules-catalog.md)). Lo que este documento dice sobre vigencia de 12 meses, cierre, archivo, avisos de vencimiento, condiciones de vigencia y eliminación ligada al vencimiento queda **reemplazado** y se conserva como historia del diseño. El borrado por inactividad (BR-45) está suspendido (DP-31).

> **Aviso (agregado el mismo 2026-11-03, después del informe):** el multiusuario quedó **postergado** por decisión de la dueña (D-03) y los planes se redefinieron (D-01, D-02). Lo vigente está en [`product-blueprint/03`](product-blueprint/03-open-decisions-and-risks.md) §4. El resto del informe no se modificó.

Fotografía de una fecha: no se reescribe. Base: `origin/main` en `0d2fb4d`, después de `git fetch --prune`. Inspección de solo lectura del código, las ramas y los documentos; se ejecutaron `npm test` (28 archivos, **242 pruebas, todas pasan**) y `npm run typecheck` (sin errores). **No** se ejecutaron `lint`, `build` ni las pruebas E2E, ni se recorrió el sitio en el navegador.

## 1. Ramas

### 1.1 `main`

- `origin/main` = `0d2fb4d` («Planes: Regalos y Celebración, publicados 1 año…»). 175 commits.
- **Tu `main` local está 5 commits atrás** de `origin/main` (quedó en `f1c37a1`, PR #9). Se pone al día con `git checkout main && git pull`.
- La rama en la que estás, `docs/specs-etapa-1`, apunta **exactamente al mismo commit** que `origin/main` y no existe en GitHub. No tiene nada propio.
- **Los últimos 5 commits llegaron a `main` sin PR** (empuje directo): `cbcec18`, `2ac8d85`, `af38336`, `5577250`, `0d2fb4d` (landing, specs, página de lista de regalos, performance, planes a 1 año). Va contra la regla de `CLAUDE.md` («cada tarea llega a `main` por PR»). No rompe nada, pero queda sin revisión.

### 1.2 Otras ramas y qué contienen

| Rama | ¿Tiene algo que no esté en `main`? | Detalle |
|---|---|---|
| `chore/claude-hooks` (local y remota) | **Sí, lo único pendiente** | PR #3 **abierto**, mergeable. Hook `PreToolUse` de protección para Claude Code (`.claude/hooks/guard.sh` + pruebas + historial, ~1.650 líneas). No es parte del producto. |
| `feat/backend-cambio-clave` | No (entró por PR #4, squash) | Cambiar la clave desde el perfil (AUTH-05). |
| `feat/backend-sesiones` | No (PR #5) | Ver y cerrar las demás sesiones (AUTH-06). |
| `feat/aportes-revision` | No (PR #6) | Confirmar / rechazar / revisar aportes en el panel (GIFT-07). |
| `feat/cambios-sin-publicar` | No (PR #7) | Aviso «cambios sin publicar» calculado por el servidor (DASH-04). |
| `feat/alias-protegido` | No (PR #8) | Alias/banco/CBU con clave, versiones y aviso (GIFT-14). |
| `feat/regalos-repetibles` | No (PR #9) | Regalos repetibles, sin «Ya elegido» (GIFT-08). |
| `feat/nueva-funcionalidad` (solo local) | No | Quedó en `cbcec18`, ya contenido en `main`. |
| `origin/claude/mobile-nav-touch-targets`, `origin/claude/onboarding-mobile`, `origin/claude/rsvp-block-white`, `origin/mobile-ux-audit` | No | Ramas viejas (15–19 de octubre), todo su contenido ya está en `main`. |
| `origin/backup/pre-agent-engineering` | No | Copia de respaldo de `main` al 31-10, antes de los PR #1–#9. |

Las ramas `feat/*` muestran commits «de más» solo porque se fusionaron con *squash*: el contenido ya está en `main`. **Se pueden borrar** (local y remoto) sin perder nada. `chore/claude-instrucciones` y `chore/claude-permisos` ya se borraron en GitHub.

### 1.3 Lo que hay en tu máquina y no está en git

| Archivo | Qué es | Sugerencia |
|---|---|---|
| `docs/architecture/platform-readiness-audit.md` | Auditoría de arquitectura para escalar (686 líneas, rev. 11, 2026-11-01). **Contiene decisiones tuyas aprobadas** (DA-1 a DA-6, DA-10, DA-13, DA-14, DA-19, DA-MU: multiusuario, archivo público, 12 meses, atribución). | **Importante: subirlo.** Si se pierde la carpeta se pierden esas decisiones. |
| `.claude/skills/design-taste-frontend/` + `skills-lock.json` | Skill de diseño instalada desde GitHub | Decidir si se versiona. |
| `.taste-skill/` | Capturas y reportes de esa skill | Ignorar (agregar a `.gitignore`). |
| `public/hero-original-30fps.mp4` | Video de 6,6 MB | Si no se usa, no subirlo. |

No hay *stash* ni otros *worktrees*.

## 2. Frontend (lo construido)

Stack: TanStack Start + React 19 + Tailwind 4, sin librería de estado (todo en `src/lib/weda/`).

| Área | Rutas | Estado |
|---|---|---|
| Landing | `/`, `/lista-de-regalos`, `/ejemplo`, `/ejemplo/regalos` | **Hecha.** Hero con video, demos animadas, regalos, testimonios, planes, pie. Página dedicada de lista de regalos (nueva, 03-11). |
| Legales | `/terminos`, `/privacidad` | **Borradores** con marcas «a completar», sin revisión de abogado. |
| Onboarding | `/crear`, `/crear/fecha`, `/crear/foto`, `/crear/cuenta` | **Hecho.** Nombres, fecha y lugar opcionales, foto, cuenta. |
| Cuenta | `/crear/cuenta`, `/clave`, `/clave/nueva`, `/panel/perfil` | **Hecho** con correo + clave, recuperar clave, cambiar clave, cerrar otras sesiones. **«Ingresar con Google» es un botón que muestra un aviso**: no está implementado. |
| Panel · Inicio | `/panel` | Hecho: primeros pasos, tarjeta del sitio publicado, aviso de cambios sin publicar. |
| Panel · Tu página | `/panel/sitio` | **Hecho:** portada, momentos (ceremonia/recepción con Google Places), dress code, fotos, cuenta regresiva, música, texto libre, mensaje final, orden de secciones, colores. |
| Panel · Regalos | `/panel/regalos` | **Hecho:** catálogo y regalos propios, arrastrar para ordenar, alias protegido con clave, aportes recibidos con confirmar/rechazar, ver comprobante, pedir comprobante por correo. |
| Panel · Invitados y mesas | `/panel/invitados` (`/panel/mesas` redirige) | **Hecho:** invitados, grupos, mesas, importar/exportar Excel, respuestas RSVP. |
| Panel · Publicar y pagar | `/panel/pago`, diálogo de publicación, `/pago-de-prueba` | **Simulado:** el pago funciona solo con el adaptador de prueba (no cobra). |
| Vista previa | `/panel/vista-previa` | Hecha, lee el mismo estado que la página pública. |
| Página pública | `/sitio/:slug`, `/sitio/:slug/regalos`, `/encontrar`, `/comprobante` | **Hecha:** invitación, RSVP, lista de regalos con aporte por alias y comprobante obligatorio, agregar al calendario (`.ics`). |

**Funciones que el plan promete y no están completas:**
- **Música («tus invitados suman las canciones»):** el invitado puede escribir una canción, pero **solo queda en su navegador**; no se guarda en el servidor y la pareja nunca la ve. Spotify es solo un enlace configurable.
- **Pago con tarjeta** en la lista de regalos: el botón existe y dice «todavía no está disponible».
- **Galería con hashtag e Instagram:** se muestran el hashtag y el usuario; no hay integración con Instagram.

## 3. Backend (lo construido)

Servidor propio dentro de la misma app (`src/server/`, ~1.600 líneas), API `/api/*`, SQLite con `node:sqlite`, 7 migraciones idempotentes.

**Tablas (16):** `users`, `sessions`, `password_resets`, `weddings` (borrador en JSON, **un casamiento por usuario**), `guests`, `rsvp_events`, `publications` (snapshot publicado + vencimiento), `orders`, `payment_events`, `contributions`, `contribution_items`, `contribution_events`, `receipts`, `payout_methods` (versionado), `marketing_consents`, `mail_log`, `funnel_events`.

| Módulo | Qué hace | Estado |
|---|---|---|
| Cuentas | Registro, login, logout, recuperar y cambiar clave, sesiones (token con hash), CSRF por origen, aislamiento entre parejas | **Hecho y probado** |
| Casamiento | Guardar/leer borrador con control de versión (409 en conflicto), fotos fuera de la base (`media/`, hash, validación por bytes, 4 MB) | **Hecho.** Fotos en disco local, no en S3/R2. |
| Publicación | Publicar, bajar, volver a publicar, snapshot, slug estable, vencimiento **12 meses desde la primera publicación** (cambiado hoy), `410` al vencer, aviso de cambios sin publicar | **Hecho**, pero pagar y publicar siguen siendo dos pasos (IC-01). |
| RSVP | Respuesta pública con historial | **Hecho**; se identifica por nombre (IC-09: alguien puede responder por otro). |
| Aportes | Aporte con comprobante obligatorio (privado), estados, confirmar/rechazar, recordatorio por correo, alias versionado con reautenticación y aviso por correo | **Hecho y probado** |
| Pagos de Weda | Órdenes, monto calculado por el servidor, idempotencia, interfaz de proveedor | **Solo adaptador de prueba.** El webhook real responde `501`. Sin Mercado Pago. |
| Correo | Resend por HTTP, plantillas, enlace de baja firmado | **Código hecho, nunca probado en real:** sin `RESEND_API_KEY` no sale nada (queda «skipped»). |
| Analítica | 6 eventos de servidor en `funnel_events` | Mínimo, sin identidad ni atribución. |

## 4. Lo que falta

Fuente: [`04-mvp-readiness.md`](product-blueprint/04-mvp-readiness.md) (31-10), actualizado con lo que entró después (PR #6–#9 y los cambios del 03-11).

### 4.1 Ya resuelto desde el blueprint
- MV-13 revisión de aportes en el panel (PR #6) · MV-14 alias protegido, nivel base (PR #8) · NE-01 regalos repetibles (PR #9; falta el aporte de importe libre) · NE-03 aviso de cambios sin publicar (PR #7) · AUTH-05/06 clave y sesiones (PR #4, #5).
- Vigencia de 12 meses en el código y en los planes (03-11, directo a `main`). **Falta verificar** que términos, privacidad, FAQ y panel digan lo mismo, y que la vigencia empiece al confirmar el pago (IC-16) y quede guardada en la orden (N1 de la auditoría de arquitectura).

### 4.2 Bloqueantes para cobrar y publicar a clientes
| Tema | Qué falta | Quién |
|---|---|---|
| Hosting | Servidor con disco persistente, HTTPS, Node ≥ 22.5 (DP-14). **Nunca se desplegó.** | Decisión tuya + construcción |
| Respaldos | Copia y restauración de `weda.db`, `receipts/`, `media/` | Construcción |
| Correo | Cuenta de Resend, dominio verificado (SPF/DKIM), prueba real | Configuración |
| Pagos reales | Proveedor (Mercado Pago u otro, DP-15), webhook, conciliación; compuerta de pago siempre encendida | Decisión + construcción |
| Pagar = publicar | Que la confirmación del pago publique sola (IC-01, MV-08) | Construcción |
| Condiciones aceptadas | Aceptación de las condiciones de vigencia guardada con la orden (MV-10) | Redacción (DP-06) + construcción |
| Libro de aportes | Moneda explícita, registro inmutable de movimientos (MV-15) | Construcción (cambia el esquema) |
| Legal | Términos y privacidad definitivos, inscripción AAIP, procedimiento de derechos, política de reembolso y facturación | Asesoría legal y contable |
| Soporte | Forma de ver órdenes y aportes de una pareja sin abrir la base (MV-21) | Construcción mínima |
| Pruebas | E2E reejecutadas; prueba de punta a punta con pago y correo reales | Después de lo anterior |

### 4.3 Para una buena experiencia (no bloquean la primera venta)
- **Aporte de importe libre** (GIFT-09): spec y plan **aprobados** el 01-11, **sin construir**. Es la próxima funcionalidad lista para empezar.
- Invitaciones con enlace personal y cupo (RSVP sin suplantación).
- Avisos de vencimiento (30/7/1 días) y exportaciones (regalos, aportes, comprobantes).
- Ingreso con Google y verificación/cambio de correo.
- Playlist guardada en el servidor (hoy se pierde).
- Pago con tarjeta en la lista de regalos (hoy deshabilitado).
- Subida directa de fotos / almacenamiento de objetos.
- Accesibilidad y rendimiento con 500 invitados: no verificados.

### 4.4 Decidido pero sin construir (escala)
De la auditoría de arquitectura (sin subir) y de `data-architecture/`:
- **Multiusuario** (DA-MU): administradores y colaboradores. Hoy `weddings.owner_id` es único y 15 operaciones del servidor asumen «un usuario = un casamiento». Conviene cambiarlo **antes** de tener clientes.
- **Varios eventos por cuenta** e historial «Finalizado» (IC-06).
- **Ciclo de vida:** archivo público a los 12 meses y 24 meses de archivo (DA-1, DA-3); hoy al vencer solo responde `410` y la pareja sigue editando (IC-05).
- **Atribución desde el primer contacto** (UTM, referidos) — lo que no se guarde ahora no se recupera.
- Ubicación estructurada (ciudad/provincia), historial de publicación, analítica con identidad.
- Retención y borrado de datos (diseñados, no implementados).
- Cupones, partners, marketplace, administración interna: «después».

## 5. Orden sugerido
1. Subir `docs/architecture/platform-readiness-audit.md` (y este informe) por PR. Lo que entró directo a `main` ya está; de acá en adelante, todo por PR.
2. Actualizar `main` local, borrar las ramas `feat/*` ya fusionadas y decidir el PR #3 (hooks).
3. Decidir hosting (DP-14) y proveedor de pagos (DP-15): son los dos que destraban todo lo demás.
4. Mientras tanto, construir GIFT-09 (aporte libre, ya aprobado) y, si se confirma, el cambio a multiusuario antes de los primeros clientes.
