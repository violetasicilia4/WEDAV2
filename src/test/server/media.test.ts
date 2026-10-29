// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, PNG, saveDraft, signUp, type Env } from './helpers';

/* Fotos fuera de la base: al guardar, las fotos embebidas pasan a archivos y el borrador guarda solo su dirección. */
let env: Env;
beforeAll(() => { env = makeEnv(); });
afterAll(() => env.close());
const png = `data:image/png;base64,${Buffer.from(PNG).toString('base64')}`;

describe('fotos persistentes', () => {
  it('la foto de portada y las de la galería se guardan como archivos; el borrador y lo publicado guardan la dirección', async () => {
    const o = env.client(); await signUp(o, 'fotos@correo.com');
    const d = draftFor('Nina', 'Omar', { photo: { kind: 'upload', src: png, name: 'portada.png' } });
    d.site.gallery = { ...d.site.gallery, enabled: true, photos: [{ id: 'f1', src: png, alt: '' }, { id: 'f2', src: png, alt: '' }] };
    await saveDraft(o, d);
    const w = (await o.get('/api/wedding')).body;
    expect(w.draft.photo.src).toMatch(/^\/api\/media\/[0-9a-f]{64}\.png$/);
    expect(w.draft.site.gallery.photos.map((p: any) => p.src)).toEqual([w.draft.photo.src, w.draft.photo.src]); // misma foto: un solo archivo
    expect(JSON.stringify(w.draft)).not.toContain('data:image');
    expect(readdirSync(path.join(env.dir, 'media'))).toHaveLength(1);
    // Se ve desde cualquier lugar (otro dispositivo, invitados), con el tipo real y caché larga.
    const name = w.draft.photo.src.split('/').pop();
    const f = await env.client().get(`/api/media/${name}`);
    expect([f.status, f.headers.get('content-type'), f.headers.get('cache-control')]).toEqual([200, 'image/png', 'public, max-age=31536000, immutable']);
    const slug = (await o.post('/api/wedding/publish')).body.slug;
    expect(JSON.stringify((await env.client().get(`/api/public/${slug}`)).body)).not.toContain('data:image');
  });

  it('rechaza lo que no es una imagen real y nombres inventados', async () => {
    const o = env.client(); await signUp(o, 'fotos-mal@correo.com');
    const fake = `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
    const w = await o.get('/api/wedding');
    const r = await o.put('/api/wedding', { baseRevision: w.body.revision, draft: draftFor('Pia', 'Quique', { photo: { kind: 'upload', src: fake, name: 'x.png' } }) });
    expect([r.status, r.body.error]).toEqual([415, 'unsupported_image']);
    expect((await env.client().get('/api/media/..%2F..%2Fweda.db')).status).toBe(404);
    expect((await env.client().get(`/api/media/${'0'.repeat(64)}.png`)).status).toBe(404);
  });
});
