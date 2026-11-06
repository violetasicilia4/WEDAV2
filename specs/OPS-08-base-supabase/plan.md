# OPS-08 · Todo Weda en Supabase — plan técnico

- **Spec:** [spec.md](spec.md)
- **Estado:** aprobado (2026-11-04, la dueña), con los ajustes 1 y 2 y la regla de ESLint de la tabla de riesgos.
- **Rama:** `feat/ops-08-supabase`, desde `main` cuando el trial (PAY-07) ya esté mergeado. Si todavía no lo está, desde `feat/trial-14-dias-ciclo-vida`, y se aclara en el PR.

Documenta **cómo** se construye lo que pide la spec. No crea decisiones de producto.

## Enfoque
**Lo más simple posible, sin cambios visibles.** La interfaz, las rutas `/api/*`, la cookie `weda_session` y las direcciones de las fotos (`/api/media/<nombre>`) quedan iguales. Cambia solo lo que hay detrás del servidor:

| Hoy | Después |
|---|---|
| `node:sqlite` en `.data/weda.db` | PostgreSQL de Supabase, con el driver `postgres` |
| Tablas `users` y `sessions` propias, claves con scrypt | Supabase Auth (`auth.users`, `auth.sessions`) |
| Fotos en `.data/media/` | Bucket `media` de Supabase Storage |
| Comprobantes en `.data/receipts/` | Bucket privado `receipts` de Supabase Storage |
| Correos con Resend | Igual, también el de recuperación de clave |

**Dependencias** (aprobadas por P8; la versión exacta se fija al instalar):
- `postgres`: el driver de PostgreSQL. No tiene dependencias propias.
- `@supabase/supabase-js`: el cliente oficial, para Auth y Storage.

No se agregan `@supabase/ssr` ni librerías de migraciones: la cookie y las migraciones las sigue manejando Weda, como hoy.

**Variables nuevas, todas de servidor** (se documentan en `.env.example` sin valores):
- `SUPABASE_URL`;
- `SUPABASE_SECRET_KEY`: la clave de servicio, nunca llega al navegador;
- `SUPABASE_DB_URL`: la conexión a Postgres a través del pooler de Supabase.

Se dejan de usar `WEDA_DATA_DIR` y `WEDA_DB_PATH`.

## Ajustes a la spec que propone este plan
Los dos simplifican, y se piden aprobar junto con el plan:
1. **Comprobantes sin enlaces firmados.** La spec dice «enlaces firmados de corta duración». Es más simple y más seguro que el servidor lea el comprobante del bucket privado **después** de verificar que quien lo pide es la pareja dueña, y lo entregue él, como hoy. Así no existe ningún enlace que se pueda compartir o que venza. CA-7 se cumple igual.
2. **Fechas y JSON siguen como texto.** La spec habla de «tipos de Postgres» para fechas y JSON. Pasar a `timestamptz` y `jsonb` cambia lo que devuelven las consultas y obliga a tocar muchas comparaciones del servicio. Para no cambiar comportamiento, en esta migración se guardan como texto ISO y texto JSON, igual que hoy. Pasar a tipos nativos queda como mejora posterior.

## Base de datos
**Capa `db.ts`:** se reescribe con un adaptador chico que mantiene la forma de uso actual, para que el cambio en `service.ts` sea mecánico:
- `db.get(sql, ...params)`, `db.all(...)` y `db.run(...)`, que pasan a ser asíncronos. `run` devuelve las filas afectadas, como `.changes` hoy.
- Convierte los `?` en `$1, $2…` y usa `sql.unsafe(query, params)` del driver, con `prepare: false`, que es lo que pide el pooler de Supabase.
- **`tx(clave, fn)`** abre una transacción y toma un candado por casamiento (`pg_advisory_xact_lock`). Así se reproduce lo que hoy garantiza `BEGIN IMMEDIATE` (un solo escritor) sin bloquear a los demás casamientos (RK-10, CA-9).

**Esquema:** la base nueva arranca vacía (P9), así que en vez de traducir las 16 migraciones una por una se escribe **una sola migración inicial** que crea el esquema actual final:
- las 17 tablas menos `users` y `sessions`, que pasan a Supabase Auth;
- **las columnas que apuntan a un usuario** (`weddings.owner_id` y `password_resets.user_id`) pasan a `uuid REFERENCES auth.users(id) ON DELETE CASCADE`, igual que hoy. `payout_methods.created_by` y `mail_log.ref` no tienen clave foránea hoy: siguen como texto, ahora con el id de Supabase;
- `marketing_consents.email` tenía `COLLATE NOCASE` y un índice común, no único: el índice pasa a ser sobre `lower(email)` y las búsquedas comparan en minúsculas;
- se conservan las mismas claves, restricciones únicas (incluido `owner_id UNIQUE`, D-03), índices y borrados en cascada (CA-2);
- traducciones puntuales: `AUTOINCREMENT` → `generated always as identity`; `json_extract` / `json_set` / `strftime` → sus equivalentes de Postgres sobre el texto JSON;
- **RLS activada sin políticas** en todas las tablas (P4, CA-8). El servidor entra con una credencial que no pasa por RLS.

**Migraciones:** la lista `MIGRATIONS` se reinicia con esa migración inicial, y la versión se guarda en una tabla `weda_migrations` en lugar de `PRAGMA user_version`. Siguen corriendo solas al primer uso, en orden, una sola vez y con un candado para que dos procesos no las corran a la vez (OPS-03, CA-3). Las migraciones de SQLite se eliminan. Es la única vez que se reescriben migraciones, y está aprobado por D-07: a partir de acá vuelve la regla de solo agregado.

## Servidor
1. **`service.ts`**, cambio mecánico: cada `this.db.prepare(X).get|all|run(...)` (unas 110) pasa a `await this.db.get|all|run(X, ...)`, y los métodos públicos pasan a ser `async`. No cambia ninguna regla ni ningún filtro por usuario.
2. **`api.ts` y `public.ts`** esperan las llamadas, que ahora son asíncronas. `getService` crea la conexión una sola vez por proceso.
3. **`mail.ts`:** `mail_log` se escribe con el adaptador nuevo. Resend no cambia.

## Cuentas con Supabase Auth
El servidor usa un cliente de Supabase con la clave de servicio, sin guardar sesiones en memoria (`persistSession: false`). La cookie `weda_session` (httpOnly, SameSite=Lax, Secure en producción) guarda el token de acceso y el de renovación de Supabase.

| Acción | Cómo se hace |
|---|---|
| Registro | `auth.admin.createUser` con el correo ya confirmado (P10: sin correo de confirmación) y después el ingreso. Correo repetido → `email_taken`, como hoy |
| Ingreso | `auth.signInWithPassword`. El límite de intentos propio (`loginLimiter`) se mantiene |
| Sesión en cada pedido | Se verifica el token de acceso **y** que la sesión siga existiendo en `auth.sessions`. Así cerrar sesiones tiene efecto inmediato, como hoy. Si el token venció y la sesión sigue viva, se renueva con el token de renovación y se actualiza la cookie |
| Salir | Se cierra la sesión actual en Supabase y se borra la cookie |
| Contar las otras sesiones | Consulta a `auth.sessions` del usuario, sin contar la actual |
| Cerrar las otras sesiones | `auth.admin.signOut(token, 'others')` |
| Pedir recuperación | `auth.admin.generateLink({ type: 'recovery' })` devuelve el código **sin mandar correo**. Weda lo guarda hasheado en `password_resets` (un enlace nuevo anula los anteriores) y manda **su propio correo con Resend**, con el texto en español de hoy. Responde lo mismo exista o no la cuenta |
| Cambiar la clave con el enlace | Se valida el enlace en `password_resets` (sin usar y sin vencer), se verifica con `auth.verifyOtp`, se cambia la clave y se cierran **todas** las sesiones |
| Cambiar la clave desde el perfil | Se comprueba la clave actual con un ingreso aparte (esa sesión de comprobación se cierra en el acto), se cambia la clave, se cierran las otras sesiones y se anulan los enlaces de recuperación pendientes |

**Por qué el correo de recuperación sale por Resend y no por Supabase:** se conservan el texto en español, el registro en `mail_log` y las pruebas actuales, que leen el correo de prueba. Además no hace falta configurar el correo de Supabase. La pregunta P11 queda sin objeto para esta funcionalidad.

Las funciones de clave propias de `security.ts` (scrypt) se borran si ya nadie las usa.

## Archivos con Supabase Storage
Los buckets se crean solos al iniciar si no existen:
- **`media`, público:** las fotos se suben con su nombre actual (`<sha256>.<ext>`, que evita duplicados). La ruta `/api/media/<nombre>` sigue existiendo y redirige a la dirección pública de Storage, así no cambian los borradores ni las páginas publicadas.
- **`receipts`, privado:** el comprobante se sube **antes** de la transacción del aporte. Si la transacción falla, se borra el archivo (hoy se borra del disco). Para leerlo, el servidor verifica que el pedido sea de la pareja dueña y recién ahí lo descarga del bucket y lo entrega (ajuste 1).
- Se mantienen los controles actuales de tipo y tamaño de archivo (`media.ts` y `MAX_RECEIPT_BYTES`).

## Interfaz
Sin cambios. Si durante la construcción aparece algo visible que haya que cambiar, se frena y se consulta.

## Etapas
Cada etapa termina con el resultado indicado. Las etapas 1 a 3 se verifican juntas, porque la base nueva ya no tiene tablas de usuarios.

| # | Etapa | Termina con |
|---|---|---|
| 0 | **Preparación (dueña):** crear el proyecto de desarrollo en São Paulo; cargar `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SUPABASE_DB_URL` en el `.env` local; en Auth, subir los límites de ingreso del proyecto de desarrollo para que las pruebas no los agoten; liberar espacio en disco (hoy hay menos de 1 GB) | Claves cargadas; Claude no las ve |
| 1 | Instalar las dos dependencias; nuevo `db.ts` con adaptador, transacciones, migración inicial y RLS | Migración corrida contra el proyecto de desarrollo |
| 2 | `service.ts`, `api.ts`, `public.ts` y `mail.ts` asíncronos sobre el adaptador | `npm run typecheck` en verde |
| 3 | Cuentas con Supabase Auth | Pruebas de cuentas en verde |
| 4 | Fotos y comprobantes en Storage | Pruebas de aportes y fotos en verde |
| 5 | Pruebas: entorno de prueba nuevo, adaptación de las 16 suites y pruebas nuevas | `npm test` en verde |
| 6 | Limpieza: borrar `node:sqlite`, `.data` y lo que quedó sin uso. Documentación | Búsqueda sin rastros de SQLite |
| 7 | Verificación final: typecheck, lint, tests, build, e2e y recorrido en celular y compu | Evidencia en la spec |

## Pruebas
**Entorno de prueba (`helpers.ts`):** cada `makeEnv()` crea un esquema propio de Postgres (`test_<azar>`) en el proyecto de desarrollo, corre ahí la migración y lo borra al cerrar. Así las suites corren en paralelo sin mezclar datos, y las que cuentan filas (por ejemplo el embudo) siguen siendo exactas. Los usuarios de prueba se crean en Supabase Auth con correos únicos y se borran al cerrar. Los archivos van a una carpeta propia del entorno dentro de cada bucket.

**Pruebas que leen la base directo** (`svc.db.prepare(...)` en 11 archivos): pasan al adaptador nuevo con `await`, sin bajar aserciones.

**Pruebas específicas de SQLite:** `migration-8.test.ts` prueba una migración de SQLite que deja de existir. Se reemplaza por una prueba de la migración inicial (CA-2, CA-3). Las partes de `hardening.test.ts` sobre `user_version` pasan a `weda_migrations`.

| Criterio | Prueba |
|---|---|
| CA-1 | Búsqueda de `node:sqlite`, `dataDir` y `.data` en `src/server/`; el servidor arranca sin `WEDA_DATA_DIR` |
| CA-2, CA-3 | Prueba nueva de la migración inicial: tablas, restricciones, que corra una sola vez y en orden |
| CA-4 | `sessions`, `password-reset` y `password-change` adaptadas, con las mismas aserciones |
| CA-5 | `auth-isolation.test.ts` en verde |
| CA-6 | Pruebas actuales de la API pública |
| CA-7 | Prueba nueva: otra pareja y alguien sin sesión no pueden leer un comprobante ajeno |
| CA-8 | Prueba nueva: con la clave anónima, leer y escribir cualquier tabla falla |
| CA-9 | Prueba nueva: dos guardados del borrador simultáneos (uno gana, el otro recibe conflicto) y dos aportes con la misma clave de idempotencia (se crea uno solo) |
| CA-10 | Revisión de `VITE_*` y búsqueda de las claves de Supabase en `dist/` después del build |
| CA-11 | `npm run test:e2e` contra el servidor de desarrollo con el proyecto de desarrollo, más el recorrido en celular (390 px) y compu |
| CA-12 | Al crear producción: respaldos activos y una restauración en un proyecto limpio, con fecha y resultado anotados en la spec. Depende de P7 |
| CA-13 | Revisión de `docs/datos-personales.md` y de `src/routes/privacidad.tsx` |
| CA-14 | Salida de los cuatro comandos |

## Riesgos
| Riesgo | Mitigación |
|---|---|
| Las pruebas hablan con Supabase por red: son más lentas y pueden fallar por la conexión | Un solo proyecto de desarrollo en São Paulo; tiempos de espera generosos; si se vuelve inmanejable, se reconsidera P5 |
| Los límites de ingreso de Supabase Auth cortan las pruebas | Subirlos en el proyecto de desarrollo (etapa 0); el registro usa `admin.createUser`, que no tiene ese límite |
| Cambiar a asíncrono 110 consultas puede dejar algún `await` olvidado | El typecheck atrapa los casos en que se usa el resultado; los `run` sin resultado no. Se propone activar `@typescript-eslint/no-floating-promises` solo para `src/server/`. Hoy ESLint no tiene reglas con tipos, así que hay que tocar `eslint.config.js`, que pide aprobación. Si no se aprueba, se revisa a mano cada `run` y se corren las suites completas |
| El pooler de Supabase con `prepare: false` y las transacciones | El candado por casamiento va dentro de la transacción (`pg_advisory_xact_lock`), que funciona con el pooler en modo transacción |
| Un token de acceso robado sigue sirviendo hasta que vence | Cada pedido verifica también que la sesión exista en `auth.sessions`: cerrar sesión lo anula en el acto, como hoy |
| El disco casi lleno impide instalar o compilar | Liberar espacio en la etapa 0 |
| Los datos personales pasan a Brasil | CA-13: actualizar privacidad y `datos-personales.md` antes de producción; la validación legal sigue en RK-08 |

## Documentación a actualizar
- `CLAUDE.md`: Supabase en lugar de SQLite, sin el requisito de Node 22.5 por `node:sqlite` ni la base en `.data/`.
- `.claude/rules/backend-data.md`: base, migraciones (tabla `weda_migrations`), Storage y claves de Supabase.
- `.env.example`: las tres variables nuevas, sin valores.
- `docs/backend-readiness.md`: aviso arriba que apunte a esta spec (es un documento fechado).
- `docs/datos-personales.md` y `src/routes/privacidad.tsx`: proveedor y región (CA-13).
- Blueprint: OPS-07 sin objeto, OPS-08 implementada, RK-14 cerrado, RK-01 actualizado.
