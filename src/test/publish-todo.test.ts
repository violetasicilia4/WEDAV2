import { describe, expect, it } from 'vitest';
import { emptyState } from '@/lib/weda/logic';
import { publishSummary } from '@/lib/weda/publish';

describe('Publicar · pendientes de fecha y lugar (opcionales)', () => {
  it('sin fecha, el pendiente abre «Datos del casamiento» directamente', () => {
    const todo = publishSummary({ ...emptyState(), date: null }, 'invitacion').todo.find(t => /fecha/i.test(t.text));
    expect(todo).toMatchObject({ to: '/panel', cta: 'Definir la fecha', search: { editar: 'datos' } });
  });
  it('con fecha, el pendiente desaparece', () => {
    expect(publishSummary({ ...emptyState(), date: '2030-05-18' }, 'invitacion').todo.some(t => /fecha/i.test(t.text))).toBe(false);
  });
  it('el plan Regalos no pide la fecha (no publica la invitación)', () => {
    expect(publishSummary({ ...emptyState(), date: null }, 'regalos').todo.some(t => /fecha/i.test(t.text))).toBe(false);
  });
});
