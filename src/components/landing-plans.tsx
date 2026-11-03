import { Link } from '@tanstack/react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { HIGHLIGHT_ICON } from '@/components/plan-icons';
import { formatPrice, PLANS, planById, PUBLICATION_TERM, type Plan } from '@/lib/weda/plans';

/* Planes de la landing (2026-11-03): dos tarjetas, con todo lo que incluye cada una a la vista para no tener que abrir nada.
   Regalos es la lista de regalos; Celebración, el sitio completo con la invitación y la gestión, destacado como «Más elegido».
   Todo sale de `src/lib/weda/plans.ts`: no se repite ningún precio ni función acá. */

function PlanCard({ plan }: { plan: Plan }) {
  const base = plan.inherits ? planById(plan.inherits) : undefined;
  const featured = plan.id === 'invitacion';
  return (
    <article className={`pl-card${featured ? ' is-featured' : ''}`} aria-labelledby={`plan-${plan.id}`}>
      <header className="pl-head">
        {featured && <span className="pl-badge">Más elegido</span>}
        <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
        <p className="pl-product">{plan.product}</p>
      </header>
      <ul className="pl-list">
        {base && <li className="pl-inherit"><Plus size={18} strokeWidth={1.8} aria-hidden="true" /><span><strong>Todo lo de {base.name}</strong>, y además:</span></li>}
        {plan.highlights.map(h => {
          const Icon = HIGHLIGHT_ICON[h.icon];
          return <li key={h.label}><Icon size={18} strokeWidth={1.5} aria-hidden="true" /><span>{h.label}</span></li>;
        })}
      </ul>
      <footer className="pl-foot">
        <div className="pl-price">
          <strong>{formatPrice(plan.price)}</strong>
          <span><b>Pago único</b> · Publicada {PUBLICATION_TERM}</span>
        </div>
        <Link to="/crear/cuenta" className="pl-cta">Empezar<ArrowRight size={16} aria-hidden="true" /></Link>
      </footer>
    </article>
  );
}

export function LandingPlans() {
  return (
    <section className="plans-section" id="planes">
      <div className="section-inner">
        <div className="plans-head">
          <h2><span className="plans-l1">Armá tu casamiento gratis.</span> <span className="plans-l2">Publicalo cuando estés listo.</span></h2>
          <p className="pl-intro">Probás todo sin pagar. Elegís el plan y pagás una sola vez recién al publicar.</p>
        </div>
        <div className="pl-grid">{PLANS.map(p => <PlanCard key={p.id} plan={p} />)}</div>
      </div>
    </section>
  );
}
