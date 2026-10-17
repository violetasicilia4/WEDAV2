import { describe, expect, it } from 'vitest';
import {
  addCatalogGift, addCustomGift, addGroup, addGuest, addSet, applyRsvp, assignGuest, emptyState, guestStats, isSafeMapsUrl, mapsLink,
  isSamplePhoto, isValidOptionalEmail, moveGift, moveGiftTo, resolvePhoto, parseAmount, receivedGifts, receivedTotal, removeSetGifts, readiness, tasks, removeGift, removeGroup, removeSet, setPlan, slugify, updateGuest, validateAlias, validateGift,
  validateGroupName, validateOnboarding,
} from '@/lib/weda/logic';
import { SETS } from '@/lib/weda/catalog';
import { can, PLANS } from '@/lib/weda/plans';
import { parseStored, sanitize, STORAGE_VERSION } from '@/lib/weda/store';
import { seedState } from '@/lib/weda/seed';
import { siteFromState } from '@/lib/weda/site-model';

const base = () => ({ ...emptyState(), onboarded: true, planId: 'completo' as const, couple: { first: 'Tomás', second: 'Martina' } });

describe('slug y onboarding', () => {
  it('normaliza los nombres en una ruta válida', () => {
    expect(slugify('Tomás', 'Martina')).toBe('tomas-y-martina');
    expect(slugify('  María José ', "D'Angelo")).toBe('maria-jose-y-d-angelo');
  });
  it('permite seguir sin fecha y sin foto', () => {
    expect(validateOnboarding({ first: 'Tomás', second: 'Martina', date: '', noDate: true })).toEqual({});
  });
  it('pide la fecha si no marcaron «sin fecha», y rechaza fechas pasadas o inexistentes', () => {
    expect(validateOnboarding({ first: 'Tomás', second: 'Martina', date: '', noDate: false }).date).toBeTruthy();
    expect(validateOnboarding({ first: 'Tomás', second: 'Martina', date: '2027-02-31', noDate: false }, '2026-10-16').date).toMatch(/no existe/);
    expect(validateOnboarding({ first: 'Tomás', second: 'Martina', date: '2025-01-01', noDate: false }, '2026-10-16').date).toMatch(/ya pasó/);
    expect(validateOnboarding({ first: 'Tomás', second: 'Martina', date: '2027-04-17', noDate: false }, '2026-10-16')).toEqual({});
  });
  it('valida los nombres', () => {
    const e = validateOnboarding({ first: 'T', second: '1234', date: '', noDate: true });
    expect(e.first).toBeTruthy();
    expect(e.second).toBeTruthy();
  });
});

describe('planes', () => {
  it('respeta la matriz de funciones documentada en la landing', () => {
    expect(PLANS.map(p => p.name)).toEqual(['Regalos', 'Completo', 'Premium']);
    expect(can('regalos', 'gifts')).toBe(true);
    expect(can('regalos', 'site')).toBe(false);
    expect(can('regalos', 'rsvp')).toBe(false);
    expect(can('completo', 'site')).toBe(true);
    expect(can('completo', 'playlist')).toBe(false);
    expect(can('premium', 'playlist')).toBe(true);
    expect(can(null, 'gifts')).toBe(false);
  });
  it('el plan Regalos no publica el sitio; el Completo sí, sin música', () => {
    const s = { ...seedState(), planId: 'regalos' as const };
    expect(siteFromState(s).blocks.invitation).toBe(false);
    expect(siteFromState({ ...s, planId: 'completo' }).blocks.invitation).toBe(true);
    expect(siteFromState({ ...s, planId: 'completo' }).blocks.playlist).toBe(false);
    expect(siteFromState({ ...s, planId: 'premium' }).blocks.playlist).toBe(true);
  });
  it('bajar de Premium a Completo oculta la música sin borrarla', () => {
    const p = { ...seedState(), planId: 'premium' as const };
    const n = p.site.playlist.tracks.length;
    const down = setPlan(p, 'completo');
    expect(siteFromState(down).blocks.playlist).toBe(false);
    expect(down.site.playlist.tracks).toHaveLength(n);
    expect(siteFromState(setPlan(down, 'premium')).blocks.playlist).toBe(n > 0);
  });
  it('cambiar de plan conserva los datos', () => {
    const s = setPlan(seedState(), 'regalos');
    expect(s.planId).toBe('regalos');
    expect(s.site.events.length).toBe(3);
    expect(s.guests.length).toBeGreaterThan(0);
  });
});

describe('lista de regalos', () => {
  const set = SETS.find(x => x.id === 'escapada')!;
  it('agrega un set completo sin duplicar', () => {
    const a = addSet(base(), set);
    expect(a.added).toBe(set.giftIds.length);
    const b = addSet(a.state, set);
    expect(b.added).toBe(0);
    expect(b.skipped).toBe(set.giftIds.length);
    expect(b.state.gifts.items.length).toBe(set.giftIds.length);
  });
  it('quita un regalo individual sin eliminar el resto del set', () => {
    const a = addSet(base(), set).state;
    const victim = a.gifts.items[0]!;
    const b = removeGift(a, victim.id);
    expect(b.gifts.items.length).toBe(a.gifts.items.length - 1);
    expect(b.gifts.items.some(g => g.fromSet === set.id)).toBe(true);
    // y se puede volver a agregar de forma individual
    expect(addCatalogGift(b, victim.catalogId!).added).toBe(1);
  });
  it('quita el set completo', () => {
    const a = addSet(base(), set).state;
    expect(removeSet(a, set.id).gifts.items.length).toBe(0);
  });
  it('no agrega dos veces el mismo regalo individual', () => {
    const a = addCatalogGift(base(), 'ollas');
    expect(addCatalogGift(a.state, 'ollas').skipped).toBe(1);
  });
  it('crea un regalo propio y valida el monto', () => {
    expect(validateGift({ name: 'Auriculares para nuestros viajes', amount: '180.000', text: '' })).toEqual({});
    expect(validateGift({ name: '', amount: 'abc', text: '' })).toMatchObject({ name: expect.any(String), amount: expect.any(String) });
    expect(validateGift({ name: 'Algo', amount: '500', text: '' }).amount).toMatch(/mínimo/);
    expect(parseAmount('$ 1.500.000')).toBe(1500000);
    const s = addCustomGift(base(), { name: 'Auriculares', amount: 180000, text: '' });
    expect(s.gifts.items[0]).toMatchObject({ custom: true, amount: 180000 });
  });
  it('reordena', () => {
    let s = addCatalogGift(addCatalogGift(base(), 'ollas').state, 'vajilla').state;
    const [a, b] = s.gifts.items;
    s = moveGift(s, b!.id, -1);
    expect(s.gifts.items.map(g => g.id)).toEqual([b!.id, a!.id]);
    expect(moveGift(s, b!.id, -1)).toBe(s);
  });
});

describe('invitados y RSVP', () => {
  it('carga un invitado manual aunque no haya respondido', () => {
    const s = addGuest(base(), { first: 'Lucía', last: 'Ferreyra', status: 'pending', menu: 'vegano', groupId: null });
    expect(s.guests[0]).toMatchObject({ status: 'pending', source: 'manual', menu: '' });
    expect(guestStats(s)).toMatchObject({ pending: 1, confirmed: 0 });
  });
  it('un RSVP actualiza al invitado existente y no duplica', () => {
    let s = addGuest(base(), { first: 'Lucía', last: 'Ferreyra', status: 'pending', menu: '', groupId: null });
    s = applyRsvp(s, [{ first: 'lucia', last: 'FERREYRA', attending: true, menu: 'vegetariano' }]);
    expect(s.guests.length).toBe(1);
    expect(s.guests[0]).toMatchObject({ status: 'confirmed', menu: 'vegetariano', source: 'rsvp' });
    s = applyRsvp(s, [{ first: 'Lucía', last: 'Ferreyra', attending: true, menu: 'vegetariano' }]);
    expect(s.guests.length).toBe(1);
  });
  it('un RSVP nuevo agrega a la persona; los pendientes no cuentan como confirmados', () => {
    let s = applyRsvp(base(), [{ first: 'Ramiro', last: 'Bianchi', attending: false, menu: 'vegano' }]);
    s = addGuest(s, { first: 'Paula', last: 'Domínguez', status: 'pending', menu: '', groupId: null });
    expect(guestStats(s)).toMatchObject({ total: 2, confirmed: 0, declined: 1, pending: 1, fromSite: 1 });
    expect(s.guests[0]!.menu).toBe('');
  });
  it('cambiar el estado a no asiste borra el menú', () => {
    let s = addGuest(base(), { first: 'Ana', last: 'Paz', status: 'confirmed', menu: 'vegano', groupId: null });
    s = updateGuest(s, s.guests[0]!.id, { status: 'declined' });
    expect(s.guests[0]).toMatchObject({ status: 'declined', menu: '' });
  });
});

describe('grupos y mesas', () => {
  it('crea, asigna y mueve invitados; eliminar un grupo los deja sin grupo', () => {
    let s = addGuest(base(), { first: 'Ana', last: 'Paz', status: 'confirmed', menu: '', groupId: null });
    s = addGroup(addGroup(s, 'Mesa 1'), 'Familia');
    const [g1, g2] = s.groups;
    const id = s.guests[0]!.id;
    s = assignGuest(s, id, g1!.id);
    expect(s.guests[0]!.groupId).toBe(g1!.id);
    s = assignGuest(s, id, g2!.id);
    expect(s.guests[0]!.groupId).toBe(g2!.id);
    expect(assignGuest(s, id, 'no-existe')).toBe(s);
    s = removeGroup(s, g2!.id);
    expect(s.guests.length).toBe(1);
    expect(s.guests[0]!.groupId).toBeNull();
    expect(guestStats(s).withoutGroup).toBe(1);
  });
  it('no permite nombres repetidos', () => {
    const s = addGroup(base(), 'Mesa 1');
    expect(validateGroupName('mesa 1', s.groups)).toMatch(/Ya hay/);
    expect(validateGroupName('Mesa 2', s.groups)).toBeUndefined();
  });
});

describe('mapas y alias', () => {
  it('solo acepta enlaces de Google Maps por https', () => {
    expect(isSafeMapsUrl('https://maps.app.goo.gl/abc123')).toBe(true);
    expect(isSafeMapsUrl('https://www.google.com/maps/place/Pilar')).toBe(true);
    expect(isSafeMapsUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeMapsUrl('http://www.google.com/maps')).toBe(false);
    expect(isSafeMapsUrl('https://example.com/maps')).toBe(false);
  });
  it('genera el enlace desde la dirección si no hay uno propio válido', () => {
    expect(mapsLink({ name: 'Salón', address: 'Camino Real 450, Pilar', mapsUrl: 'javascript:1' })).toContain('google.com/maps/search');
    expect(mapsLink({ name: '', address: '', mapsUrl: '' })).toBe('');
  });
  it('valida el alias', () => {
    expect(validateAlias('tomas.martina')).toBeUndefined();
    expect(validateAlias('a b')).toBeTruthy();
  });
});

describe('avance y datos de ejemplo', () => {
  it('el resumen sugiere el próximo paso y marca el sitio listo cuando está completo', () => {
    const empty = base();
    expect(readiness(empty).next?.id).toBe('regalos');
    expect(readiness(empty).ready).toBe(false);
    expect(readiness(seedState()).ready).toBe(true);
  });
  it('Tomás y Martina es consistente: los estados coinciden entre invitados y grupos', () => {
    const s = seedState();
    const ids = new Set(s.groups.map(g => g.id));
    expect(s.guests.every(g => g.groupId === null || ids.has(g.groupId))).toBe(true);
    expect(guestStats(s).confirmed + guestStats(s).declined + guestStats(s).pending).toBe(s.guests.length);
  });
  it('sin fecha: la página pública no inventa una', () => {
    const d = siteFromState({ ...seedState(), date: null });
    expect(d.eventDate).toBeNull();
    expect(d.dateLabel).toBeNull();
    expect(d.blocks.countdown).toBe(false);
  });
});

describe('persistencia local', () => {
  it('arranca vacío si no hay nada guardado o está corrupto', () => {
    expect(parseStored(null).onboarded).toBe(false);
    expect(parseStored('{no es json').onboarded).toBe(false);
    expect(parseStored('"hola"').onboarded).toBe(false);
  });
  it('descarta datos de una versión anterior', () => {
    expect(sanitize({ version: 0, onboarded: true }).onboarded).toBe(false);
  });
  it('recupera un estado guardado y descarta lo inválido', () => {
    const s = seedState();
    const back = parseStored(JSON.stringify(s));
    expect(back.couple).toEqual(s.couple);
    expect(back.gifts.items.length).toBe(s.gifts.items.length);
    expect(back.guests.length).toBe(s.guests.length);
    const dirty = parseStored(JSON.stringify({ ...s, version: STORAGE_VERSION, planId: 'inventado', guests: [{ nope: true }, ...s.guests] }));
    expect(dirty.planId).toBeNull();
    expect(dirty.guests.length).toBe(s.guests.length);
  });
});

describe('regalos recibidos', () => {
  it('completa nombre y monto desde la lista y ordena del más nuevo al más viejo', () => {
    const s = seedState();
    const g = s.gifts.items[0]!;
    const withMore = { ...s, gifts: { ...s.gifts, given: [...s.gifts.given, { id: g.id, name: 'Ana Paz', message: '', how: 'tarjeta' as const, at: Date.UTC(2026, 9, 14) }] } };
    const r = receivedGifts(withMore);
    expect(r).toHaveLength(2);
    expect(r[0]!.giver).toBe('Ana Paz');
    expect(r[0]!.giftName).toBe(g.name);
    expect(receivedTotal(r)).toBeGreaterThan(0);
  });
  it('sin regalos recibidos devuelve vacío', () => {
    expect(receivedGifts(emptyState())).toEqual([]);
  });
  it('datos viejos sin tarjeta ni fecha se leen sin romper', () => {
    const s = seedState();
    const old = JSON.parse(JSON.stringify({ ...s, version: STORAGE_VERSION })) as Record<string, unknown>;
    delete (old['gifts'] as Record<string, unknown>)['acceptCard'];
    expect(parseStored(JSON.stringify(old)).gifts.acceptCard).toBe(false);
  });
});

describe('quitar todos los regalos de un set', () => {
  it('quita los del set aunque vengan de otro lado y conserva el resto', () => {
    const s = seedState();
    const ids = ['ollas', 'vajilla', 'cafetera'];
    const r = removeSetGifts(s, ids);
    expect(r.gifts.items.some(g => g.catalogId && ids.includes(g.catalogId))).toBe(false);
    expect(r.gifts.items.some(g => g.custom)).toBe(true);
    expect(r.gifts.items.length).toBeLessThan(s.gifts.items.length);
  });
});

describe('regalo propio', () => {
  it('se crea con categoría y sin descripción', () => {
    const r = addCustomGift(emptyState(), { name: 'Auriculares', amount: 50000, category: 'Experiencias' });
    expect(r.gifts.items[0]).toMatchObject({ category: 'Experiencias', text: '', custom: true });
  });
});

describe('pasos del inicio (estado derivado de los datos)', () => {
  const st = (s: ReturnType<typeof seedState>, id: string) => tasks(s).find(t => t.id === id)?.status;
  it('arranca sin empezar y avanza solo con los datos', () => {
    const e = base();
    expect(st(e, 'regalos')).toBe('todo');
    expect(st(e, 'invitados')).toBe('todo');
    const conRegalos = addCustomGift(e, { name: 'Viaje', amount: 50000 });
    expect(st(conRegalos, 'regalos')).toBe('doing');
    const conAlias = { ...conRegalos, gifts: { ...conRegalos.gifts, alias: 'tomas.martina' } };
    expect(st(conAlias, 'regalos')).toBe('done');
  });
  it('mesas: en progreso hasta que todos tienen lugar', () => {
    const s = seedState();
    expect(st(s, 'mesas')).toMatch(/doing|done/);
    expect(st({ ...s, groups: [] }, 'mesas')).toBe('todo');
  });
  it('no muestra pasos de funciones que el plan no incluye', () => {
    const ids = tasks({ ...seedState(), planId: 'regalos' }).map(t => t.id);
    expect(ids).toEqual(['datos', 'regalos']);
  });
});

describe('ordenar regalos arrastrando', () => {
  it('mueve un regalo a otra posición y conserva a todos', () => {
    const s = seedState();
    const ids = s.gifts.items.map(g => g.id);
    const r = moveGiftTo(s, ids[0]!, 2);
    expect(r.gifts.items.map(g => g.id)).toEqual([ids[1], ids[2], ids[0], ...ids.slice(3)]);
    expect(moveGiftTo(s, ids[0]!, 999).gifts.items.at(-1)?.id).toBe(ids[0]);
    expect(moveGiftTo(s, 'no-existe', 1)).toBe(s);
  });
});

describe('eventos con nombre propio', () => {
  it('sin nombre se llaman Evento 1, 2, 3 y con nombre usan el que puso la pareja', () => {
    const s = seedState();
    const site = { ...s.site, events: s.site.events.map((e, i) => ({ ...e, title: i === 1 ? 'After beach' : '' })) };
    const labels = siteFromState({ ...s, site }).events.map(e => e.label);
    expect(labels).toEqual(['Evento 1', 'After beach', 'Evento 3']);
  });
  it('la portada puede quedar sin texto', () => {
    const s = seedState();
    expect(siteFromState({ ...s, site: { ...s.site, coverText: '' } }).coverText).toBe('');
  });
});

describe('portada sin foto propia', () => {
  it('usa una imagen de muestra de Weda y se reemplaza al subir una foto', () => {
    expect(resolvePhoto({ kind: 'none' })).toBe('/fondo-testimonios.jpg');
    expect(isSamplePhoto({ kind: 'none' })).toBe(true);
    expect(isSamplePhoto({ kind: 'weda', id: 'flores' })).toBe(true);
    expect(resolvePhoto({ kind: 'upload', src: 'data:x', name: 'a.jpg' })).toBe('data:x');
    expect(isSamplePhoto({ kind: 'upload', src: 'data:x', name: 'a.jpg' })).toBe(false);
  });
  it('el sitio de la pareja marca la imagen de muestra como decorativa y la propia con su texto', () => {
    const s = seedState();
    expect(siteFromState({ ...s, photo: { kind: 'none' } }).photoAlt).toBe('');
    expect(siteFromState({ ...s, photo: { kind: 'upload', src: 'data:x', name: 'a.jpg' } }).photoAlt).toContain('Tomás');
  });
});

describe('correo opcional al regalar', () => {
  it('vacío o con espacios es válido; si se completa, exige formato', () => {
    expect(isValidOptionalEmail('')).toBe(true);
    expect(isValidOptionalEmail('   ')).toBe(true);
    expect(isValidOptionalEmail('ana@correo.com')).toBe(true);
    expect(isValidOptionalEmail(' ana@correo.com ')).toBe(true);
    expect(isValidOptionalEmail('ana@correo')).toBe(false);
    expect(isValidOptionalEmail('ana correo.com')).toBe(false);
  });
});
