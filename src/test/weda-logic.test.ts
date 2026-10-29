import { describe, expect, it } from 'vitest';
import {
  addCatalogGift, addCustomGift, addGroup, addGuest, addSet, applyRsvp, assignGuest, emptyState, guestStats, isSafeMapsUrl, mapsLink,
  updateGroup, validateCapacity, cleanCbu, validateCbu, isSamplePhoto, isValidOptionalEmail, moveGift, moveGiftTo, resolvePhoto, parseAmount, receivedGifts, receivedTotal, removeSetGifts, readiness, tasks, removeGift, removeGroup, removeSet, setPlan, slugify, updateGuest, validateAlias, validateGift,
  validateGroupName, validateOnboarding, draftsFor, spotifyEmbed, contributionsFromState, contributionsFromServer, invitationPath,
} from '@/lib/weda/logic';
import { SETS } from '@/lib/weda/catalog';
import { can, formatPrice, PLANS, type Feature } from '@/lib/weda/plans';
import { parseStored, sanitize, STORAGE_VERSION } from '@/lib/weda/store';
import { accountDestination, hasEvent } from '@/lib/weda/account';
import { seedState } from '@/lib/weda/seed';
import { siteFromState } from '@/lib/weda/site-model';

const base = () => ({ ...emptyState(), onboarded: true, planId: 'invitacion' as const, couple: { first: 'Tomás', second: 'Martina' } });

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
  it('define los tres planes acumulativos con sus precios en un solo lugar', () => {
    expect(PLANS.map(p => p.name)).toEqual(['Regalos', 'Celebración', 'Celebración Plus']);
    expect(PLANS.map(p => p.price)).toEqual([95000, 140000, 150000]);
    expect(formatPrice(95000)).toBe('ARS 95.000');
    // cada plan incluye todas las funciones del anterior y suma al menos una
    PLANS.slice(1).forEach((p, i) => {
      const prev = PLANS[i]!;
      expect(p.inherits).toBe(prev.id);
      prev.features.forEach(f => expect(p.features).toContain(f));
      expect(p.features.length).toBeGreaterThan(prev.features.length);
    });
  });
  it('respeta la matriz de funciones por plan', () => {
    expect(can('regalos', 'gifts')).toBe(true);
    expect(can('regalos', 'site')).toBe(false);
    expect(can('regalos', 'rsvp')).toBe(false);
    expect(can('invitacion', 'site')).toBe(true);
    expect(can('invitacion', 'rsvp')).toBe(true);
    expect(can('invitacion', 'playlist')).toBe(false);
    expect(can('invitacion', 'gallery')).toBe(false);
    expect(can('invitacion', 'message')).toBe(false);
    ['playlist', 'gallery', 'message'].forEach(f => expect(can('completo', f as Feature)).toBe(true));
  });
  it('sin plan elegido (prueba gratuita) todo está disponible', () => {
    PLANS.flatMap(p => p.features).forEach(f => expect(can(null, f)).toBe(true));
  });
  it('el plan Regalos no publica el sitio; Celebración sí, sin música, galería ni mensaje final', () => {
    const s = { ...seedState(), planId: 'regalos' as const };
    expect(siteFromState(s).blocks.invitation).toBe(false);
    const inv = siteFromState({ ...s, planId: 'invitacion' }).blocks;
    expect(inv.invitation).toBe(true);
    expect([inv.playlist, inv.photos, inv.message]).toEqual([false, false, false]);
    const full = siteFromState({ ...s, planId: 'completo' }).blocks;
    expect(full.playlist).toBe(true);
    expect(full.photos).toBe(seedState().site.gallery.photos.length > 0);
    expect(full.message).toBe(true);
  });
  it('bajar de Celebración Plus a Celebración oculta lo extra sin borrarlo y lo informa como borrador', () => {
    const p = { ...seedState(), planId: 'completo' as const };
    const n = p.site.playlist.tracks.length;
    const down = setPlan(p, 'invitacion');
    expect(siteFromState(down).blocks.playlist).toBe(false);
    expect(down.site.playlist.tracks).toHaveLength(n);
    expect(draftsFor(down, 'invitacion').map(d => d.feature)).toContain('playlist');
    expect(draftsFor(down, 'completo')).toEqual([]);
    expect(siteFromState(setPlan(down, 'completo')).blocks.playlist).toBe(n > 0);
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
    expect(validateCbu('0000003100012345678901')).toBeUndefined();
    expect(validateCbu('0000 0031-0001 2345 6789 01')).toBeUndefined();
    expect(validateCbu('123')).toBeTruthy();
    expect(cleanCbu('0000 0031-00')).toBe('000000310' + '0');
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
  it('migra los planes de la versión 1 (completo→invitacion, premium→completo) sin perder el evento', () => {
    const s = JSON.parse(JSON.stringify(seedState())) as Record<string, unknown>;
    const v1 = (planId: string) => parseStored(JSON.stringify({ ...s, version: 1, planId, preferredPlan: planId }));
    expect(v1('completo').planId).toBe('invitacion');
    expect(v1('premium').planId).toBe('completo');
    expect(v1('premium').preferredPlan).toBe('completo');
    expect(v1('regalos').planId).toBe('regalos');
    expect(v1('premium').couple).toEqual(seedState().couple);
    expect(v1('premium').version).toBe(STORAGE_VERSION);
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
  it('aparece apenas tiene nombre, con «Lugar a confirmar» hasta cargar la ubicación', () => {
    const s = seedState();
    const site = { ...s.site, events: s.site.events.map((e, i) => (i === 0 ? { ...e, enabled: true, title: 'Ceremonia', name: '', address: '', mapsUrl: '' } : { ...e, enabled: false })) };
    const evs = siteFromState({ ...s, site }).events;
    expect(evs.map(e => [e.label, e.name, e.maps])).toEqual([['Ceremonia', 'Lugar a confirmar', '']]);
  });
  it('con un solo evento completo alcanza: los eventos vacíos no quedan pendientes', () => {
    const s = seedState();
    const site = { ...s.site, events: s.site.events.map((e, i) => (i === 0 ? { ...e, enabled: true, title: 'Ceremonia', name: 'Parroquia', address: 'Calle 1' } : { ...e, enabled: true, title: '', name: '', address: '' })) };
    expect(sectionGaps({ ...s, site }).filter(g => !['dress', 'texto', 'fotos', 'musica'].includes(g.id))).toEqual([]);
    const half = { ...site, events: site.events.map((e, i) => (i === 1 ? { ...e, title: 'Fiesta' } : e)) };
    expect(sectionGaps({ ...s, site: half }).map(g => g.label)).toContain('Fiesta');
  });
  it('un evento con «Mostrar» aparece aunque esté vacío', () => {
    const s = seedState();
    const site = { ...s.site, events: s.site.events.map((e, i) => (i === 2 ? { ...e, enabled: true, title: '', name: '', address: '', mapsUrl: '' } : e)) };
    const last = siteFromState({ ...s, site }).events.at(-1)!;
    expect([last.label, last.name, last.maps]).toEqual(['Evento 3', 'Lugar a confirmar', '']);
  });
  it('«Save the date» es opcional y viene prendido', () => {
    const s = seedState();
    expect(siteFromState(s).blocks.save).toBe(true);
    expect(siteFromState({ ...s, site: { ...s.site, saveDate: false } }).blocks.save).toBe(false);
  });
  it('la playlist acepta solo links de Spotify y arma el reproductor', () => {
    expect(spotifyEmbed('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc')).toBe('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
    expect(spotifyEmbed('https://open.spotify.com/intl-es/album/1A2GTWGtFfWp7KSQTwWOyo')).toBe('https://open.spotify.com/embed/album/1A2GTWGtFfWp7KSQTwWOyo');
    expect(spotifyEmbed('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
    expect(spotifyEmbed('https://evil.com/open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBeNull();
    expect(spotifyEmbed('')).toBeNull();
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

import { eventComplete, headline, nextAction, progress, sectionGaps, stages } from '@/lib/weda/journey';

describe('recorrido guiado (journey)', () => {
  it('una pareja nueva tiene 4 etapas sin empezar, 0% y el primer paso es elegir regalos', () => {
    const e = emptyState();
    const list = stages(e);
    expect(list.map(x => x.id)).toEqual(['regalos', 'sitio', 'invitados', 'publicar']);
    expect(list.every(x => x.status === 'todo')).toBe(true);
    expect(progress(list)).toBe(0);
    expect(nextAction(e).label).toBe('Elegí los primeros regalos');
  });
  it('el cobro pendiente no bloquea: con regalos y sin alias la etapa queda para revisar y se recomienda configurarlo', () => {
    const s = seedState();
    const st = { ...s, gifts: { ...s.gifts, alias: '' } };
    expect(stages(st)[0]!.status).toBe('review');
    expect(nextAction(st).label).toBe('Configurá cómo vas a recibir los aportes');
  });
  it('prender una sección sin datos mínimos no la deja lista', () => {
    const s = seedState();
    const st = { ...s, site: { ...s.site, dressCode: { ...s.site.dressCode, enabled: true, title: '', text: '' } } };
    expect(stages(st)[1]!.status).toBe('review');
    expect(stages(st)[1]!.detail).toContain('Dress code');
  });
  it('los invitados son gestión: sin invitados igual se recomienda revisar y publicar, y no frenan el progreso', () => {
    const s = seedState();
    const sinInvitados = { ...s, guests: [] };
    expect(nextAction(sinInvitados).stage).toBe('publicar');
    expect(nextAction(s).stage).toBe('publicar');
    expect(progress(stages(sinInvitados))).toBe(100);
    expect(stages(sinInvitados).find(x => x.id === 'publicar')!.status).toBe('review');
    expect(progress(stages(s))).toBe(100);
    expect(headline(100)).toContain('preparado');
  });
  it('con plan Regalos la invitación queda bloqueada y no cuenta para el progreso', () => {
    const s = { ...seedState(), planId: 'regalos' as const };
    expect(stages(s)[1]!.locked).toBe(true);
    expect(nextAction(s).stage).not.toBe('sitio');
  });
});

describe('reglas de secciones (sectionGaps)', () => {
  it('un mensaje final vacío no es un pendiente (usa el cierre por defecto)', () => {
    const s = seedState();
    expect(sectionGaps({ ...s, site: { ...s.site, message: { ...s.site.message, enabled: true, text: '' } } }).some(g => g.id === 'mensaje')).toBe(false);
  });
  it('dress code, fotos y música prendidos sin datos son pendientes; un momento necesita nombre propio y lugar o dirección', () => {
    const s = seedState();
    const site = { ...s.site, dressCode: { ...s.site.dressCode, enabled: true, title: '', text: '' }, gallery: { ...s.site.gallery, enabled: true, photos: [] }, playlist: { ...s.site.playlist, enabled: true, tracks: [] } };
    expect(sectionGaps({ ...s, site }).map(g => g.id)).toEqual(expect.arrayContaining(['dress', 'fotos', 'musica']));
    const ev = s.site.events[0]!;
    expect(eventComplete({ ...ev, enabled: true, title: 'Ceremonia', name: 'Parroquia', address: '' })).toBe(true);
    expect(eventComplete({ ...ev, enabled: true, title: '', name: 'Parroquia', address: 'Calle 1' })).toBe(false);
  });
});

import { publishSummary } from '@/lib/weda/publish';

describe('resumen de publicación', () => {
  it('con Celebración Plus se publica todo lo que tiene contenido', () => {
    const r = publishSummary(seedState(), 'completo');
    expect(r.drafts).toEqual([]);
    expect(r.published.map(i => i.feature)).toEqual(expect.arrayContaining(['gifts', 'site', 'rsvp']));
  });
  it('con Regalos el sitio y lo premium quedan como borrador, con el plan que los habilita, sin tocar el estado', () => {
    const s = seedState();
    const before = JSON.stringify(s);
    const r = publishSummary(s, 'regalos');
    expect(r.published.map(i => i.feature)).toEqual(['gifts']);
    expect(r.drafts.find(i => i.feature === 'site')?.plan).toBe('Celebración');
    expect(JSON.stringify(s)).toBe(before);
  });
  it('avisa si falta el cobro, sin bloquear', () => {
    const s = seedState();
    expect(publishSummary({ ...s, gifts: { ...s.gifts, alias: '' } }, 'invitacion').warnings.join(' ')).toContain('cómo vas a recibir');
  });
  it('lista pendientes con acceso directo y solo de lo que el plan incluye', () => {
    const s = seedState();
    const t = publishSummary({ ...s, date: '', gifts: { ...s.gifts, alias: '' } }, 'invitacion').todo;
    expect(t.map(x => x.to)).toEqual(expect.arrayContaining(['/panel/regalos', '/panel']));
    expect(t.find(x => x.search)?.search).toEqual({ tab: 'cobro' });
    // El plan Regalos no incluye el sitio: no se le pide la fecha.
    expect(publishSummary({ ...s, date: '' }, 'regalos').todo.some(x => x.to === '/panel')).toBe(false);
  });
});

describe('mesas con lugares', () => {
  it('guarda lugares y descripción opcionales, y los quita al vaciarlos', () => {
    const s = addGroup(seedState(), 'Mesa 9', { capacity: 6, note: ' Primos ' });
    const g = s.groups.at(-1)!;
    expect(g).toMatchObject({ name: 'Mesa 9', capacity: 6, note: 'Primos' });
    const v = updateGroup(s, g.id, 'Mesa 9', { capacity: undefined, note: '' }).groups.at(-1)!;
    expect('capacity' in v).toBe(false);
    expect('note' in v).toBe(false);
  });
  it('valida los lugares', () => {
    expect(validateCapacity('')).toBeUndefined();
    expect(validateCapacity('10')).toBeUndefined();
    expect(validateCapacity('0')).toBeTruthy();
    expect(validateCapacity('abc')).toBeTruthy();
  });
});

import { publishedPagesText } from '@/lib/weda/publish';

describe('qué se publica con cada plan (publishedPagesText)', () => {
  it('Regalos: solo la lista; Celebración: invitación + lista; Celebración Plus: el sitio completo', () => {
    expect(publishedPagesText('regalos')).toBe('solo la lista de regalos.');
    expect(publishedPagesText('invitacion')).toContain('la invitación');
    expect(publishedPagesText('invitacion')).not.toContain('música');
    expect(publishedPagesText('completo')).toContain('sitio completo');
    expect(publishedPagesText('completo')).toContain('música');
  });
});

describe('cuenta simulada: evento guardado y destino', () => {
  const vacio = () => emptyState();
  it('sin nombres ni onboarding terminado no hay evento guardado', () => {
    expect(hasEvent(vacio())).toBe(false);
    expect(hasEvent({ ...vacio(), couple: { first: '  ', second: '' } })).toBe(false);
  });
  it('hay evento guardado con el onboarding terminado o con al menos un nombre cargado', () => {
    expect(hasEvent({ ...vacio(), onboarded: true })).toBe(true);
    expect(hasEvent({ ...vacio(), couple: { first: 'Lucía', second: '' } })).toBe(true);
    expect(hasEvent({ ...vacio(), couple: { first: '', second: 'Violeta' } })).toBe(true);
  });
  it('con el onboarding terminado se sigue al panel; si no, al onboarding (que conserva lo cargado)', () => {
    expect(accountDestination({ ...vacio(), onboarded: true })).toBe('/panel');
    expect(accountDestination({ ...vacio(), couple: { first: 'Lucía', second: 'Violeta' } })).toBe('/crear');
    expect(accountDestination(vacio())).toBe('/crear');
  });
});

describe('aportes recibidos', () => {
  it('agrupa los regalos de un mismo envío: una persona, varios regalos, un total y su correo', () => {
    const s = emptyState();
    s.gifts.given = [
      { id: 'a', name: 'Ana Paz', message: '¡Felicidades!', giftName: 'Cena', amount: 100, at: 2, email: 'ana@correo.com', ref: 'env-1' },
      { id: 'b', name: 'Ana Paz', message: '¡Felicidades!', giftName: 'Spa', amount: 50, at: 2, email: 'ana@correo.com', ref: 'env-1' },
      { id: 'c', name: 'Leo', message: '', giftName: 'Vino', amount: 30, at: 1 },
    ];
    const list = contributionsFromState(s);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ giver: 'Ana Paz', email: 'ana@correo.com', total: 150, gifts: [{ name: 'Cena', amount: 100 }, { name: 'Spa', amount: 50 }], receipt: null });
    expect(list[1]).toMatchObject({ giver: 'Leo', email: '', total: 30 });
  });
  it('del servidor: comprobante para ver o «falta», y los rechazados no cuentan', () => {
    const list = contributionsFromServer([
      { id: 'apo_1', giverName: 'Ana', giverEmail: 'ana@correo.com', message: 'Hola', how: 'alias', status: 'pending_review', total: 150, createdAt: '2026-10-28T12:00:00.000Z', hasReceipt: true, items: [{ giftName: 'Cena', amount: 100 }, { giftName: 'Spa', amount: 50 }] },
      { id: 'apo_2', giverName: 'Leo', giverEmail: 'leo@correo.com', message: '', how: 'alias', status: 'confirmed', total: 30, createdAt: '2026-10-27T12:00:00.000Z', hasReceipt: false, items: [{ giftName: 'Vino', amount: 30 }] },
      { id: 'apo_3', giverName: 'X', status: 'rejected', total: 10, items: [] },
    ]);
    expect(list.map(c => [c.giver, c.receipt, c.status])).toEqual([['Ana', '/api/contributions/apo_1/receipt', 'pending_review'], ['Leo', 'missing', 'confirmed']]);
    expect(list[0]!.gifts).toHaveLength(2);
  });
});

describe('encontrar: el link de la invitación', () => {
  it('acepta el link completo, sin https o solo la ruta; rechaza cualquier otra cosa', () => {
    expect(invitationPath('https://weda.app/sitio/ana-y-leo')).toBe('/sitio/ana-y-leo');
    expect(invitationPath('weda.app/sitio/Ana-y-Leo/regalos?x=1')).toBe('/sitio/ana-y-leo/regalos');
    expect(invitationPath('/sitio/ana-y-leo')).toBe('/sitio/ana-y-leo');
    expect(invitationPath('Ana y Leo')).toBeNull();
    expect(invitationPath('https://weda.app/panel')).toBeNull();
    expect(invitationPath('')).toBeNull();
  });
});
