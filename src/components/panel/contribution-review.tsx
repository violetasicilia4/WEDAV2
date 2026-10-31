// Revisión manual de un aporte (Weda no verifica transferencias): la pareja lo confirma o lo rechaza; un rechazado puede volver a
// revisión. Las reglas las aplica el servidor (PATCH /api/contributions/:id); acá solo se ofrecen las posibles.
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useToast } from './ui';
import { api, ApiFailure } from '@/lib/weda/remote';
import type { Contribution } from '@/lib/weda/logic';

type Target = 'confirmed' | 'rejected' | 'pending_review';

const ERROR: Record<string, string> = {
  receipt_required: 'Para confirmarlo, primero tiene que estar el comprobante.',
  invalid_transition: 'Ese cambio ya no se puede hacer. Actualizá la página.',
};

export function ContributionReview({ r, onChange }: { r: Contribution; onChange: (status: Target) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  if (!r.status) return null; // aportes registrados solo en este navegador: no hay nada que revisar en el servidor

  const review = async (to: Target) => {
    setBusy(true);
    try {
      await api('PATCH', `/api/contributions/${encodeURIComponent(r.id)}`, { status: to });
      setRejecting(false);
      onChange(to);
      toast(to === 'confirmed' ? `Confirmaste el aporte de ${r.giver}.` : to === 'rejected' ? `Rechazaste el aporte de ${r.giver}. Ya no suma en tus totales.` : `El aporte de ${r.giver} volvió a revisión.`, 'ok');
    } catch (e) {
      toast(ERROR[e instanceof ApiFailure ? e.code : ''] ?? 'No pudimos guardar el cambio. Probá de nuevo en un rato.', 'error');
    } finally { setBusy(false); }
  };
  const wait = busy ? 'Un momento…' : null;
  const hasReceipt = !!r.receipt && r.receipt !== 'missing';

  return (
    <div className="pn-actions is-tight" role="group" aria-label={`Revisar el aporte de ${r.giver}`}>
      {rejecting ? (
        <>
          <p className="pn-note">¿Rechazar el aporte? Deja de sumar en tus totales; si te equivocás, podés volver a revisarlo.</p>
          <button type="button" className="pn-btn is-small" disabled={busy} aria-busy={busy} onClick={() => void review('rejected')}>{wait ?? 'Sí, rechazar'}</button>
          <button type="button" className="pn-btn is-ghost is-small" disabled={busy} onClick={() => setRejecting(false)}>Cancelar</button>
        </>
      ) : r.status === 'rejected' ? (
        <button type="button" className="pn-btn is-ghost is-small" disabled={busy} aria-busy={busy} onClick={() => void review('pending_review')}>{wait ?? 'Volver a revisar'}</button>
      ) : (
        <>
          {r.status === 'pending_review' && hasReceipt && <button type="button" className="pn-btn is-small" disabled={busy} aria-busy={busy} onClick={() => void review('confirmed')}><Check size={15} aria-hidden="true" />{wait ?? 'Confirmar'}</button>}
          <button type="button" className="pn-btn is-ghost is-small" disabled={busy} onClick={() => setRejecting(true)}>Rechazar</button>
        </>
      )}
    </div>
  );
}
