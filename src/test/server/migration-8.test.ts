// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { migrate, openDb } from '@/server/db';
import { PG } from './helpers';

/* Migración 8 (PAY-07, CA-20): agrega `weddings.trial_started_at` sin perder filas. Las celebraciones creadas antes toman su fecha de creación
   (decisión de la dueña, D-06); las que no terminaron el onboarding quedan sin trial. Las publicaciones y órdenes no se tocan. */
const dir = mkdtempSync(path.join(tmpdir(), 'weda-mig8-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Migración propia de SQLite: en Supabase el esquema nace completo (pg.ts).
describe.skipIf(PG)('migración 8: inicio del trial', () => {
  it('desde una base en la versión 7 conserva todo y fija el inicio del trial de las celebraciones existentes', async () => {
    const db = openDb(path.join(dir, 'v7.db'));
    const raw = db.raw; // prueba propia de SQLite: arma una base de la versión 7 con consultas directas
    // Vuelve la base a la versión 7: sin la columna nueva.
    raw.exec('ALTER TABLE weddings DROP COLUMN trial_started_at; PRAGMA user_version = 7;');
    const draft = (onboarded: boolean, first: string, second: string) => JSON.stringify({ version: 2, onboarded, couple: { first, second } });
    const user = raw.prepare('INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)');
    const wed = raw.prepare('INSERT INTO weddings (id,owner_id,draft,revision,created_at,updated_at,slug) VALUES (?,?,?,?,?,?,?)');
    for (const [i, d, created, slug] of [
      ['a', draft(true, 'Ana', 'Luis'), '2026-10-01T10:00:00.000Z', 'ana-y-luis'],
      ['b', draft(true, 'Bea', ''), '2026-10-02T10:00:00.000Z', null],
      ['c', draft(false, '', ''), '2026-10-03T10:00:00.000Z', null],
    ] as const) {
      user.run(`u-${i}`, `${i}@correo.com`, 'hash', created);
      wed.run(`w-${i}`, `u-${i}`, d, 1, created, created, slug);
    }
    raw.prepare("INSERT INTO publications (wedding_id,status,plan_id,snapshot,version,published_at,updated_at,expires_at) VALUES ('w-a','live','completo','{}',3,?,?,?)").run('2026-10-05T10:00:00.000Z', '2026-10-05T10:00:00.000Z', '2027-10-05T10:00:00.000Z');
    raw.prepare("INSERT INTO orders (id,wedding_id,plan_id,amount,status,created_at,updated_at,paid_at) VALUES ('o-a','w-a','completo',150000,'paid',?,?,?)").run('2026-10-05T10:00:00.000Z', '2026-10-05T10:00:00.000Z', '2026-10-05T10:00:00.000Z');

    await migrate(db);

    expect((raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(9);
    expect(raw.prepare('SELECT id, trial_started_at FROM weddings ORDER BY id').all()).toEqual([
      { id: 'w-a', trial_started_at: '2026-10-01T10:00:00.000Z' },
      { id: 'w-b', trial_started_at: null },          // le falta un nombre: la celebración no estaba creada
      { id: 'w-c', trial_started_at: null },          // sin onboarding
    ]);
    expect((raw.prepare('SELECT count(*) AS n FROM users').get() as { n: number }).n).toBe(3);
    expect(raw.prepare('SELECT wedding_id, plan_id, version, expires_at FROM publications').all()).toEqual([{ wedding_id: 'w-a', plan_id: 'completo', version: 3, expires_at: '2027-10-05T10:00:00.000Z' }]);
    expect(raw.prepare('SELECT id, plan_id, amount, status FROM orders').all()).toEqual([{ id: 'o-a', plan_id: 'completo', amount: 150000, status: 'paid' }]);
    // Reabrir no vuelve a migrar ni pisa nada.
    await migrate(db);
    expect((raw.prepare("SELECT trial_started_at FROM weddings WHERE id = 'w-a'").get() as { trial_started_at: string }).trial_started_at).toBe('2026-10-01T10:00:00.000Z');
    raw.close();
  });
});
