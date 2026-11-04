// Pago y publicación SIMULADOS (frontend-only): no hay cobro ni publicación en Internet. Los montos salen de la matriz de planes (`plans.ts`);
// la vigencia es la del plan (`PUBLICATION_TERM`, un año). Dar de baja la página NO devuelve el pago ni cambia el plan.
import { setPlan } from './logic';
import { PUBLICATION_MONTHS, planById } from './plans';
import type { AppState, PlanId, Publication } from './types';

const priceOf = (id: PlanId): number => planById(id)?.price ?? 0;

/** Fecha de vencimiento: un año después de publicar (`PUBLICATION_MONTHS`, misma regla que `PUBLICATION_TERM`).
 *  Si el día no existe en el mes de destino (29 de febrero + 1 año), vence el último día de ese mes. */
export function addTerm(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + PUBLICATION_MONTHS);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

/** Total pagado hasta ahora. Las mejoras de plan ya no existen (D-05, DP-23 pendiente); las guardadas antes se siguen sumando. */
export const totalPaid = (p: Publication): number => p.payments.reduce((n, x) => n + x.amount, 0);

export const isExpired = (p: Publication, now: Date = new Date()): boolean => now.getTime() >= Date.parse(p.expiresAt);
/** La página está publicada: se publicó, no se dio de baja y el plan sigue vigente. */
export const isLive = (s: Pick<AppState, 'publication'>, now: Date = new Date()): boolean => !!s.publication && s.publication.live && !isExpired(s.publication, now);

/** Pago de la publicación (se cobra el precio completo del plan) y publicación. Si ya había una publicación, la reemplaza solo cuando no existe. */
export function publishPaid(s: AppState, planId: PlanId, now: Date = new Date()): AppState {
  if (s.publication) return s;
  const at = now.toISOString();
  return { ...setPlan(s, planId), publication: { planId, live: true, publishedAt: at, expiresAt: addTerm(at), payments: [{ kind: 'publish', planId, amount: priceOf(planId), at }] } };
}

/** Bajar la página: deja de estar publicada. El pago y el plan se conservan y se puede volver a publicar sin pagar mientras dure la vigencia. */
export const takeDown = (s: AppState): AppState => (s.publication ? { ...s, publication: { ...s.publication, live: false } } : s);
export function republish(s: AppState, now: Date = new Date()): AppState {
  if (!s.publication || isExpired(s.publication, now)) return s;
  return { ...s, publication: { ...s.publication, live: true } };
}
