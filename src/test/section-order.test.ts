import { describe, expect, it } from 'vitest';
import { cleanBgs, DEFAULT_ORDER, defaultColors, emptyState, isDarkBg, moveBlock, normalizeOrder, shortAddress } from '@/lib/weda/logic';
import { sanitize } from '@/lib/weda/store';
import { siteFromState } from '@/lib/weda/site-model';
import { sectionGaps } from '@/lib/weda/journey';
import type { BlockId } from '@/lib/weda/types';

describe('orden de las secciones', () => {
  it('el orden de fábrica incluye los regalos tras los eventos y el texto libre tras el dress code', () => {
    expect(DEFAULT_ORDER).toEqual(['eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica']);
    expect(emptyState().site.order).toEqual(DEFAULT_ORDER);
  });

  it('normaliza cualquier valor: sin repetidos ni desconocidos, y las secciones nuevas se ubican donde les corresponde', () => {
    expect(normalizeOrder(undefined)).toEqual(DEFAULT_ORDER);
    expect(normalizeOrder('x')).toEqual(DEFAULT_ORDER);
    expect(normalizeOrder(['musica', 'musica', 'inventada', 'rsvp'])).toEqual(['eventos', 'regalos', 'musica', 'rsvp', 'dress', 'texto', 'fotos']);
    // Un orden guardado antes de existir «regalos» y «texto»: la sección nueva entra justo después de la que la antecede en el orden de fábrica.
    expect(normalizeOrder(['eventos', 'rsvp', 'dress', 'fotos', 'musica'])).toEqual(DEFAULT_ORDER);
    expect(normalizeOrder(['musica', 'fotos', 'dress', 'rsvp', 'eventos'])).toEqual(['musica', 'fotos', 'dress', 'texto', 'rsvp', 'eventos', 'regalos']);
  });

  it('mover cambia solo con las secciones visibles: una oculta no «consume» el movimiento', () => {
    const visible = (b: BlockId) => b === 'eventos' || b === 'rsvp' || b === 'fotos';
    expect(moveBlock(DEFAULT_ORDER, 'fotos', -1, visible)).toEqual(['eventos', 'regalos', 'fotos', 'dress', 'texto', 'rsvp', 'musica']);
  });

  it('los extremos no se mueven y devolver el mismo orden no cambia nada', () => {
    const all = () => true;
    expect(moveBlock(DEFAULT_ORDER, 'eventos', -1, all)).toBe(DEFAULT_ORDER);
    expect(moveBlock(DEFAULT_ORDER, 'musica', 1, all)).toBe(DEFAULT_ORDER);
    expect(moveBlock(DEFAULT_ORDER, 'regalos', 1, all)).toEqual(['eventos', 'rsvp', 'regalos', 'dress', 'texto', 'fotos', 'musica']);
  });

  it('el orden se guarda y se lee: datos viejos sin orden usan el de fábrica; uno inválido se corrige', () => {
    const base = JSON.parse(JSON.stringify(emptyState()));
    delete base.site.order;
    expect(sanitize(base).site.order).toEqual(DEFAULT_ORDER);
    base.site.order = ['musica', 'fotos', 'zzz', 'musica'];
    expect(sanitize(base).site.order).toEqual(['eventos', 'regalos', 'rsvp', 'dress', 'texto', 'musica', 'fotos']);
  });

  it('la página pública recibe el orden de la pareja', () => {
    const s = emptyState();
    s.site.order = ['musica', 'fotos', 'texto', 'dress', 'rsvp', 'regalos', 'eventos'];
    expect(siteFromState(s).order).toEqual(['musica', 'fotos', 'texto', 'dress', 'rsvp', 'regalos', 'eventos']);
  });
});

describe('dirección en la tarjeta', () => {
  it('muestra solo calle y altura: sin ciudad, código postal, país ni coordenadas', () => {
    expect(shortAddress('Av. del Libertador 1234, C1425 CABA, Argentina')).toBe('Av. del Libertador 1234');
    expect(shortAddress('Libertad 1234, Buenos Aires')).toBe('Libertad 1234');
    expect(shortAddress('Libertador 1234 C1425ABC Ciudad Autónoma de Buenos Aires')).toBe('Libertador 1234');
    expect(shortAddress('Ruta 8 km 52')).toBe('Ruta 8 km 52');
    expect(shortAddress('  ')).toBe('');
    expect(shortAddress('-34.603722, -58.381592')).toBe('');
  });

  it('la tarjeta usa la dirección corta y «Cómo llegar» conserva la completa', () => {
    const s = emptyState();
    s.date = '2027-03-20';
    s.site.events[0] = { ...s.site.events[0]!, enabled: true, title: 'Ceremonia', name: 'Parroquia San Isidro', address: 'Av. del Libertador 1234, C1425 CABA, Argentina', time: '18:00' };
    const ev = siteFromState(s).events[0]!;
    expect(ev.address).toBe('Av. del Libertador 1234');
    expect(decodeURIComponent(ev.maps)).toContain('C1425 CABA, Argentina');
  });
});

describe('dress code: círculos de colores', () => {
  it('por defecto se muestran los cuatro de siempre', () => {
    const s = emptyState();
    expect(s.site.dressCode.showColors).toBe(true);
    expect(siteFromState(s).dressCode.palette).toEqual(defaultColors());
  });

  it('se pueden apagar y elegir el color y el nombre de cada uno', () => {
    const s = emptyState();
    s.site.dressCode.colors = [{ name: 'Rosa', color: '#ffc0cb' }, { name: '', color: '#000000' }];
    expect(siteFromState(s).dressCode.palette).toEqual([{ name: 'Rosa', color: '#ffc0cb' }, { name: '', color: '#000000' }]);
    s.site.dressCode.showColors = false;
    expect(siteFromState(s).dressCode.palette).toEqual([]);
  });

  it('al leer datos guardados, un color inválido se descarta y sin colores válidos vuelven los de fábrica', () => {
    const base = JSON.parse(JSON.stringify(emptyState()));
    base.site.dressCode.colors = [{ name: 'x', color: 'rojo' }, { name: 'ok', color: '#AABBCC' }];
    expect(sanitize(base).site.dressCode.colors).toEqual([{ name: 'ok', color: '#aabbcc' }]);
    base.site.dressCode.colors = [{ name: 'x', color: 'javascript:1' }];
    expect(sanitize(base).site.dressCode.colors).toEqual(defaultColors());
    delete base.site.dressCode.showColors;
    expect(sanitize(base).site.dressCode.showColors).toBe(true);
  });
});

describe('sección de regalos y texto libre', () => {
  const withGifts = () => {
    const s = emptyState();
    s.planId = 'completo';
    s.gifts.items = [{ id: 'g1', name: 'Cena', text: '', amount: 1000, category: 'Luna de miel', icon: 'compass' }];
    return s;
  };

  it('la sección de regalos se ve si hay lista y la pareja la dejó prendida; el botón lleva a la página de regalos', () => {
    const s = withGifts();
    const site = siteFromState(s);
    expect(site.blocks.giftsSection).toBe(true);
    expect(site.giftsSection.title).toBe('¿Querés regalarnos algo?');
    expect(site.giftsPath.endsWith('/regalos')).toBe(true);
    s.site.giftsSection.enabled = false;
    const off = siteFromState(s);
    expect(off.blocks.giftsSection).toBe(false);
    expect(off.blocks.gifts).toBe(true); // la lista sigue existiendo: los invitados pueden regalar desde la barra
    s.site.giftsSection = { enabled: true, title: 'Regalen un viaje', text: '', button: 'Ver ideas' };
    expect(siteFromState(s).giftsSection).toEqual({ title: 'Regalen un viaje', text: expect.any(String), button: 'Ver ideas' });
  });

  it('sin regalos no hay sección', () => {
    const s = emptyState();
    s.planId = 'completo';
    expect(siteFromState(s).blocks.giftsSection).toBe(false);
  });

  it('el texto libre se muestra solo si está prendido y tiene título o mensaje; prendido y vacío es pendiente', () => {
    const s = emptyState();
    s.planId = 'completo';
    s.site.note.enabled = true;
    expect(siteFromState(s).blocks.note).toBe(false);
    expect(sectionGaps(s).map(g => g.id)).toContain('texto');
    s.site.note = { enabled: true, title: 'Un aviso', text: 'Hay estacionamiento.' };
    expect(siteFromState(s).blocks.note).toBe(true);
    expect(siteFromState(s).note).toEqual({ title: 'Un aviso', text: 'Hay estacionamiento.' });
    expect(sectionGaps(s).map(g => g.id)).not.toContain('texto');
  });
});

describe('fondo de cada sección', () => {
  it('decide el tono del texto por el contraste: fondos oscuros llevan texto blanco, claros texto oscuro', () => {
    for (const c of ['#2b4045', '#3b3c3a', '#000000', '#959571', '#1f2a5c']) expect(isDarkBg(c)).toBe(true);
    for (const c of ['#ffffff', '#f3f0e8', '#d9cdb8', '#e4e3d0', '#ffd1dc']) expect(isDarkBg(c)).toBe(false);
    expect(isDarkBg('rojo')).toBe(false);
  });

  it('solo se aceptan secciones conocidas y colores hexadecimales válidos', () => {
    expect(cleanBgs({ dress: '#AABBCC', rsvp: 'azul', inventada: '#000000', fotos: 'javascript:1', eventos: '#fff' })).toEqual({ dress: '#aabbcc' });
    expect(cleanBgs(null)).toEqual({});
    expect(cleanBgs([1])).toEqual({});
  });

  it('se guarda, se lee y llega a la página pública; datos viejos sin fondos usan el de Weda', () => {
    const base = JSON.parse(JSON.stringify(emptyState()));
    delete base.site.bgs;
    expect(sanitize(base).site.bgs).toEqual({});
    base.site.bgs = { texto: '#E4E3D0', musica: 'no' };
    expect(sanitize(base).site.bgs).toEqual({ texto: '#e4e3d0' });
    const s = sanitize(base);
    expect(siteFromState(s).bgs).toEqual({ texto: '#e4e3d0' });
  });
});
