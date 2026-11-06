// PostgreSQL de Supabase (OPS-08, D-07) detrás del adaptador `Db` (db.ts).
// - Conexión por el pooler de Supabase en modo transacción: sin consultas preparadas (`prepare: false`).
// - `tx(clave, fn)`: transacción con un candado por clave (`pg_advisory_xact_lock`). Reproduce lo que en SQLite garantizaba un solo
//   escritor, sin frenar a los demás casamientos (RK-10).
// - Fechas y JSON se guardan como texto ISO y texto JSON (ajuste 2 del plan).
// - Los enteros grandes (`bigint`, `count(*)`, `sum`) vuelven como número de JavaScript (los importes en pesos entran holgados).
import { AsyncLocalStorage } from 'node:async_hooks';
import postgres from 'postgres';
import type { Db, Row } from './db';

/** `?` → `$1, $2…`, salteando los textos entre comillas. */
export function toPg(sql: string): string {
  let out = '';
  let n = 0;
  let quote: string | null = null;
  for (const ch of sql) {
    if (quote) { if (ch === quote) quote = null; out += ch; continue; }
    if (ch === "'" || ch === '"') { quote = ch; out += ch; continue; }
    out += ch === '?' ? `$${++n}` : ch;
  }
  return out;
}

const param = (v: unknown) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

type Sql = postgres.Sql<Record<string, never>>;

export class PgDb implements Db {
  private inTx = new AsyncLocalStorage<postgres.TransactionSql<Record<string, never>>>();
  constructor(public sql: Sql) {}
  private q() { return this.inTx.getStore() ?? this.sql; }
  async all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
    return [...(await this.q().unsafe(toPg(sql), params.map(param) as never[]))] as T[];
  }
  async get<T = Row>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    return (await this.all<T>(sql, ...params))[0];
  }
  async run(sql: string, ...params: unknown[]) {
    const r = await this.q().unsafe(toPg(sql), params.map(param) as never[]);
    return { changes: r.count };
  }
  async exec(sql: string) {
    await this.q().unsafe(sql).simple();
  }
  async tx<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inTx.getStore()) return fn(); // ya dentro de una transacción: se suma a ella
    return (await this.sql.begin(async t => {
      await t.unsafe('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
      return this.inTx.run(t, fn);
    })) as T;
  }
  async close() { await this.sql.end({ timeout: 5 }); }
}

/** Conexión al pooler de Supabase. `schema`: esquema propio (lo usan las pruebas, uno por entorno). */
export function connectPg(url: string, schema?: string, max = 5): Sql {
  return postgres(url, {
    prepare: false,
    max,
    idle_timeout: 20,
    onnotice: () => {},
    types: { bigint: { to: 20, from: [20, 1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
    ...(schema ? { connection: { search_path: `${schema}, public` } } : {}),
  }) as unknown as Sql;
}

/**
 * Migraciones de Postgres: ordenadas, una sola vez cada una y de solo agregado (OPS-03, CA-3). La versión aplicada se guarda en
 * `weda_migrations`. Un candado evita que dos procesos las corran a la vez. La primera crea el esquema actual completo: la base nueva arranca
 * vacía (P9), así que no se traducen una por una las migraciones de SQLite (aprobado en el plan, D-07).
 */
export const PG_MIGRATIONS: string[] = [
  // 1 (2026-11-05): esquema inicial. Mismas tablas, claves, únicos, índices y borrados en cascada que SQLite (versión 9), salvo `users` y
  // `sessions`, que pasan a Supabase Auth (`auth.users`, `auth.sessions`). RLS activada y sin políticas en todas (P4): con la clave anónima
  // nadie lee ni escribe; solo el servidor, con su credencial.
  `
  CREATE TABLE weddings (
    id TEXT PRIMARY KEY,
    owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,  -- un evento por usuario (D-03)
    slug TEXT UNIQUE,                    -- se asigna al publicar por primera vez y no cambia
    draft TEXT NOT NULL,                 -- JSON saneado: AppState sin invitados, aportes ni publicación
    revision INTEGER NOT NULL DEFAULT 1, -- concurrencia optimista: cada guardado exige la revisión que el cliente vio
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    trial_started_at TEXT                -- PAY-07: inicio del trial; NULL = la celebración todavía no se creó
  );
  CREATE TABLE password_resets (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,     -- sha256 del token del enlace (el token nunca se guarda)
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT
  );
  CREATE INDEX password_resets_user ON password_resets(user_id);
  CREATE TABLE guests (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    first TEXT NOT NULL,
    last TEXT NOT NULL DEFAULT '',
    name_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed','declined','pending')),
    menu TEXT NOT NULL DEFAULT '',
    group_id TEXT,
    source TEXT NOT NULL CHECK (source IN ('rsvp','manual')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX guests_wedding_name ON guests(wedding_id, name_key);
  CREATE TABLE rsvp_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    menu TEXT NOT NULL,
    at TEXT NOT NULL
  );
  CREATE TABLE publications (
    wedding_id TEXT PRIMARY KEY REFERENCES weddings(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('live','taken_down')),
    plan_id TEXT NOT NULL CHECK (plan_id IN ('regalos','invitacion','completo')),
    snapshot TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    published_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT                      -- historia: sin vencimiento desde PAY-07 (BR-65)
  );
  CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('regalos','invitacion','completo')),
    amount BIGINT NOT NULL CHECK (amount >= 0),   -- pesos, tomado de plans.ts en el servidor
    status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','cancelled')),
    provider TEXT,
    provider_ref TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    paid_at TEXT
  );
  CREATE INDEX orders_wedding ON orders(wedding_id);
  CREATE UNIQUE INDEX orders_provider_ref ON orders(provider, provider_ref) WHERE provider_ref IS NOT NULL;
  CREATE TABLE payment_events (
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    outcome TEXT NOT NULL,
    received_at TEXT NOT NULL,
    PRIMARY KEY (provider, event_id)
  );
  CREATE TABLE contributions (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    giver_name TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    how TEXT NOT NULL CHECK (how IN ('alias')),
    status TEXT NOT NULL CHECK (status IN ('pending_review','confirmed','rejected')),
    total BIGINT NOT NULL CHECK (total > 0),
    idempotency_key TEXT NOT NULL,
    manage_token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    giver_email TEXT NOT NULL DEFAULT '',
    UNIQUE (wedding_id, idempotency_key)
  );
  CREATE TABLE contribution_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contribution_id TEXT NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('gift','free')),   -- GIFT-09: regalo de la lista o aporte libre
    gift_id TEXT,
    gift_name TEXT,
    suggested_amount BIGINT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    CHECK ((kind = 'gift') = (gift_id IS NOT NULL)),
    CHECK ((kind = 'gift') = (gift_name IS NOT NULL))
  );
  CREATE INDEX contribution_items_contribution ON contribution_items(contribution_id);
  CREATE TABLE contribution_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
    storage_key TEXT NOT NULL,           -- nombre aleatorio dentro del bucket privado «receipts»
    created_at TEXT NOT NULL
  );
  CREATE TABLE payout_methods (
    id TEXT PRIMARY KEY,
    wedding_id TEXT NOT NULL REFERENCES weddings(id),   -- sin CASCADE: es un registro financiero (GIFT-14)
    version INTEGER NOT NULL,
    alias TEXT NOT NULL,
    bank TEXT NOT NULL,
    cbu TEXT NOT NULL,
    created_by TEXT,                     -- id del usuario de Supabase que hizo el cambio
    created_at TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('owner','migrated')),
    UNIQUE (wedding_id, version)
  );
  CREATE TABLE marketing_consents (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,                 -- se compara en minúsculas (en SQLite era COLLATE NOCASE)
    source TEXT NOT NULL CHECK (source IN ('gift','rsvp')),
    wedding_id TEXT REFERENCES weddings(id) ON DELETE SET NULL,
    text_version TEXT NOT NULL,
    granted_at TEXT NOT NULL,
    revoked_at TEXT
  );
  CREATE INDEX marketing_consents_email ON marketing_consents(lower(email));
  CREATE TABLE mail_log (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    to_email TEXT NOT NULL,
    ref TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('sent','skipped','failed')),
    error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX mail_log_ref ON mail_log(ref, kind);
  CREATE TABLE funnel_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('server','client')),
    props TEXT NOT NULL DEFAULT '{}',
    at TEXT NOT NULL
  );
  CREATE INDEX funnel_events_name_at ON funnel_events(name, at);
  ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE rsvp_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE contribution_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE contribution_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payout_methods ENABLE ROW LEVEL SECURITY;
  ALTER TABLE marketing_consents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE mail_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
  `,
];

/** Corre las migraciones pendientes, en orden y una sola vez, con un candado para que dos procesos no las corran a la vez (CA-3). */
export async function migratePg(sql: Sql): Promise<number> {
  return (await sql.begin(async t => {
    await t.unsafe("SELECT pg_advisory_xact_lock(hashtext('weda_migrations'))");
    await t.unsafe('CREATE TABLE IF NOT EXISTS weda_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    await t.unsafe('ALTER TABLE weda_migrations ENABLE ROW LEVEL SECURITY');
    const [row] = await t.unsafe('SELECT coalesce(max(version), 0) AS v FROM weda_migrations');
    let v = Number((row as unknown as { v: number }).v);
    for (; v < PG_MIGRATIONS.length; v++) {
      await t.unsafe(PG_MIGRATIONS[v]!).simple();
      await t.unsafe('INSERT INTO weda_migrations (version, applied_at) VALUES ($1, $2)', [v + 1, new Date().toISOString()]);
    }
    return v;
  })) as number;
}
