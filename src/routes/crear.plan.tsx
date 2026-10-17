import { useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { setPlan } from '@/lib/weda/logic';
import { PLANS } from '@/lib/weda/plans';
import { update, useAppState, useHydrated } from '@/lib/weda/store';
import type { PlanId } from '@/lib/weda/types';

export const Route = createFileRoute('/crear/plan')({ component: ChoosePlan });

/* Paso 2: elegir plan. No hay checkout ni cobro: elegir un plan solo lo guarda y entra a la aplicación. */
function ChoosePlan() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();

  // Sin los datos del paso 1 no se puede elegir plan: se vuelve al comienzo (sin perder nada).
  useEffect(() => { if (hydrated && !state.onboarded) void navigate({ to: '/crear', replace: true }); }, [hydrated, state.onboarded, navigate]);
  if (!hydrated || !state.onboarded) return <p className="pn-loading" role="status">Cargando…</p>;

  const current = state.planId;
  const choose = (id: PlanId) => { update(s => setPlan(s, id)); void navigate({ to: '/panel' }); };

  return (
    <div className="pn-plans">
      <h1>Elegí tu plan</h1>
      <p className="pn-lead pn-promise"><strong>Probá Weda gratis, sin tarjeta.</strong> Pagás únicamente cuando publiques tu sitio.</p>
      <ul className="pn-plan-grid">
        {PLANS.map(p => {
          const isCurrent = current === p.id;
          const wanted = !current && state.preferredPlan === p.id;
          return (
            <li key={p.id} className={`pn-plan${isCurrent ? ' is-current' : ''}${wanted ? ' is-wanted' : ''}`}>
              <h2>{p.name}</h2>
              <p className="pn-plan-tag">{p.tagline}</p>
              <ul className="pn-plan-items">
                {p.items.map(it => <li key={it}><Check size={16} strokeWidth={1.6} aria-hidden="true" /><span>{it}</span></li>)}
              </ul>
              <p className="pn-plan-price">El precio se informa al publicar.</p>
              <button type="button" className={`pn-btn${isCurrent ? ' is-ghost' : ''}`} onClick={() => choose(p.id)} aria-label={isCurrent ? `Seguir con el plan ${p.name}` : `Elegir el plan ${p.name}`}>
                {isCurrent ? 'Tu plan actual' : `Elegir ${p.name}`}
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="pn-facts">
        <li>No se cobra nada al elegir un plan.</li>
        <li>No pedimos tarjeta para recorrer la demo.</li>
        <li>Podés cambiar de plan cuando quieras desde tu panel.</li>
        <li>La contratación y el cobro todavía no existen en esta demostración.</li>
      </ul>
      <Link to="/crear" className="pn-link is-muted">← Volver a mis datos</Link>
    </div>
  );
}
