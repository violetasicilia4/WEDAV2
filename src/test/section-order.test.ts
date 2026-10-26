import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDER, moveBlock, normalizeOrder, emptyState } from '@/lib/weda/logic';
import { sanitize } from '@/lib/weda/store';
import { siteFromState } from '@/lib/weda/site-model';
import type { BlockId } from '@/lib/weda/types';

describe('orden de las secciones', () => {
  it('el orden de fábrica es el que tenía la invitación antes de poder reordenar', () => {
    expect(DEFAULT_ORDER).toEqual(['eventos', 'rsvp', 'dress', 'fotos', 'musica']);
    expect(emptyState().site.order).toEqual(DEFAULT_ORDER);
  });

  it('normaliza cualquier valor: sin repetidos ni desconocidos y sin perder secciones', () => {
    expect(normalizeOrder(undefined)).toEqual(DEFAULT_ORDER);
    expect(normalizeOrder(['musica', 'musica', 'inventada', 'rsvp'])).toEqual(['musica', 'rsvp', 'eventos', 'dress', 'fotos']);
    expect(normalizeOrder('x')).toEqual(DEFAULT_ORDER);
  });

  it('mover cambia solo con las secciones visibles: una oculta no «consume» el movimiento', () => {
    const visible = (b: BlockId) => b !== 'dress';
    // «fotos» sube un lugar entre las visibles: pasa por encima de «rsvp» (la oculta «dress» no cuenta como lugar).
    expect(moveBlock(DEFAULT_ORDER, 'fotos', -1, visible)).toEqual(['eventos', 'fotos', 'dress', 'rsvp', 'musica']);
  });

  it('los extremos no se mueven y devolver el mismo orden no cambia nada', () => {
    const all = () => true;
    expect(moveBlock(DEFAULT_ORDER, 'eventos', -1, all)).toBe(DEFAULT_ORDER);
    expect(moveBlock(DEFAULT_ORDER, 'musica', 1, all)).toBe(DEFAULT_ORDER);
    expect(moveBlock(DEFAULT_ORDER, 'rsvp', 1, all)).toEqual(['eventos', 'dress', 'rsvp', 'fotos', 'musica']);
  });

  it('el orden se guarda y se lee: datos viejos sin orden usan el de fábrica; uno inválido se corrige', () => {
    const base = JSON.parse(JSON.stringify(emptyState()));
    delete base.site.order;
    expect(sanitize(base).site.order).toEqual(DEFAULT_ORDER);
    base.site.order = ['fotos', 'fotos', 'zzz'];
    expect(sanitize(base).site.order).toEqual(['fotos', 'eventos', 'rsvp', 'dress', 'musica']);
  });

  it('la página pública recibe el orden de la pareja', () => {
    const s = emptyState();
    s.site.order = ['musica', 'fotos', 'dress', 'rsvp', 'eventos'];
    expect(siteFromState(s).order).toEqual(['musica', 'fotos', 'dress', 'rsvp', 'eventos']);
  });
});
