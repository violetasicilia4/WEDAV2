// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, saveDraft, signUp, type Env } from './helpers';
import { addTerm } from '@/lib/weda/payments';

/* Vencimiento de la publicación aplicado por el servidor (6 meses desde la primera publicación, UTC). */
let env: Env;
beforeAll(() => { env = makeEnv(); });
afterAll(() => env.close());
const setExpiry = (slug: string, iso: string | null) => env.svc.db.prepare('UPDATE publications SET expires_at = ? WHERE wedding_id = (SELECT id FROM weddings WHERE slug = ?)').run(iso, slug);
const pubRow = (slug: string) => env.svc.db.prepare('SELECT published_at, expires_at FROM publications WHERE wedding_id = (SELECT id FROM weddings WHERE slug = ?)').get(slug) as { published_at: string; expires_at: string | null };

describe('vencimiento de la publicación', () => {
  let slug = '';
  let owner: ReturnType<Env['client']>;
  beforeAll(async () => {
    owner = env.client(); await signUp(owner, 'vence-pub@correo.com');
    await saveDraft(owner, draftFor('Lara', 'Mateo'));
    slug = (await owner.post('/api/wedding/publish')).body.slug;
  });

  it('al publicar se guarda el vencimiento: 6 meses desde la primera publicación', () => {
    const r = pubRow(slug);
    expect(r.expires_at).toBe(addTerm(r.published_at));
  });

  it('publicar cambios no extiende el vencimiento', async () => {
    const before = pubRow(slug).expires_at;
    expect((await owner.post('/api/wedding/publish')).status).toBe(200);
    expect(pubRow(slug).expires_at).toBe(before);
  });

  it('antes de vencer se ve; un instante después, la página, la confirmación y los regalos responden «vencida»', async () => {
    const g = env.client();
    setExpiry(slug, new Date(Date.now() + 60_000).toISOString());
    expect((await g.get(`/api/public/${slug}`)).status).toBe(200);
    setExpiry(slug, new Date(Date.now() - 1).toISOString());
    const r = await g.get(`/api/public/${slug}`);
    expect([r.status, r.body.error]).toEqual([410, 'site_expired']);
    expect((await g.post(`/api/public/${slug}/rsvp`, { people: [{ first: 'Ana', last: 'Paz', attending: true, menu: '' }] })).body.error).toBe('site_expired');
    expect((await g.post(`/api/public/${slug}/contributions`, {})).body.error).toBe('site_expired');
  });

  it('vencida no se reabre sola al publicar y no se borra nada', async () => {
    const r = await owner.post('/api/wedding/publish');
    expect([r.status, r.body.error]).toEqual([409, 'publication_expired']);
    expect((await owner.get('/api/wedding')).body.draft.couple.first).toBe('Lara');
  });

  it('una publicación anterior a guardar el vencimiento lo calcula desde su primera publicación', async () => {
    setExpiry(slug, null);
    env.svc.db.prepare('UPDATE publications SET published_at = ? WHERE wedding_id = (SELECT id FROM weddings WHERE slug = ?)').run(new Date().toISOString(), slug);
    expect((await env.client().get(`/api/public/${slug}`)).status).toBe(200);
    env.svc.db.prepare('UPDATE publications SET published_at = ? WHERE wedding_id = (SELECT id FROM weddings WHERE slug = ?)').run('2020-01-01T00:00:00.000Z', slug);
    expect((await env.client().get(`/api/public/${slug}`)).body.error).toBe('site_expired');
  });
});
