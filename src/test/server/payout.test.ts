// @vitest-environment node
// Destino de cobro protegido (GIFT-14, BR-30): solo con la clave, con versiones, aviso por correo y sin que un guardado del borrador lo cambie.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '@/server/db';
import { draftFor, makeEnv, saveDraft, setPayout, signUp, type Env } from './helpers';

let env: Env;
beforeEach(() => { env = makeEnv(); });
afterEach(() => env.close());

const CBU = '0170099220000067797370';
const payoutOf = async (c: ReturnType<Env['client']>) => (await c.get('/api/wedding')).body.payout;
const versions = (wid: string) => env.svc.db.prepare('SELECT version, alias, source FROM payout_methods WHERE wedding_id = ? ORDER BY version').all(wid) as { version: number; alias: string; source: string }[];

async function couple(email = 'pareja@correo.com') {
  const c = env.client(); await signUp(c, email);
  await saveDraft(c, draftFor('Ana', 'Leo'));
  return c;
}

describe('cambiar el destino de cobro', () => {
  it('sin sesión no se puede', async () => {
    const r = await env.client().post('/api/wedding/payout', { currentPassword: 'x', baseVersion: 0, alias: 'ana.leo.mp' });
    expect(r.status).toBe(401);
  });

  it('un guardado del borrador no carga ni cambia el alias', async () => {
    const c = await couple();
    const w = (await c.get('/api/wedding')).body;
    expect(w.payout.version).toBe(0);
    expect(w.draft.gifts.alias).toBe(''); // draftFor manda un alias: se descartó
    expect((await setPayout(c, { alias: 'Ana.Leo.MP' })).status).toBe(200);
    await saveDraft(c, draftFor('Ana', 'Leo', { gifts: { ...draftFor('a', 'b').gifts, alias: 'otro.alias.mp', cbu: CBU } }));
    const after = (await c.get('/api/wedding')).body;
    expect(after.draft.gifts.alias).toBe('ana.leo.mp'); // normalizado en minúsculas
    expect(after.draft.gifts.cbu).toBe('');
  });

  it('pide la clave y valida los datos sin tocar el destino vigente', async () => {
    const c = await couple();
    expect((await setPayout(c, { alias: 'ana.leo.mp' }, 'Otra-clave-1')).body.error).toBe('wrong_password');
    expect((await setPayout(c, { alias: 'ana.leo.mp' }, '')).body.error).toBe('wrong_password');
    expect((await setPayout(c, { alias: 'no' })).body.error).toBe('invalid_alias');
    expect((await setPayout(c, { alias: 'ana leo mp' })).body.error).toBe('invalid_alias');
    expect((await setPayout(c, { alias: 'ana.leo.mp', cbu: '123' })).body.error).toBe('invalid_cbu');
    expect((await setPayout(c, { alias: 'ana.leo.mp', bank: 'x'.repeat(61) })).body.error).toBe('invalid_bank');
    expect((await payoutOf(c)).version).toBe(0);
  });

  it('cada cambio agrega una versión (la anterior se conserva) y los invitados lo ven recién al publicar', async () => {
    const c = await couple();
    expect((await setPayout(c, { alias: 'ana.leo.mp', bank: 'Banco Uno', cbu: '0170-0992 2000 0067 7973 70' })).status).toBe(200);
    await c.post('/api/wedding/publish');
    const site = async () => (await env.client().get('/api/public/ana-y-leo')).body.site;
    expect((await site()).alias).toBe('ana.leo.mp');
    expect((await site()).cbu).toBe(CBU);

    const r = await setPayout(c, { alias: 'nuevo.alias.mp' });
    expect(r.body.payout).toMatchObject({ version: 2, alias: 'nuevo.alias.mp', bank: '', cbu: '' });
    expect((await site()).alias).toBe('ana.leo.mp'); // la página pública es una copia
    await c.post('/api/wedding/publish');
    expect((await site()).alias).toBe('nuevo.alias.mp');
    const wid = (await c.get('/api/wedding')).body.id as string;
    expect(versions(wid).map(v => [v.version, v.alias, v.source])).toEqual([[1, 'ana.leo.mp', 'owner'], [2, 'nuevo.alias.mp', 'owner']]);
  });

  it('un cambio hecho desde otro dispositivo no se pisa (versión vieja → 409) y repetir lo mismo no cuenta', async () => {
    const c = await couple();
    await setPayout(c, { alias: 'ana.leo.mp' });
    const stale = await c.post('/api/wedding/payout', { currentPassword: 'Clave1234', baseVersion: 0, alias: 'otro.alias.mp' });
    expect([stale.status, stale.body.error]).toEqual([409, 'payout_changed']);
    expect((await setPayout(c, { alias: 'ana.leo.mp' })).body.error).toBe('payout_unchanged');
  });

  it('como mucho 3 cambios por día', async () => {
    const c = await couple();
    for (const a of ['uno.alias.mp', 'dos.alias.mp', 'tres.alias.mp']) expect((await setPayout(c, { alias: a })).status).toBe(200);
    const r = await setPayout(c, { alias: 'cuatro.alias.mp' });
    expect([r.status, r.body.error]).toEqual([429, 'too_many_changes']);
    expect((await payoutOf(c)).alias).toBe('tres.alias.mp');
  });

  it('avisa por correo al dueño con los datos enmascarados', async () => {
    const c = await couple();
    await setPayout(c, { alias: 'ana.leo.mp', cbu: CBU });
    await setPayout(c, { alias: 'nuevo.alias.mp' });
    await new Promise(r => setTimeout(r, 20));
    const sent = env.cfg.mail.testOutbox!.filter(m => m.kind === 'payout_changed');
    expect(sent.map(m => m.to)).toEqual(['pareja@correo.com', 'pareja@correo.com']);
    expect(sent[1]!.subject).toBe('Cambiaron tus datos de cobro en Weda');
    expect(sent[1]!.text).toContain('an•••mp');
    expect(sent[1]!.text).toContain('nu•••mp');
    expect(sent[1]!.text).toContain('••••7370');
    for (const m of sent) { expect(m.text).not.toContain('ana.leo.mp'); expect(m.text).not.toContain(CBU); }
  });

  it('la migración copia el alias que ya estaba en los borradores como versión 1', async () => {
    const c = await couple();
    const db = env.svc.db;
    const wid = (await c.get('/api/wedding')).body.id as string;
    // Simula una base de antes de la migración 7: el alias vive solo en el borrador.
    const draft = JSON.parse((db.prepare('SELECT draft FROM weddings WHERE id = ?').get(wid) as { draft: string }).draft);
    draft.gifts = { ...draft.gifts, alias: 'viejo.alias.mp', bank: 'Banco Viejo', cbu: CBU };
    db.prepare('UPDATE weddings SET draft = ? WHERE id = ?').run(JSON.stringify(draft), wid);
    db.exec('DROP TABLE payout_methods; PRAGMA user_version = 6;');
    migrate(db);
    expect(versions(wid)).toEqual([{ version: 1, alias: 'viejo.alias.mp', source: 'migrated' }]);
    expect(await payoutOf(c)).toMatchObject({ version: 1, alias: 'viejo.alias.mp', bank: 'Banco Viejo', cbu: CBU });
  });
});
