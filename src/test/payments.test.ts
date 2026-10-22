import { describe, expect, it } from 'vitest';
import { addYear, isExpired, isLive, publishPaid, republish, takeDown, totalPaid, upgradeAmount, upgradeOptions, upgradePaid } from '@/lib/weda/payments';
import { emptyState } from '@/lib/weda/logic';
import { PLANS } from '@/lib/weda/plans';
import { parseStored } from '@/lib/weda/store';

const NOW = new Date('2026-10-22T15:00:00.000Z');
const base = () => ({ ...emptyState(), onboarded: true, couple: { first: 'Lucía', second: 'Violeta' } });
const price = (id: string) => PLANS.find(p => p.id === id)!.price;

describe('pago y publicación simulados', () => {
  it('publicar cobra el precio completo del plan, publica y deja el sitio con ese plan', () => {
    const s = publishPaid(base(), 'invitacion', NOW);
    expect(s.planId).toBe('invitacion');
    expect(s.publication).toMatchObject({ planId: 'invitacion', live: true, publishedAt: NOW.toISOString() });
    expect(s.publication!.payments).toEqual([{ kind: 'publish', planId: 'invitacion', amount: price('invitacion'), at: NOW.toISOString() }]);
    expect(totalPaid(s.publication!)).toBe(price('invitacion'));
    expect(isLive(s, NOW)).toBe(true);
  });
  it('la vigencia es de un año desde la publicación', () => {
    expect(addYear('2026-10-22T15:00:00.000Z')).toBe('2027-10-22T15:00:00.000Z');
    const s = publishPaid(base(), 'regalos', NOW);
    expect(isExpired(s.publication!, new Date('2027-10-22T14:59:59.000Z'))).toBe(false);
    expect(isExpired(s.publication!, new Date('2027-10-22T15:00:00.000Z'))).toBe(true);
    expect(isLive(s, new Date('2027-10-23T00:00:00.000Z'))).toBe(false);
  });
  it('no se paga dos veces la publicación: con una publicación existente no cambia nada', () => {
    const once = publishPaid(base(), 'regalos', NOW);
    expect(publishPaid(once, 'completo', NOW)).toBe(once);
  });
  it('mejorar de plan cobra solo la diferencia, cambia el plan y conserva la vigencia', () => {
    const s = publishPaid(base(), 'regalos', NOW);
    expect(upgradeOptions('regalos').map(p => p.id)).toEqual(['invitacion', 'completo']);
    expect(upgradeAmount('regalos', 'invitacion')).toBe(price('invitacion') - price('regalos'));
    expect(upgradeAmount('invitacion', 'completo')).toBe(price('completo') - price('invitacion'));
    const later = new Date('2027-01-05T10:00:00.000Z');
    const up = upgradePaid(s, 'completo', later);
    expect(up.planId).toBe('completo');
    expect(up.publication!.planId).toBe('completo');
    expect(up.publication!.expiresAt).toBe(s.publication!.expiresAt);
    expect(up.publication!.payments.map(p => p.amount)).toEqual([price('regalos'), price('completo') - price('regalos')]);
    expect(totalPaid(up.publication!)).toBe(price('completo'));          // pagó en total lo mismo que el plan más alto
  });
  it('no se puede mejorar al mismo plan, a uno menor, ni sin haber publicado', () => {
    const s = publishPaid(base(), 'invitacion', NOW);
    expect(upgradePaid(s, 'invitacion', NOW)).toBe(s);
    expect(upgradePaid(s, 'regalos', NOW)).toBe(s);
    expect(upgradePaid(base(), 'completo', NOW).publication).toBeNull();
    expect(upgradeOptions('completo')).toEqual([]);
  });
  it('bajar la página conserva el pago y el plan; se puede volver a publicar sin pagar mientras dure la vigencia', () => {
    const s = publishPaid(base(), 'invitacion', NOW);
    const down = takeDown(s);
    expect(down.publication!.live).toBe(false);
    expect(isLive(down, NOW)).toBe(false);
    expect(down.planId).toBe('invitacion');
    expect(totalPaid(down.publication!)).toBe(price('invitacion'));
    const back = republish(down, NOW);
    expect(isLive(back, NOW)).toBe(true);
    expect(back.publication!.payments).toHaveLength(1);                  // no hubo otro pago
    expect(republish(down, new Date('2028-01-01T00:00:00.000Z'))).toBe(down); // vencida: no se republica gratis
  });
  it('la publicación se guarda y se recupera, y un dato inválido la descarta sin romper el resto', () => {
    const s = upgradePaid(publishPaid(base(), 'regalos', NOW), 'invitacion', NOW);
    const back = parseStored(JSON.stringify(s));
    expect(back.publication).toEqual(s.publication);
    const roto = JSON.parse(JSON.stringify(s)); roto.publication.expiresAt = 'no es una fecha';
    const parsed = parseStored(JSON.stringify(roto));
    expect(parsed.publication).toBeNull();
    expect(parsed.couple.first).toBe('Lucía');
    expect(parseStored(JSON.stringify({ ...JSON.parse(JSON.stringify(base())), publication: undefined })).publication).toBeNull();
  });
});
