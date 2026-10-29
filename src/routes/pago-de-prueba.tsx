import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { formatPrice, planById } from '@/lib/weda/plans';
import { api, ApiFailure, getOrder, type OrderStatus } from '@/lib/weda/remote';
import { pageMeta } from '@/lib/site';
import type { PlanId } from '@/lib/weda/types';

/* PROVEEDOR DE PAGOS DE PRUEBA. Solo funciona si el servidor tiene WEDA_PAYMENTS_PROVIDER=test (si no, el servidor responde 404 y esta página lo
   dice). NUNCA cobra. Simula lo que haría un proveedor real: la persona aprueba, rechaza o cancela, el «proveedor» notifica al servidor
   (con firma, por la misma vía que uno real) y vuelve al panel. Existe para las pruebas automáticas y para recorrer el flujo en local. */
export const Route = createFileRoute('/pago-de-prueba')({
  validateSearch: (q: Record<string, unknown>): { orden?: string } => (typeof q['orden'] === 'string' ? { orden: q['orden'] } : {}),
  head: () => {
    const { meta } = pageMeta({ title: 'Pago de prueba • Weda', description: 'Proveedor de pagos de prueba: no cobra.', path: '/pago-de-prueba' });
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: TestCheckout,
});

function TestCheckout() {
  const { orden } = Route.useSearch();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (orden) void getOrder(orden).then(r => (r.ok ? setOrder(r.order) : setError('No encontramos esta orden.'))); }, [orden]);
  const finish = async (outcome: 'paid' | 'failed' | 'cancelled') => {
    if (!orden || busy) return;
    setBusy(true); setError('');
    try { await api('POST', `/api/test-payments/${encodeURIComponent(orden)}`, { outcome }); void navigate({ to: '/panel/pago', search: { orden } }); }
    catch (e) { setBusy(false); setError(e instanceof ApiFailure && e.status === 404 ? 'Los pagos de prueba no están habilitados en este servidor.' : 'No se pudo completar. Probá de nuevo.'); }
  };
  const plan = order ? planById(order.planId as PlanId) : null;
  return (
    <main className="legal-page is-narrow" id="main">
      <p className="test-pay-banner" role="note"><strong>PAGO DE PRUEBA</strong> · No es un pago real. No se cobra nada ni se pide ningún dato de tarjeta.</p>
      <h1>Proveedor de pagos de prueba</h1>
      {error && <p className="legal-error" role="alert">{error}</p>}
      {order && plan && (
        <>
          <p>Orden <code>{order.id}</code> · Plan {plan.name} · <strong>{formatPrice(order.amount)}</strong> · estado: {order.status}</p>
          <div className="test-pay-actions">
            <button type="button" className="legal-btn" disabled={busy} onClick={() => void finish('paid')}>Aprobar (prueba)</button>
            <button type="button" className="legal-btn is-ghost" disabled={busy} onClick={() => void finish('failed')}>Rechazar (prueba)</button>
            <button type="button" className="legal-btn is-ghost" disabled={busy} onClick={() => void finish('cancelled')}>Cancelar</button>
          </div>
        </>
      )}
    </main>
  );
}
