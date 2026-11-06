// OPS-08 · Todo Weda en Supabase (specs/OPS-08-base-supabase): criterios que no cubrían las pruebas existentes.
// Corren contra el proyecto de desarrollo de Supabase, como todas las pruebas de servidor.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectPg, migratePg, PG_MIGRATIONS } from '@/server/pg';
import { draftFor, makeEnv, PNG, publishWith, saveDraft, signUp, type Env } from './helpers';

let env: Env;
beforeAll(async () => { env = await makeEnv(); });
afterAll(() => env.close());

const gift = (key: string) => ({ idempotencyKey: key, manageToken: `token-${key}-0000000000`, giverName: 'Tía Nora', giverEmail: 'nora@correo.com', message: '', how: 'alias', giftIds: ['g1'], receipt: { data: Buffer.from(PNG).toString('base64') } });

describe('comprobantes (CA-7)', () => {
  it('solo la pareja dueña abre un comprobante: otra pareja y alguien sin sesión no', async () => {
    const owner = env.client(); await signUp(owner, 'duena-ca7@correo.com');
    const { slug } = await publishWith(owner, draftFor('Ana', 'Leo'));
    const r = await env.client().post(`/api/public/${slug}/contributions`, gift('ca7-0001'));
    expect(r.status).toBe(201);
    const url = `/api/contributions/${r.body.id}/receipt`;
    const mine = await owner.get(url);
    expect(mine.status).toBe(200);
    expect(mine.headers.get('content-type')).toBe('image/png');
    const other = env.client(); await signUp(other, 'otra-ca7@correo.com');
    expect((await other.get(url)).status).toBe(404);
    expect((await env.client().get(url)).status).toBe(401);
  });
});

describe('concurrencia (CA-9)', () => {
  it('dos guardados simultáneos sobre la misma revisión: uno gana y el otro recibe conflicto', async () => {
    const c = env.client(); await signUp(c, 'concurrente@correo.com');
    await saveDraft(c, draftFor('Sol', 'Juan'));
    const w = (await c.get('/api/wedding')).body;
    const put = (first: string) => c.put('/api/wedding', { baseRevision: w.revision, draft: draftFor(first, 'Juan') });
    const [a, b] = await Promise.all([put('Sol'), put('Sofía')]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect((await c.get('/api/wedding')).body.revision).toBe(w.revision + 1);
  });

  it('dos aportes simultáneos con la misma clave de idempotencia crean uno solo', async () => {
    const owner = env.client(); await signUp(owner, 'idem-ca9@correo.com');
    const { slug } = await publishWith(owner, draftFor('Paz', 'Gus'));
    const same = gift('ca9-0001');
    const res = await Promise.all([env.client().post(`/api/public/${slug}/contributions`, same), env.client().post(`/api/public/${slug}/contributions`, same)]);
    expect(res.map(x => x.status).sort()).toEqual([200, 201]);
    expect(res[0]!.body.id).toBe(res[1]!.body.id);
    expect((await owner.get('/api/contributions')).body.contributions).toHaveLength(1);
  });
});

describe('migraciones de Postgres (CA-2, CA-3)', () => {
  it('el esquema tiene las tablas de Weda, con RLS, sin tablas propias de usuarios ni sesiones', async () => {
    const tables = (await env.svc.db.all<{ name: string; rls: boolean }>("SELECT c.relname AS name, c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = current_schema() AND c.relkind = 'r' ORDER BY 1")).map(t => [t.name, t.rls]);
    expect(tables.map(t => t[0])).toEqual(['contribution_events', 'contribution_items', 'contributions', 'funnel_events', 'guests', 'mail_log', 'marketing_consents', 'orders', 'password_resets', 'payment_events', 'payout_methods', 'publications', 'receipts', 'rsvp_events', 'weda_migrations', 'weddings']);
    expect(tables.every(t => t[1] === true)).toBe(true);
  });

  it('corren una sola vez y en orden: volver a correrlas no cambia nada', async () => {
    const sql = connectPg((process.env['SUPABASE_TEST_DB_URL'] || process.env['SUPABASE_DB_URL'])!, (await env.svc.db.get<{ s: string }>('SELECT current_schema() AS s'))!.s);
    try {
      expect(await migratePg(sql)).toBe(PG_MIGRATIONS.length);
      const rows = await env.svc.db.all<{ version: number }>('SELECT version FROM weda_migrations ORDER BY version');
      expect(rows.map(r => r.version)).toEqual(PG_MIGRATIONS.map((_, i) => i + 1));
    } finally { await sql.end(); }
  });

  it('un casamiento se borra con su usuario de Supabase Auth (ON DELETE CASCADE), y owner_id es único (D-03)', async () => {
    const fk = await env.svc.db.get<{ def: string }>("SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'weddings'::regclass AND contype = 'f'");
    expect(fk!.def).toContain('REFERENCES auth.users(id) ON DELETE CASCADE');
    const uniq = await env.svc.db.all<{ def: string }>("SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'weddings'::regclass AND contype = 'u'");
    expect(uniq.map(u => u.def)).toContain('UNIQUE (owner_id)');
  });
});

// Mira las tablas del esquema `public` del proyecto (las que crea el servidor al arrancar), que son las únicas que expone la API de datos de
// Supabase. Necesita SUPABASE_PUBLISHABLE_KEY (la clave anónima/publicable) solo para esta prueba; el servidor no la usa.
describe.skipIf(!process.env['SUPABASE_PUBLISHABLE_KEY'])('clave anónima (CA-8)', () => {
  it('con la clave anónima no se puede leer ni escribir ninguna tabla de Weda', async () => {
    const base = `${process.env['SUPABASE_URL']}/rest/v1`;
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const h = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
    for (const t of ['weddings', 'contributions', 'guests', 'receipts', 'payout_methods']) {
      const read = await fetch(`${base}/${t}?select=*`, { headers: h });
      const rows = read.ok ? ((await read.json()) as unknown[]) : [];
      expect(rows, t).toEqual([]);
      const write = await fetch(`${base}/${t}`, { method: 'POST', headers: h, body: '{}' });
      expect(write.ok, t).toBe(false);
    }
  });
});
