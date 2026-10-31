# Weda · Del frontend a un producto multiusuario (backend-readiness)

> **Documento histórico.** Describe el estado de su fecha y no se actualiza. Parte de lo que dice ya no es cierto (p. ej. aportes del panel, recuperación de clave y vencimiento). Estado vigente: [docs/product-blueprint/](product-blueprint/00-product-blueprint.md) (2026-10-31).

Fecha: 2026-10-26. Este documento describe **qué existe de verdad**, qué sigue simulado, el modelo de datos, la autorización, los riesgos y los próximos bloques. Todo lo que figura como «funciona» fue ejecutado contra el servidor y una base SQLite real (ver §10); lo que no se pudo probar está marcado.

## 1. Arquitectura actual

| Capa | Antes de esta etapa | Ahora |
|---|---|---|
| Framework / build | TanStack Start + Vite 8 + Nitro (SSR). Sin cambios. | Igual. No se migró nada. |
| Backend | **Ninguno.** | API REST propia dentro del mismo servidor Nitro: `src/server/` (se monta en `src/server.ts` para toda ruta `/api/*`). |
| Base de datos | Ninguna (todo en `localStorage`). | **SQLite** (`node:sqlite`, incluido en Node 22; sin dependencias nuevas). Archivo en `WEDA_DB_PATH`. |
| Autenticación | Pantalla simulada. | Correo + clave (scrypt) y sesión por cookie `httpOnly` en el servidor. |
| Archivos privados | Fotos como datos dentro del borrador. | Comprobantes en `WEDA_DATA_DIR/receipts` (privado, nombre aleatorio, solo se sirven al dueño). Las fotos del casamiento **siguen** dentro del borrador (ver §8). |
| Estado del panel | `AppState` en `localStorage`. | El **mismo** `AppState`, sincronizado con el servidor (`src/lib/weda/remote.ts`) cuando hay sesión. Sin sesión, todo funciona como antes (modo demostración). |
| Sitio público | Solo existía en el navegador de quien lo creaba. | `/sitio/{slug}` se arma en el servidor desde lo **publicado** (SSR: HTML, título y metadatos de la pareja). |

### Por qué esta arquitectura (y su límite)

- **Una sola unidad de despliegue**, sin servicios administrados ni credenciales: se puede ejecutar, probar y revisar completa en el repositorio. Es lo más simple que opera de verdad.
- **SQLite exige un único servidor con disco persistente** (VM/contenedor con volumen: Fly.io, Railway, un VPS). **No sirve para hosting serverless/efímero** (Vercel, funciones) porque el archivo se perdería. Hoy no hay hosting definido: es la decisión de infraestructura pendiente más importante (§9).
- **En Vercel (u otro hosting sin disco persistente) las cuentas NO funcionan.** Lo comprobamos con el sitio desplegado en `weda-v2.vercel.app`: la primera versión abría la base en *cada* pedido y toda la web mostraba «No se pudo cargar esta página». Corregido: la base se abre solo en rutas `/api/*`; si no se puede abrir, la API responde **503 `backend_unavailable`**, `/sitio/{slug}` cae a su comportamiento local y el registro continúa en **modo demostración** (guardado solo en el navegador, con un aviso). Esto mantiene vivo el sitio de prueba, pero **no es un despliegue válido del producto real**: para cuentas, casamientos guardados y sitios publicados hace falta un servidor Node con volumen persistente (o Postgres administrado).
- La capa de datos está aislada en `src/server/db.ts` y `src/server/service.ts`: las rutas HTTP y el frontend no ven SQL. Migrar a **Postgres** (Neon, Supabase, RDS) implica reescribir esos dos archivos y las migraciones, no el producto. Las migraciones usan tipos y restricciones portables.
- Con varias instancias hay que mover tres cosas que hoy viven en memoria o en disco local: el limitador de intentos (`security.ts`), los comprobantes (a un bucket privado) y la base.
- `node:sqlite` figura como **experimental** en Node 22 (el proceso imprime un aviso). Alternativa estable: `better-sqlite3` (dependencia nativa). Se eligió lo nativo para no sumar dependencias; revisar al fijar versión de Node.

## 2. Modelo de datos (migración 1, `src/server/db.ts`)

| Tabla | Para qué | Propietario / permisos | Claves y restricciones |
|---|---|---|---|
| `users` | Cuenta (correo, hash scrypt) | Cada persona su fila | `email` único (sin distinguir mayúsculas) |
| `sessions` | Sesiones abiertas | Del usuario | `id` = sha256 del token (el token no se guarda); vence a los 30 días; `ON DELETE CASCADE` |
| `weddings` | Casamiento y borrador (JSON saneado) | `owner_id` (único: **un casamiento por cuenta** por ahora) | `slug` único (se asigna al publicar y no cambia); `revision` para concurrencia optimista |
| `guests` | Invitados y respuestas | Del casamiento | `status` ∈ confirmed/declined/pending, `source` ∈ rsvp/manual; índice por nombre normalizado; se borran con el casamiento |
| `rsvp_events` | Historial de respuestas públicas | Solo servidor | Para investigar quién cambió qué y cuándo |
| `publications` | Snapshot público + estado | Del casamiento (1:1) | `status` ∈ live/taken_down; `plan_id` validado; `expires_at` **siempre NULL** (la vigencia es decisión comercial pendiente; no se aplica) |
| `orders` | Compras de plan | Del casamiento | `status` ∈ pending/paid/failed/cancelled; monto tomado de `plans.ts` en el servidor; índice único `(provider, provider_ref)` |
| `contributions` | Aportes informados por invitados | Del casamiento | `status` ∈ pending_review/confirmed/rejected; `UNIQUE(wedding_id, idempotency_key)`; `how` solo `alias` |
| `contribution_items` | Regalos de cada aporte | — | PK `(contribution_id, gift_id)`; el monto sale del snapshot publicado, nunca del cliente |
| `contribution_events` | Historial de estados | Solo servidor | Quién (guest/owner/system), de qué estado a cuál, cuándo |
| `receipts` | Comprobantes | Dueño del casamiento (lectura) | Un comprobante por aporte; `storage_key` aleatorio en disco privado |

**Se dejó afuera a propósito** (no hay funcionalidad real que lo justifique todavía): colaboradores/miembros del casamiento, mesas relacionales (las mesas siguen dentro del borrador y `guests.group_id` es una referencia blanda), secciones de la invitación como tablas (el contenido vive en el borrador JSON), perfiles aparte de `users`.

### Integridad entre regalos, invitados y aportes
- Un **regalo** es una entrada de la lista publicada (snapshot); el **aporte** lo referencia por `gift_id` y copia nombre y monto (si la pareja edita la lista después, el aporte no cambia ni queda colgado).
- Un regalo no puede estar en dos aportes activos: la comprobación y el alta ocurren en una **transacción `BEGIN IMMEDIATE`** (probado con dos envíos simultáneos: uno 201, otro 409). Un aporte **rechazado** libera el regalo.
- Los invitados que confirman desde el sitio **no** se vinculan a aportes: son datos distintos (quién viene vs. quién regaló).
- Reglas de borrado: todo cuelga del casamiento con `ON DELETE CASCADE`; no hay borrado de cuenta ni de casamiento por API todavía (derecho de supresión: pendiente, §7).

## 3. Autenticación y autorización

- **Identidad:** cookie `weda_session` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción). El token es aleatorio de 256 bits; la base guarda solo su sha256. Clave con scrypt (N=16384) y sal propia. Mismo error y mismo costo de cálculo para «correo inexistente» y «clave mala»; límite de 8 intentos por correo+IP cada 15 minutos.
- **Propiedad:** toda función de `Service` que toca datos privados recibe el `userId` **ya autenticado** y filtra por `weddings.owner_id`. No existe ninguna ruta que reciba un id de casamiento desde el cliente (`/api/wedding` es «el mío»). Aportes y comprobantes se buscan con `JOIN weddings … owner_id = ?`: si existe pero es de otra pareja, la respuesta es **el mismo 404** que si no existiera.
- **Público (sin sesión):** solo `GET /api/public/{slug}` (snapshot publicado + ids de regalos ya tomados, sin nombres ni mensajes), `POST …/rsvp`, `POST …/contributions` y las dos rutas del comprobante. Nunca devuelven invitados, aportes de otros ni el borrador.
- **Invitado sin cuenta:** para su propio aporte usa una **capacidad** (`x-manage-token`, aleatoria, guardada como sha256) que solo le permite adjuntar el comprobante y ver el estado de **ese** aporte.
- **Estado de los aportes:** solo la pareja dueña lo cambia (`PATCH /api/contributions/{id}`); el invitado no puede confirmar su propio aporte. Transiciones: `pending_review → confirmed|rejected`, `confirmed → rejected`, `rejected → pending_review`.
- **Pagos:** ninguna ruta acepta `paid`. `POST /api/orders` crea una orden `pending` con el monto del servidor; `POST /api/webhooks/payments` responde **501**. `Service.settleOrder` existe solo para el futuro webhook verificado y para pruebas.
- **CSRF:** `SameSite=Lax` + rechazo de escrituras con `Origin` ajeno + escrituras solo con `Content-Type` JSON (o binario en el comprobante).
- **Fuera de alcance / pendiente:** recuperación de clave, verificación de correo, cambio de correo/clave, cierre de todas las sesiones, MFA, OAuth (Google/Apple siguen siendo botones de simulación), roles de colaborador.

## 4. Persistencia y migración desde el frontend

- El panel **no se reescribió**: sigue leyendo y escribiendo `AppState` en `localStorage`. `src/lib/weda/remote.ts` observa el estado y, si hay sesión, lo guarda en el servidor.
- **Qué viaja:** el borrador (todo salvo invitados, aportes recibidos y la publicación simulada) y, aparte, las **operaciones** sobre invitados (altas/cambios/bajas). Así un guardado del panel no borra respuestas que llegaron desde el sitio público mientras tanto.
- **Concurrencia:** cada guardado lleva la `revision` que ese dispositivo vio. Si otro dispositivo guardó antes, el servidor responde **409** y no modifica nada; el panel frena el guardado automático y ofrece «Recargar lo guardado» (el borrador local se conserva en `weda-app-local-backup`). Un solo guardado en vuelo por vez: una respuesta tardía no pisa cambios más nuevos.
- **Estados visibles:** carga (el panel espera a saber si hay sesión antes de decidir si falta crear el casamiento), «guardando/guardado» (anuncio accesible), **error** (aviso persistente con reintento manual y automático con espera creciente) y **conflicto**. Nunca se informa «guardado» sin un 200 del servidor. Al cerrar la pestaña con cambios sin confirmar, el navegador avisa.
- **Mezcla con datos locales (sin pérdida):**
  - Cuenta sin casamiento + borrador local → el borrador se **sube** a la cuenta (el local no se borra).
  - Cuenta con casamiento + borrador local distinto → se abre el de la cuenta y el local queda en `weda-app-local-backup`, con un aviso.
  - Cerrar sesión borra del navegador la copia del casamiento (los datos siguen en la cuenta).
- **Sigue local (por diseño actual):** el historial del pago simulado (`publication` dentro de `AppState`), las respuestas de `/ejemplo` (sessionStorage) y la preferencia del menú lateral.

## 5. Publicación y sitios públicos

- **Publicar** (`POST /api/wedding/publish`): toma el **borrador guardado en el servidor**, arma el snapshot con el mismo código que usa la vista previa (`siteFromState`) y el plan que decide el servidor, asigna un `slug` estable (`camila-y-lucas`, o `-2`, `-3` si ya existe) y lo guarda. Los cambios posteriores del borrador **no** aparecen hasta publicar de nuevo (probado).
- **Vista previa privada ≠ publicado:** la vista previa del panel carga `/sitio/{slug}?borrador` (o `?ventana`/`?plan=`) y lee el borrador local; la URL sin parámetros muestra solo lo publicado.
- **URLs:** `/sitio/{slug}` (invitación) y `/sitio/{slug}/regalos`. Inexistente → 404 con la pantalla de «Este sitio no está disponible»; despublicada → API 410 y aviso «Esta página no está publicada». Estas respuestas de «no publicado» son provisorias: no hay política comercial definida.
- **Metadatos y WhatsApp:** título, descripción y `og:*` salen de la pareja en el HTML del servidor (verificado leyendo la respuesta cruda). Limitación: si la portada es una foto subida (dato dentro del borrador) no hay una URL para `og:image`, así que se usa la tarjeta de Weda hasta tener almacenamiento de archivos (§8). Las invitaciones siguen con **`noindex`**: indexarlas es una decisión de privacidad pendiente. No se probó con el depurador real de WhatsApp/Facebook.
- **Vencimiento:** no se aplica (columna `expires_at` NULL). El panel sigue mostrando la vigencia simulada de un año del flujo de prueba: **no está respaldada por el servidor**.

## 6. Invitados y confirmaciones (RSVP)

- Persistencia real: alta, edición y baja desde el panel; confirmaciones desde el sitio público sin acceder al panel. Importación desde planilla: sigue procesándose en el navegador y se guarda por las mismas operaciones.
- **Identificación:** por nombre y apellido normalizados (sin mayúsculas ni tildes). Responder de nuevo **actualiza** a la misma persona (con historial en `rsvp_events`); no se duplica (probado, también entre sesiones distintas).
- **Privacidad:** el formulario público devuelve solo `{count}`; no revela si alguien figuraba en la lista ni muestra datos de otros. El contacto (correo/teléfono) que pide el formulario **no se envía ni se guarda**.
- **Límites:** 1–10 personas por envío, nombres acotados, 30 escrituras públicas cada 10 minutos por IP+sitio, respuesta cerrada si el sitio no está publicado o RSVP está deshabilitado.
- **Riesgo conocido (producto):** cualquiera con el link puede responder **a nombre de otra persona** escribiendo su nombre (no hay código de invitación). Mitiga el historial y que la pareja ve todo; la solución real (código/QR por invitado) es una decisión de producto.
- Errores de red: el envío falla visiblemente, la persona sigue cargada y puede reintentar (probado).

## 7. Regalos, aportes y comprobantes

Separación explícita (cada cosa es una entidad distinta):

1. **Regalo publicado:** entrada de la lista en el snapshot.
2. **Aporte informado:** el invitado dice «regalé estos regalos» (`contributions` + `contribution_items`), estado inicial **`pending_review`**.
3. **Comprobante:** archivo privado asociado al aporte.
4. **Verificación:** la pareja marca `confirmed` o `rejected` desde su panel (con nota opcional), con historial.
5. **Confirmación real del pago:** **no existe** (no hay proveedor). `confirmed` significa «la pareja vio el ingreso en su cuenta», no «Weda recibió dinero».

Garantías (todas con prueba de integración): monto desde el servidor; idempotencia por clave (reintento = misma respuesta, sin duplicar; la clave no se puede reutilizar con otro token); regalo ya tomado → 409; tarjeta → 501 (no se simula); comprobante validado **por contenido** (JPEG/PNG/WebP/PDF, hasta 5 MB), archivo en disco privado con nombre aleatorio, entregado solo al dueño con `Cache-Control: private, no-store`, `nosniff` y `sandbox`; si falla el registro en la base se borra el archivo (sin huérfanos); la lista pública de «regalos ya elegidos» no incluye nombres ni mensajes.

**Pendiente en la interfaz:** el panel de la pareja («Aportes recibidos») **todavía lee los aportes locales**, no `GET /api/contributions`, y no tiene botones para confirmar/rechazar ni estado «pendiente». Hasta cablearlo, **los aportes reales no se ven en el panel** (sí por API). Los textos del panel que dicen «recibidos» deben pasar a «pendientes/confirmados» al conectarlo. Ver §11, bloque 2.

## 8. Planes, pagos y archivos

- **Selección de plan** (`draft.planId`) ≠ **compra** (`orders`). El flujo del panel sigue siendo un **pago de prueba**: con sesión, tras el pago de prueba se **publica de verdad** (la página queda abierta) y el cartel lo dice; si el servidor falla, se deshace y no se muestra como publicada.
- **Compuerta de publicación:** `WEDA_REQUIRE_PAID_ORDER=true` hace que publicar exija una orden `paid` y que el plan publicado sea el de la orden (probado: sin orden → 402; el cliente no puede mandar `paid`). Está **apagada por defecto**; encenderla en producción cuando exista el proveedor.
- **No se inventaron** precios, duración, reembolsos ni cancelación. El precio de la orden sale de `plans.ts` (valores de referencia ya existentes).
- **Fotos del casamiento y de la galería:** siguen como datos dentro del borrador (hasta 6 MB por guardado, límite del servidor). No hay almacenamiento de archivos públicos/CDN: es el siguiente requisito para `og:image` por pareja y para casamientos con muchas fotos.

## 9. Entornos, configuración y dependencias externas

Variables del **servidor** (nunca se publican al navegador; ver `.env.example`):

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `WEDA_DB_PATH` | `.data/weda.db` | Archivo SQLite. En producción: un volumen persistente. |
| `WEDA_DATA_DIR` | `.data` | Carpeta de comprobantes (privada). |
| `WEDA_COOKIE_SECURE` | `true` si `NODE_ENV=production` | Cookie con `Secure` (requiere HTTPS). |
| `WEDA_REQUIRE_PAID_ORDER` | `false` | Publicar exige una orden pagada. |
| `WEDA_ALLOWED_ORIGINS` | vacío | Orígenes extra permitidos para escrituras (CORS/CSRF). Sin cross-origin por defecto. |

Variable **pública** (se compila en el cliente): `VITE_SITE_URL` (dominio, para canonical/OG/sitemap).

- **Pruebas:** usan una base y una carpeta temporales propias (`mkdtemp`); nunca tocan `.data/` ni datos de producción. `.data/` está en `.gitignore`.
- **Secretos:** no hay ninguno en el repositorio ni hacen falta hoy. Cuando exista un proveedor de pagos o correo, sus claves van solo en variables de entorno del servidor.
- **Logs y errores:** errores esperados → código estable en JSON (`{"error":"gift_taken"}`), sin detalles internos; los inesperados → 500 genérico y `console.error` en el servidor. Falta: logging estructurado, métricas y reporte de errores.
- **Migraciones:** automáticas al iniciar (`PRAGMA user_version`), en transacción, ordenadas. No se editan las publicadas.
- **Backups:** no hay. Con SQLite en un volumen: copia periódica del archivo (o Litestream). Pendiente.

## 10. Pruebas ejecutadas

Resultados reales de la última corrida en §13.

Cobertura de los 11 criterios pedidos:

| # | Criterio | Prueba |
|---|---|---|
| 1 | Dos usuarios crean casamientos independientes | `auth-isolation.test.ts` (integración) y `backend.spec.ts` (E2E, dos contextos) |
| 2 | A no lee ni modifica lo de B | invitados de B no se pueden pisar ni borrar; comprobantes/estados de otra pareja → 404; listas vacías; sin ruta por id |
| 3 | Sobrevive a recarga y sesión nueva | `wedding-flow.test.ts` y E2E «otro dispositivo» (contexto limpio) |
| 4 | Invitación publicada abre sin sesión | integración + E2E (HTML crudo del servidor con nombres y título) |
| 5 | Vista previa privada no expone sin publicar | integración (borrador vs. snapshot) y parámetro `?borrador` |
| 6 | Invitados confirman sin panel | integración + E2E |
| 7 | Errores de red y reintentos | E2E: RSVP y comprobante con red caída; guardado del panel fallido con aviso y reintento |
| 8 | Aportes sin duplicados | idempotencia, regalo tomado, envíos simultáneos, reintento tras falla de subida |
| 9 | Comprobantes no públicos | 401 sin sesión, 404 otra pareja, tipo/tamaño, nunca en el sitio público |
| 10 | Estado de pago no modificable por el cliente | `orders` ignora `status`, no hay ruta `paid`, webhook 501, `PATCH /api/orders/…` 404 |
| 11 | Errores de persistencia no simulan éxito | E2E: tras PUT abortado el servidor no tiene el dato y la interfaz muestra el error |

**No probado / bloqueado:** concurrencia entre procesos o instancias, carga, recuperación ante base corrupta o disco lleno, comportamiento con proveedor de pagos real, envío de correos, WhatsApp real, HTTPS/`Secure` de la cookie en un dominio real.

## 11. Decisiones comerciales y de producto pendientes (no se inventaron)

1. **Hosting y base de datos de producción** (define si SQLite en un volumen alcanza o se pasa a Postgres administrado).
2. **Proveedor de pagos** y medios aceptados (hoy solo «alias»/transferencia informada; tarjeta no disponible).
3. **¿Publicar exige pago?** Cuándo se enciende `WEDA_REQUIRE_PAID_ORDER`.
4. **Duración de la publicación, vencimiento, reembolsos, cancelación y mejoras de plan** (el flujo de prueba asume 1 año; el servidor no lo aplica).
5. **Política de sitios despublicados/vencidos/eliminados** (hoy: 410 «no publicado»; sin borrado).
6. **Significado de «confirmado» en un aporte** y quién lo concilia; si habrá comisión.
7. **Indexación de invitaciones** (hoy `noindex`) y qué datos son públicos.
8. **Cómo se identifica a un invitado** (código/QR por invitado vs. nombre) y si el contacto se guarda.
9. **Colaboradores** (¿más de una persona por casamiento?) y **más de un casamiento por cuenta**.
10. **Retención y supresión de datos** (invitados, comprobantes, cuenta), términos y política de privacidad.

## 12. Cambios implementados y próximos bloques

### Implementado
- `src/server/`: `config.ts`, `db.ts` (migraciones), `security.ts` (scrypt, tokens, limitador), `errors.ts`, `draft.ts` (saneado y snapshot), `service.ts` (dominio y autorización), `api.ts` (HTTP), `public.ts` (SSR). Montado en `src/server.ts`.
- Frontend: `src/lib/weda/remote.ts` (sincronización), `public-api.ts`, `public-site.ts`; cuenta real en `/crear/cuenta`; aviso de estado y carga en el panel; publicar/bajar/volver a publicar contra el servidor; sitio público desde el servidor con RSVP y regalos reales (con error y reintento); `AppState.slug`.
- Pruebas: `src/test/server/*.test.ts` (integración, base real) y `e2e/backend.spec.ts` (E2E contra el servidor real).

### Próximos bloques (ordenados por dependencia)
1. **Definir hosting/base** (§11.1) y desplegar con volumen, HTTPS y backups. Bloquea todo lo productivo.
2. **Panel de aportes real:** leer `GET /api/contributions`, ver comprobante, confirmar/rechazar, estado «pendiente», y corregir los textos «recibido». Depende solo de lo ya construido.
3. **Recuperación de clave y verificación de correo** (requiere proveedor de correo) y cambio de correo/clave.
4. **Almacenamiento de archivos** (fotos de portada/galería y `og:image` por pareja; comprobantes a un bucket privado).
5. **Proveedor de pagos:** webhook verificado → `settleOrder`, `WEDA_REQUIRE_PAID_ORDER=true`, conciliación (requiere §11.2–4).
6. **Identificación de invitados** (§11.8), vencimiento y política de despublicación, supresión de datos.
7. **Colaboradores y múltiples casamientos** (tabla `wedding_members`).
8. **Operación:** logging/errores/métricas, límites de tasa compartidos, pruebas de carga.

## 13. Resultados de la última corrida (2026-10-26)

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` | sin errores |
| `npx vitest run` | **144 pasan** (12 archivos). Nuevos: 42 de servidor con **base SQLite real** (`src/test/server/`: cuentas y sesiones, aislamiento entre parejas, persistencia y concurrencia, publicación, RSVP, aportes, comprobantes, órdenes, endurecimiento) |
| `npm run lint` | 0 errores en lo nuevo. Quedan 2 errores `no-explicit-any` en `e2e/explore/action-fuzz.spec.ts` (archivo de otra sesión, no tocado) |
| `npm run build` | correcto; el servidor de producción (`.output/server/index.mjs`) levantó con la base real y respondió `/api/*` |
| HTTP real contra el build | registro, sesión por cookie, `/api/me`, `/api/wedding` (401 sin sesión), `/api/public/{slug}` inexistente → 404, SSR del sitio publicado con nombres y `<title>` de la pareja en el HTML crudo |
| E2E completa contra el servidor real (móvil + escritorio, cuentas únicas por test) | **98 pasaron y 1 falló** en la segunda corrida; el que falló (un test que asumía el slug sin sufijo) se corrigió y **pasa al repetirlo solo**. No se repitió la corrida completa después de ese último ajuste. Incluye 7 recorridos nuevos de `e2e/backend.spec.ts` |
| Suites E2E ajustadas | `helpers.ts` (correo único por test), `account-flow` (la cuenta ya es real), `desktop/journeys` (los tests del borrador local usan `?borrador`; el de publicar usa el slug que asigna el servidor) |

**No se ejecutó:** carga/concurrencia entre procesos, recuperación ante base corrupta o disco lleno, WhatsApp/Facebook reales, dominio con HTTPS (cookie `Secure`), proveedor de pagos o de correo, las suites exploratorias largas (`explore/*`), ni Safari/Firefox.

### Resumen: qué quedó funcionando de verdad, qué requiere configuración y qué no está listo

- **Funciona realmente (probado):** registro e ingreso con sesión en el servidor; casamiento e invitados guardados en la cuenta y abiertos desde otro dispositivo; aislamiento entre parejas; guardado con control de conflictos, error visible y reintento; publicar/bajar/volver a publicar con sitio público desde el servidor (HTML y metadatos de la pareja); confirmación de asistencia sin sesión con reintento y sin duplicados; aportes de regalos en estado «pendiente de revisión» con comprobante privado, idempotencia y estados con historial (por API).
- **Necesita configuración externa:** hosting con **disco persistente** y HTTPS (SQLite), `WEDA_DB_PATH`/`WEDA_DATA_DIR` en un volumen con backups, `WEDA_COOKIE_SECURE`, el dominio (`VITE_SITE_URL`), y —detrás de un proxy— que reenvíe `X-Forwarded-For` de forma confiable (el límite de uso por IP se puede falsear si el servidor está expuesto directo).
- **No está listo para producción:** cobro real y su confirmación (todo sigue siendo de prueba; `WEDA_REQUIRE_PAID_ORDER` apagado); **panel de aportes** (los aportes reales no se ven ni se gestionan desde la interfaz todavía); recuperación de clave, verificación y cambio de correo; almacenamiento de fotos y `og:image` por pareja; vigencia de la publicación; supresión de datos y textos legales; backups; observabilidad; Google/Apple (simulados).
