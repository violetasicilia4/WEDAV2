// Pago y publicación SIMULADOS (frontend-only): no hay cobro ni publicación en Internet. Los montos salen de la matriz de planes (`plans.ts`);
// la vigencia es la del plan (`PUBLICATION_TERM`, un año). Dar de baja la página NO devuelve el pago ni cambia el plan.
import { setPlan } from './logic';
import { PLANS, planById, type Plan } from './plans';
import type { AppState, PlanId, Publication } from './types';

const priceOf = (id: PlanId): number => planById(id)?.price ?? 0;

/** Fecha de vencimiento: un año después de publicar (misma regla que `PUBLICATION_TERM`). */
export function addYear(iso: string): string {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

/** Total pagado hasta ahora (publicación + mejoras). */
export const totalPaid = (p: Publication): number => p.payments.reduce((n, x) => n + x.amount, 0);

export const isExpired = (p: Publication, now: Date = new Date()): boolean => now.getTime() >= Date.parse(p.expiresAt);
/** La página está publicada: se publicó, no se dio de baja y el plan sigue vigente. */
export const isLive = (s: Pick<AppState, 'publication'>, now: Date = new Date()): boolean => !!s.publication && s.publication.live && !isExpired(s.publication, now);

/** Planes a los que se puede mejorar desde `from`: los de mayor precio. */
export const upgradeOptions = (from: PlanId): Plan[] => PLANS.filter(p => p.price > priceOf(from));
/** Lo que se paga al mejorar: la diferencia de precio entre los dos planes. */
export const upgradeAmount = (from: PlanId, to: PlanId): number => Math.max(0, priceOf(to) - priceOf(from));

/** Pago de la publicación (se cobra el precio completo del plan) y publicación. Si ya había una publicación, la reemplaza solo cuando no existe. */
export function publishPaid(s: AppState, planId: PlanId, now: Date = new Date()): AppState {
  if (s.publication) return s;
  const at = now.toISOString();
  return { ...setPlan(s, planId), publication: { planId, live: true, publishedAt: at, expiresAt: addYear(at), payments: [{ kind: 'publish', planId, amount: priceOf(planId), at }] } };
}

/** Mejora de plan: se paga solo la diferencia, el sitio pasa a mostrarse con el plan nuevo y la vigencia no cambia. */
export function upgradePaid(s: AppState, to: PlanId, now: Date = new Date()): AppState {
  const pub = s.publication;
  if (!pub || !upgradeOptions(pub.planId).some(p => p.id === to)) return s;
  const pay = { kind: 'upgrade' as const, planId: to, amount: upgradeAmount(pub.planId, to), at: now.toISOString() };
  return { ...setPlan(s, to), publication: { ...pub, planId: to, payments: [...pub.payments, pay] } };
}

/** Bajar la página: deja de estar publicada. El pago y el plan se conservan y se puede volver a publicar sin pagar mientras dure la vigencia. */
export const takeDown = (s: AppState): AppState => (s.publication ? { ...s, publication: { ...s.publication, live: false } } : s);
export function republish(s: AppState, now: Date = new Date()): AppState {
  if (!s.publication || isExpired(s.publication, now)) return s;
  return { ...s, publication: { ...s.publication, live: true } };
}
