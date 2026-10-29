import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { usePlans } from '@/components/panel/ui';
import { formatPrice, planById } from '@/lib/weda/plans';
import { publishPaid } from '@/lib/weda/payments';
import { sitePath } from '@/lib/weda/logic';
import { errorText, getOrder, publishRemote, refreshPayments, useRemote, type OrderStatus } from '@/lib/weda/remote';
import { update, useAppState } from '@/lib/weda/store';
import type { PlanId } from '@/lib/weda/types';

/* Vuelta del checkout. La URL trae el id de la orden, pero llegar acá NO prueba nada: se pregunta al servidor, que solo marca «pagada» con una
   notificación verificada del proveedor. Mientras está pendiente, se vuelve a preguntar unas veces; pagada, se puede publicar (acción aparte). */
export const Route = createFileRoute('/panel/pago')({
  validateSearch: (q: Record<string, unknown>): { orden?: string } => (typeof q['orden'] === 'string' ? { orden: q['orden'] } : {}),
  component: PaymentReturn,
});

const POLL_MS = 3000, POLL_MAX = 20;

function PaymentReturn() {
  const { orden } = Route.useSearch();
  const s = useAppState();
  const { user, settled } = useRemote();
  const plans = usePlans();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const [pub, setPub] = useState<'idle' | 'busy' | 'done'>('idle');
  const timer = useRef<number | undefined>(undefined);

  const check = useCallback(async () => {
    if (!orden) return;
    const r = await getOrder(orden);
    if (!r.ok) { setError(errorText(r.code)); return; }
    setError(null); setOrder(r.order);
    if (r.order.status === 'paid') void refreshPayments();
    if (r.order.status === 'pending') setPolls(n => n + 1);
  }, [orden]);

  useEffect(() => { if (settled && user) void check(); }, [settled, user, check]);
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (order?.status === 'pending' && polls < POLL_MAX) timer.current = window.setTimeout(() => void check(), POLL_MS);
    return () => window.clearTimeout(timer.current);
  }, [order, polls, check]);

  const publish = () => {
    if (!order || pub === 'busy') return;
    setPub('busy'); setError(null);
    void publishRemote().then(r => {
      if (r.ok) { update(x => (x.publication ? x : publishPaid(x, order.planId as PlanId))); setPub('done'); return; }
      setPub('idle'); setError(errorText(r.code));
    });
  };

  const plan = order ? planById(order.planId as PlanId) : null;
  return (
    <div className="pn-page">
      <header className="pn-page-head">
        <div>
          <h1>Tu pago</h1>
          <p className="pn-sub">{plan ? `Plan ${plan.name} · ${formatPrice(order!.amount)}` : 'Estado del pago'}</p>
        </div>
      </header>
      <section className="pn-pay-status" aria-live="polite">
        {!orden && <p className="pn-note">No encontramos el pago. Si empezaste uno, abrí «Publicar» para retomarlo.</p>}
        {orden && settled && !user && <p className="pn-note">Ingresá a tu cuenta para ver el estado del pago. <Link to="/crear/cuenta" search={{ modo: 'ingresar' }} className="pn-link">Ingresar</Link></p>}
        {error && <p className="pn-banner" role="alert">{error}</p>}
        {orden && user && !order && !error && <p className="pn-muted" role="status"><Loader2 size={16} className="pn-spin" aria-hidden="true" /> Consultando el pago…</p>}
        {order?.status === 'pending' && (
          <>
            <h2>Esperando la confirmación del pago</h2>
            <p className="pn-muted">Todavía no recibimos la confirmación. Si ya pagaste, puede tardar unos minutos. No vuelvas a pagar.</p>
            <button type="button" className="pn-btn is-ghost" onClick={() => { setPolls(0); void check(); }}>Revisar de nuevo</button>
          </>
        )}
        {order?.status === 'paid' && pub !== 'done' && (
          <>
            <h2><Check size={20} aria-hidden="true" /> Pago confirmado</h2>
            <p className="pn-muted">Ya podés publicar tu página. El link no cambia después.</p>
            <button type="button" className="pn-btn" disabled={pub === 'busy'} aria-busy={pub === 'busy'} onClick={publish}>
              {pub === 'busy' ? <><Loader2 size={16} className="pn-spin" aria-hidden="true" /> Publicando…</> : 'Publicar mi página'}
            </button>
          </>
        )}
        {pub === 'done' && (
          <>
            <h2>¡Tu página está publicada!</h2>
            <p className="pn-muted">Ya la puede abrir cualquiera que tenga el link.</p>
            <a className="pn-btn" href={sitePath(s)} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> Ver mi página<span className="pn-sr"> (se abre en otra pestaña)</span></a>
          </>
        )}
        {(order?.status === 'failed' || order?.status === 'cancelled') && (
          <>
            <h2>{order.status === 'failed' ? 'El pago no se aprobó' : 'Cancelaste el pago'}</h2>
            <p className="pn-muted">Tu página no se publicó. Podés intentarlo de nuevo cuando quieras.</p>
            <button type="button" className="pn-btn" onClick={plans.open}>Volver a intentar</button>
          </>
        )}
      </section>
    </div>
  );
}
