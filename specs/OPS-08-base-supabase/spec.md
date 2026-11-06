# OPS-08 · Todo Weda en Supabase: base, cuentas y archivos — spec

- **Estado:** en construcción (desde el 2026-11-05, rama `feat/ops-08-supabase`). Funciona contra el proyecto de desarrollo `weda-dev` (São Paulo): 278 pruebas en verde contra Supabase (más 1 que necesita la clave publicable) y 283 en modo local; recorrido real en el servidor de desarrollo (registro, foto en Storage, cobro, publicación, regalo con aporte libre y comprobante, revisión). Falta la limpieza de SQLite (etapa 6), las E2E y la evidencia de cada criterio. Hallazgos al probar: Supabase cierra todas las sesiones al cambiar la clave (se abre una nueva para quien la cambió) y rechaza correos con «ñ» (se responde `invalid_email`).
- **Ajustes aprobados con el plan:** los comprobantes los entrega el servidor después de verificar a la pareja dueña, en lugar de enlaces firmados (Alcance 3), y las fechas y el JSON siguen como texto en esta migración (Alcance 1).
- **Tamaño:** crítica (esquema, cuentas, permisos, datos personales, dinero y seguridad).
- **Plan:** [plan.md](plan.md)
- **Origen:** decisión de la dueña del 2026-11-04 (D-07, anexo 03 §4).

## Problema
Hoy Weda guarda todo en el disco del servidor: la base es un archivo SQLite (`.data/weda.db`, con `node:sqlite`, todavía experimental), y las fotos y los comprobantes son archivos en `media/` y `receipts/`. Las cuentas, sesiones y recuperación de clave están hechas a mano. Por eso Weda solo puede vivir en un servidor con disco persistente, no tiene respaldos y pierde todo si ese disco falla (RK-01).

La dueña decidió pasar **todo** a Supabase, de la forma **más simple posible**: base, cuentas y archivos. Se busca que Weda funcione igual que hoy para la pareja y los invitados, con el servidor sin datos propios en disco.

## Reglas y decisiones que aplica

| ID | Dónde está | Estado | Qué toma de ahí |
|---|---|---|---|
| D-07 | `docs/product-blueprint/03-open-decisions-and-risks.md` §4 | DECIDIDO (2026-11-04) | Todo pasa a Supabase: base PostgreSQL, Supabase Auth y Supabase Storage. La autorización de los datos sigue en el servidor |
| DP-14 | Anexo 03 §2 | PENDIENTE (solo el hosting) | Dónde se aloja el servidor de la aplicación (P6) |
| RK-01 | Anexo 03 §3 | ABIERTO | Pérdida de datos sin respaldos probados |
| RK-08 | Anexo 03 §3 | ABIERTO | Privacidad: cambia el proveedor que guarda los datos personales |
| RK-10 | Anexo 03 §3 | ABIERTO | Concurrencia: con Postgres hay varios escritores, así que hay que revisar transacciones y bloqueos |
| RK-14 | Anexo 03 §3 | ABIERTO | Desaparece al completar esta funcionalidad |
| OPS-02 | `docs/product-blueprint/01-feature-inventory.md` §14 | PENDIENTE | Respaldos y restauración |
| OPS-03 | Inventario §14 | IMPLEMENTADA | Migraciones automáticas: se conservan con otra herramienta |
| ANL-02 | Inventario | DECIDIDO | Analítica «en la misma base», que pasa a ser Postgres |
| D-03 | Anexo 03 §4 | DECIDIDO | Un evento por usuario: no se agrega multiusuario en esta migración |
| AUTH-01, AUTH-02, AUTH-05, AUTH-06 | Inventario §AUTH | IMPLEMENTADAS (parcial la 05 y la 06) | Registro e ingreso, recuperación de clave, cambio de clave y cierre de sesiones: se conserva lo que existe, ahora con Supabase Auth |
| AUTH-03 | Inventario | DECIDIDO agregar, no implementada | Ingreso con Google: queda fuera de esta migración, pero Supabase Auth lo deja más simple de sumar después |
| AUTH-04 | Inventario | PENDIENTE | Verificación del correo al registrarse: ver P10 |
| AUTH-07 | Inventario | DECIDIDO, no implementada | Segundo factor: fuera de esta migración; Supabase Auth lo soporta |
| Reglas de dinero, planes, trial y privacidad (BR-01, BR-13, BR-62 a BR-65, IC-07) | Catálogo y anexo 03 | DECIDIDO | No cambian: la migración no modifica reglas de negocio |

Guía técnica: [`02c-validation-report.md`](../../docs/data-architecture/02c-validation-report.md) §2.12 (de SQLite a PostgreSQL) y [`backend-readiness.md`](../../docs/backend-readiness.md).

## Decisiones de la funcionalidad
Todas del 2026-11-04, de la dueña, al responder las preguntas de esta spec:

- **P1 · Cuentas:** registro, login, sesiones, recuperación y cambio de clave pasan a **Supabase Auth**. Se dejan de usar las tablas y el código propios de cuentas y sesiones.
- **P2 · Archivos:** fotos y comprobantes pasan a **Supabase Storage**.
- **P5 · Desarrollo:** un **proyecto de Supabase de desarrollo**, separado del de producción. No se usa Docker ni Postgres local.
- **P8 · Dependencias:** se aprueban el **cliente oficial de Supabase** y un **driver de PostgreSQL** para el servidor. Los paquetes exactos y sus versiones se fijan en el plan.
- **P3 · Región: São Paulo (`sa-east-1`).** La dueña pidió Buenos Aires, pero Supabase no tiene región en Argentina: la única de Sudamérica es São Paulo ([regiones de Supabase](https://supabase.com/docs/guides/platform/regions), consultado el 2026-11-04). La dueña la confirmó.
- **P10 · Sin confirmación de correo al registrarse:** la pareja entra apenas se registra y el trial arranca enseguida, igual que hoy. AUTH-04 sigue pendiente.
- **Criterio general: lo más simple posible.** Ante dos caminos, se elige el que agrega menos piezas, aunque sea menos flexible.

Lo siguiente sale de las reglas vigentes y no necesita una decisión nueva:
- **La autorización de los datos sigue en `service.ts`** y cada consulta filtra por el usuario autenticado (`.claude/rules/backend-data.md`). El navegador no habla directo con la base.
- **Las claves de servidor de Supabase** (service role y la conexión a la base) **nunca llegan al navegador**. Solo puede ser pública la clave anónima, y solo si el plan la necesita.
- **No cambian las reglas de negocio ni las pantallas.** Si Supabase Auth obliga a cambiar algo visible (por ejemplo, el texto de un correo), se lista en el plan y se aprueba.

## Supuestos
- **P4 · Seguridad a nivel de fila:** por simplicidad, las tablas se crean con RLS **activada y sin políticas**. Así nadie puede leerlas con la clave anónima y solo el servidor accede, con su credencial. Las políticas por usuario quedan para después.
- **P9 · Datos existentes:** la base nueva arranca vacía, porque no hay producción. Los datos locales de desarrollo no se migran.

## Alcance
1. **Base:** reemplazar SQLite por PostgreSQL de Supabase en `src/server/db.ts` y `src/server/service.ts` (16 migraciones y unas 93 consultas). Recrear el esquema actual con tipos de Postgres: fechas, JSON e identificadores de usuario de Supabase Auth. Mantener migraciones versionadas de solo agregado (OPS-03).
2. **Cuentas** con Supabase Auth, conservando lo que la pareja puede hacer hoy:
   - registrarse, entrar y salir;
   - ver cuántas otras sesiones tiene abiertas y cerrarlas;
   - recuperar la clave por correo;
   - cambiar la clave pidiendo la actual, cerrando las demás sesiones;
   - límites de intentos.
3. **Archivos** con Supabase Storage:
   - **comprobantes** en un bucket privado, accesibles solo para la pareja dueña (enlaces firmados de corta duración);
   - **fotos** de la página pública, servidas desde Storage.
4. **Concurrencia:** revisar las transacciones que hoy dependen de que SQLite tiene un solo escritor (RK-10): propietario único, revisión del borrador, aportes, publicación y pagos de prueba.
5. **Pruebas:** adaptar `src/test/server/` (16 archivos) y las e2e para que corran contra el proyecto de desarrollo.
6. **Documentación:** `.env.example`, `CLAUDE.md`, `docs/backend-readiness.md`, `docs/datos-personales.md`, la página de privacidad, el inventario y los riesgos.
7. **Correos:** el de recuperación de clave lo manda Supabase Auth, en español. Los demás correos de Weda siguen con Resend.

## Criterios de aceptación

| # | Criterio | Regla | Cómo se verifica |
|---|---|---|---|
| CA-1 | Toda la persistencia usa Supabase: no queda `node:sqlite`, ni archivos de datos en el disco del servidor, ni tablas propias de usuarios y sesiones | D-07, RK-14 | Búsqueda en el código; `npm run build`; el servidor arranca sin `WEDA_DATA_DIR` |
| CA-2 | El esquema reproduce las tablas, claves, restricciones únicas y borrados en cascada actuales, sin perder ninguna regla | OPS-03 | Migración desde cero sobre el proyecto de desarrollo; revisión contra `db.ts` |
| CA-3 | Las migraciones corren en orden, una sola vez y de solo agregado | OPS-03 | Prueba de integración |
| CA-4 | Las cuentas se comportan igual que hoy: registro sin confirmación de correo (P10), login, logout, contar y cerrar las otras sesiones, recuperar la clave (misma respuesta exista o no la cuenta) y cambiarla con la actual | P1 | Pruebas actuales de `sessions`, `password-reset` y `password-change`, adaptadas sin bajar aserciones |
| CA-5 | El aislamiento por usuario sigue intacto: nadie ve ni modifica datos de otro | `backend-data.md` | `auth-isolation.test.ts` en verde |
| CA-6 | La API pública no devuelve datos privados | `backend-data.md` | Pruebas existentes de la API pública |
| CA-7 | Un comprobante solo lo puede abrir la pareja dueña; un enlace ajeno o vencido no sirve | P2, `backend-data.md` | Prueba nueva de acceso a un comprobante ajeno |
| CA-8 | Con la clave anónima no se puede leer ni escribir ninguna tabla | P4 | Prueba nueva contra el proyecto de desarrollo |
| CA-9 | Dos pedidos simultáneos no rompen el propietario único, la revisión del borrador ni los aportes | RK-10 | Prueba de concurrencia nueva |
| CA-10 | Las claves de servidor solo existen en el servidor y están documentadas en `.env.example` sin valores | `backend-data.md` | Revisión de `VITE_*` y del bundle del navegador |
| CA-11 | Los recorridos principales funcionan igual en celular y compu: registro, armado, fotos, publicación con pago de prueba, aporte con comprobante, confirmación y RSVP | — | `npm run test:e2e` y recorrido real en el navegador |
| CA-12 | Producción tiene respaldos diarios activos y una restauración probada | RK-01, OPS-02 | Registro de la prueba de restauración (fecha y resultado) |
| CA-13 | `docs/datos-personales.md` y la página de privacidad nombran a Supabase y la región donde se guardan los datos (São Paulo, Brasil) | RK-08 | Revisión de los documentos |
| CA-14 | `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` en verde | `CLAUDE.md` | Salida de los comandos |

## Fuera de alcance
- Cambiar reglas de negocio, pantallas o textos, salvo lo que Supabase Auth obligue y se apruebe en el plan.
- Multiusuario o varios eventos por usuario (D-03).
- El modelo conceptual completo (IC-15): libro de aportes, auditoría o versiones.
- Elegir el hosting de la aplicación (DP-14).
- Ingreso con Google (AUTH-03, decidido agregar) y segundo factor (AUTH-07): quedan para después de la migración. Con Supabase Auth son más simples de sumar.

## Preguntas abiertas

| # | Pregunta | Opciones | Bloquea |
|---|---|---|---|
| P6 | ¿Dónde se aloja el servidor de la aplicación? | Es lo que queda de DP-14. Con todo en Supabase, cualquier hosting de Node sirve, Vercel incluido | No bloquea la spec; bloquea el deploy |
| P7 | ¿Qué plan de Supabase para producción? | Hace falta uno con respaldos diarios y sin pausa por inactividad. Confirmar precio y condiciones en supabase.com | No bloquea la spec; bloquea el deploy |
| P11 | ¿Con qué servicio salen los correos de cuentas? | El servicio de correo incluido en Supabase tiene límites bajos y sirve para pruebas. Para producción, lo simple es conectarlo a Resend, que Weda ya usa | No bloquea la spec; bloquea el deploy |

## Revisión de consistencia (antes de construir)
- [x] Todos los IDs citados existen y su estado es el indicado (verificado el 2026-11-04 contra el Blueprint).
- [x] Ningún criterio contradice una regla decidida: la migración no cambia reglas de negocio.
- [x] Lo pendiente está marcado como pendiente: P6, P7 y P11 no bloquean la construcción, solo el deploy.
- [x] P1, P2, P3, P5, P8 y P10 respondidas por la dueña (2026-11-04).
- [ ] Proyecto de Supabase de desarrollo creado por la dueña, con sus claves cargadas en el `.env` local (Claude no las ve ni las escribe).

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 | |
| CA-2 | |
| CA-3 | |
| CA-4 | |
| CA-5 | |
| CA-6 | |
| CA-7 | |
| CA-8 | |
| CA-9 | |
| CA-10 | |
| CA-11 | |
| CA-12 | |
| CA-13 | |
| CA-14 | |
