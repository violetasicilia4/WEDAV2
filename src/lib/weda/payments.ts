// Estado local de la publicación (el servidor es la fuente de verdad: ver remote.ts). Los montos salen de la matriz de planes (`plans.ts`).
// Lo publicado no vence (BR-65, PAY-07). Dar de baja la página NO devuelve el pago ni cambia el plan.
import { setPlan } from './logic';
import { planById } from './plans';
import type { AppState, PlanId, Publication } from './types';

const priceOf = (id: PlanId): number => planById(id)?.price ?? 0;

/** Total pagado hasta ahora. Las mejoras de plan ya no existen (D-05, DP-23 pendiente); las guardadas antes se siguen sumando. */
export const totalPaid = (p: Publication): number => p.payments.reduce((n, x) => n + x.amount, 0);

/** La página está publicada: se publicó y no se dio de baja. Sin vencimiento (BR-65). */
export const isLive = (s: Pick<AppState, 'publication'>): boolean => !!s.publication && s.publication.live;

/** Pago de la publicación (se cobra el precio completo del plan) y publicación. Si ya había una publicación, la reemplaza solo cuando no existe. */
export function publishPaid(s: AppState, planId: PlanId, now: Date = new Date()): AppState {
  if (s.publication) return s;
  const at = now.toISOString();
  return { ...setPlan(s, planId), publication: { planId, live: true, publishedAt: at, payments: [{ kind: 'publish', planId, amount: priceOf(planId), at }] } };
}

/** Bajar la página: deja de estar publicada. El pago y el plan se conservan y se puede volver a publicar sin pagar, en cualquier momento. */
export const takeDown = (s: AppState): AppState => (s.publication ? { ...s, publication: { ...s.publication, live: false } } : s);
export function republish(s: AppState): AppState {
  if (!s.publication) return s;
  return { ...s, publication: { ...s.publication, live: true } };
}
