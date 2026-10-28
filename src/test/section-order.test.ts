import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDER, defaultColors, emptyState, moveBlock, normalizeOrder, shortAddress } from '@/lib/weda/logic';
import { sanitize } from '@/lib/weda/store';
import { siteFromState } from '@/lib/weda/site-model';
import { sectionGaps } from '@/lib/weda/journey';
import type { BlockId } from '@/lib/weda/types';

describe('orden de las secciones', () => {
  it('el orden de fábrica: «Save the date» primero (como siempre), los regalos tras los eventos y el texto libre tras el dress code', () => {
    expect(DEFAULT_ORDER).toEqual(['fecha', 'eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica', 'mensaje']);
    expect(emptyState().site.order).toEqual(DEFAULT_ORDER);
  });

  it('normaliza cualquier valor: sin repetidos ni desconocidos, y las secciones nuevas se ubican donde les corresponde', () => {
    expect(normalizeOrder(undefined)).toEqual(DEFAULT_ORDER);
    expect(normalizeOrder('x')).toEqual(DEFAULT_ORDER);
    expect(normalizeOrder(['musica', 'musica', 'inventada', 'rsvp'])).toEqual(['fecha', 'eventos', 'regalos', 'musica', 'rsvp', 'dress', 'texto', 'fotos', 'mensaje']);
    // Un orden guardado antes de existir «regalos» y «texto»: la sección nueva entra justo después de la que la antecede en el orden de fábrica.
    expect(normalizeOrder(['eventos', 'rsvp', 'dress', 'fotos', 'musica'])).toEqual(DEFAULT_ORDER);
    expect(normalizeOrder(['musica', 'fotos', 'dress', 'rsvp', 'eventos'])).toEqual(['fecha', 'musica', 'fotos', 'dress', 'texto', 'rsvp', 'eventos', 'regalos', 'mensaje']);
  });

  it('mover cambia solo con las secciones visibles: una oculta no «consume» el movimiento', () => {
    const visible = (b: BlockId) => b === 'eventos' || b === 'rsvp' || b === 'fotos';
    expect(moveBlock(DEFAULT_ORDER, 'fotos', -1, visible)).toEqual(['fecha', 'eventos', 'regalos', 'fotos', 'dress', 'texto', 'rsvp', 'musica', 'mensaje']);
  });

  it('los extremos no se mueven y devolver el mismo orden no cambia nada', () => {
    const all = () => true;
    expect(moveBlock(DEFAULT_ORDER, 'fecha', -1, all)).toBe(DEFAULT_ORDER);
    expect(moveBlock(DEFAULT_ORDER, 'mensaje', 1, all)).toBe(DEFAULT_ORDER);
    expect(moveBlock(DEFAULT_ORDER, 'regalos', 1, all)).toEqual(['fecha', 'eventos', 'rsvp', 'regalos', 'dress', 'texto', 'fotos', 'musica', 'mensaje']);
  });

  it('el orden se guarda y se lee: datos viejos sin orden usan el de fábrica; uno inválido se corrige', () => {
    const base = JSON.parse(JSON.stringify(emptyState()));
    delete base.site.order;
    expect(sanitize(base).site.order).toEqual(DEFAULT_ORDER);
    base.site.order = ['musica', 'fotos', 'zzz', 'musica'];
    expect(sanitize(base).site.order).toEqual(['fecha', 'eventos', 'regalos', 'rsvp', 'dress', 'texto', 'musica', 'fotos', 'mensaje']);
  });

  it('la página pública recibe el orden de la pareja', () => {
    const s = emptyState();
    s.site.order = ['musica', 'fotos', 'texto', 'dress', 'rsvp', 'regalos', 'eventos'];
    expect(siteFromState(s).order).toEqual(['fecha', 'musica', 'fotos', 'texto', 'dress', 'rsvp', 'regalos', 'eventos', 'mensaje']);
  });
});

describe('«Save the date» es una sección más del orden (la portada sigue siempre primera)', () => {
  it('por defecto va primero, y un orden guardado antes de que existiera lo recibe en el mismo lugar de siempre (debajo de la portada)', () => {
    expect(DEFAULT_ORDER[0]).toBe('fecha');
    expect(normalizeOrder(['eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica'])[0]).toBe('fecha');
    expect(normalizeOrder(['musica', 'eventos'])[0]).toBe('fecha');
    expect(DEFAULT_ORDER.filter(b => b === 'fecha')).toHaveLength(1);
  });

  it('se mueve entre las secciones visibles y deja a las demás en su orden; subir en el extremo no hace nada', () => {
    const visible = (b: BlockId) => b !== 'texto' && b !== 'musica';                // «texto» y «música» están ocultas
    let o = moveBlock(DEFAULT_ORDER, 'fecha', 1, visible);
    expect(o.filter(visible)).toEqual(['eventos', 'fecha', 'regalos', 'rsvp', 'dress', 'fotos', 'mensaje']);
    o = moveBlock(o, 'fecha', 1, visible);
    expect(o.filter(visible)).toEqual(['eventos', 'regalos', 'fecha', 'rsvp', 'dress', 'fotos', 'mensaje']);
    expect(moveBlock(o, 'fecha', -1, visible).filter(visible)).toEqual(['eventos', 'fecha', 'regalos', 'rsvp', 'dress', 'fotos', 'mensaje']);
    expect(moveBlock(DEFAULT_ORDER, 'fecha', -1, visible)).toBe(DEFAULT_ORDER);
    expect(new Set(o).size).toBe(o.length);
  });

  it('el orden con «Save the date» movido se guarda, se lee y llega a la página pública', () => {
    const s = emptyState();
    s.site.order = moveBlock(DEFAULT_ORDER, 'fecha', 1, () => true);
    const back = sanitize(JSON.parse(JSON.stringify(s)));
    expect(back.site.order.slice(0, 3)).toEqual(['eventos', 'fecha', 'regalos']);
    expect(siteFromState(back).order.slice(0, 3)).toEqual(['eventos', 'fecha', 'regalos']);
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
