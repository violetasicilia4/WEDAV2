// Base de datos: SQLite nativo de Node (node:sqlite). Toda la persistencia pasa por acá y por service.ts; cambiar de motor
// (Postgres) toca solo estos dos archivos. Las migraciones son ordenadas e idempotentes (PRAGMA user_version).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

/** Cada migración corre una sola vez, en una transacción. No se editan las ya publicadas: se agrega una nueva. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,                 -- sha256 del token de la cookie (el token nunca se guarda)
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  -- Un casamiento por usuario por ahora (UNIQUE owner_id). Para colaboradores: tabla wedding_members (pendiente).
  CREATE TABLE weddings (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE,                    -- se asigna al publicar por primera vez y no cambia
    draft TEXT NOT NULL,                 -- JSON saneado: AppState sin invitados, aportes ni publicación
    revision INTEGER NOT NULL DEFAULT 1, -- concurrencia optimista: cada guardado exige la revisión que el cliente vio
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE guests (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    first TEXT NOT NULL,
    last TEXT NOT NULL DEFAULT '',
    name_key TEXT NOT NULL,              -- nombre normalizado: las respuestas públicas actualizan a la misma persona en vez de duplicarla
    status TEXT NOT NULL CHECK (status IN ('confirmed','declined','pending')),
    menu TEXT NOT NULL DEFAULT '',
    group_id TEXT,
    source TEXT NOT NULL CHECK (source IN ('rsvp','manual')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX guests_wedding_name ON guests(wedding_id, name_key);
  CREATE TABLE rsvp_events (            -- historial de respuestas públicas, para investigar cambios
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    menu TEXT NOT NULL,
    at TEXT NOT NULL
  );

  -- Lo único que ve un invitado: una copia (snapshot) hecha al publicar. Los cambios del borrador no aparecen hasta publicar de nuevo.
  CREATE TABLE publications (
    wedding_id TEXT PRIMARY KEY REFERENCES weddings(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('live','taken_down')),
    plan_id TEXT NOT NULL CHECK (plan_id IN ('regalos','invitacion','completo')),
    snapshot TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    published_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT                      -- NULL: la duración de la publicación es una decisión comercial pendiente; no se aplica vencimiento
  );

  -- Compras de plan. «paid» solo lo puede fijar el servidor (webhook del proveedor); ninguna ruta pública lo hace.
  CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('regalos','invitacion','completo')),
    amount INTEGER NOT NULL CHECK (amount >= 0),   -- pesos, tomado de plans.ts en el servidor
    status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','cancelled')),
    provider TEXT,
    provider_ref TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    paid_at TEXT
  );
  CREATE UNIQUE INDEX orders_provider_ref ON orders(provider, provider_ref) WHERE provider_ref IS NOT NULL;
  CREATE INDEX orders_wedding ON orders(wedding_id);

  -- Aportes: lo que un invitado informa. «confirmed» = la pareja verificó el ingreso (manual) o, a futuro, el proveedor lo confirmó.
  CREATE TABLE contributions (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    giver_name TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    how TEXT NOT NULL CHECK (how IN ('alias')),    -- tarjeta: sin proveedor de pagos, no se acepta
    status TEXT NOT NULL CHECK (status IN ('pending_review','confirmed','rejected')),
    total INTEGER NOT NULL CHECK (total > 0),
    idempotency_key TEXT NOT NULL,
    manage_token_hash TEXT NOT NULL,     -- capacidad del invitado para adjuntar su comprobante (sin cuenta)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (wedding_id, idempotency_key)
  );
  CREATE TABLE contribution_items (
    contribution_id TEXT NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    gift_id TEXT NOT NULL,
    gift_name TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),    -- tomado del snapshot publicado, nunca del cliente
    PRIMARY KEY (contribution_id, gift_id)
  );
  CREATE TABLE contribution_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contribution_id TEXT NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    actor TEXT NOT NULL CHECK (actor IN ('guest','owner','system')),
    from_status TEXT,
    to_status TEXT,
    note TEXT NOT NULL DEFAULT '',
    at TEXT NOT NULL
  );
  CREATE TABLE receipts (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    contribution_id TEXT NOT NULL UNIQUE REFERENCES contributions(id) ON DELETE CASCADE,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_key TEXT NOT NULL,           -- nombre aleatorio dentro de WEDA_DATA_DIR/receipts (privado)
    created_at TEXT NOT NULL
  );
  `,
];

export function openDb(file: string): Db {
  if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  // Se carga recién acá: si el entorno no tiene `node:sqlite` (Node < 22.5), solo falla la API y el resto del sitio sigue funcionando.
  const { DatabaseSync: Database } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
  const db = new Database(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

export function migrate(db: Db) {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]!);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

/** Ejecuta `fn` en una transacción inmediata (toma el candado de escritura desde el inicio: las lecturas-validaciones son atómicas con la escritura). */
export function tx<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
