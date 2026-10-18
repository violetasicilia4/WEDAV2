import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, HIGHLIGHTS, PLANS, planById, PRICE_UNIT, type Plan } from '@/lib/weda/plans';

/** Lo que incluye un plan, de más básico a más completo: cada plan suma lo suyo a lo del anterior. */
const chain = (plan: Plan): Plan[] => (plan.inherits ? [...chain(planById(plan.inherits) as Plan), plan] : [plan]);

function PlanCard({ plan }: { plan: Plan }) {
  const base = plan.inherits ? planById(plan.inherits) : undefined;
  return (
    <article className="plan-card" aria-labelledby={`plan-${plan.id}`}>
      <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
      <p className="plan-sub">{plan.tagline}</p>
      <p className="plan-price"><strong>{formatPrice(plan.price)}</strong><span>{PRICE_UNIT}</span></p>
      <ul>
        {base && <li className="plan-inherit"><Check size={18} strokeWidth={1.6} aria-hidden="true" /><span><strong>Todo lo de {base.name}</strong>, y además:</span></li>}
        {plan.items.slice(0, HIGHLIGHTS).map(it => <li key={it}><Check size={18} strokeWidth={1.6} aria-hidden="true" /><span>{it}</span></li>)}
      </ul>
      <details className="plan-more">
        <summary>Ver todo lo que incluye</summary>
        <p className="plan-for">{plan.summary}</p>
        {chain(plan).map(p => (
          <div key={p.id}>
            <h4>{p.name}</h4>
            <ul>{p.items.map(it => <li key={it}>{it}</li>)}</ul>
          </div>
        ))}
      </details>
      <Button variant="seed" asChild><Link to="/crear/cuenta">Crear mi evento gratis</Link></Button>
    </article>
  );
}

/** Planes y precios de la landing. Todo sale de `src/lib/weda/plans.ts`: no se repite ningún precio ni función acá. */
export function LandingPlans() {
  return (
    <section className="plans-section" id="planes">
      <div className="section-inner">
        <div className="plans-head">
          <h2>Armá tu casamiento gratis. Publicalo cuando estés listo.</h2>
          <p>Creá tu evento, personalizá tu micrositio y probá las herramientas de Weda. Sin tarjeta y sin elegir un plan por adelantado.</p>
        </div>
        <div className="plans-grid">{PLANS.map(p => <PlanCard key={p.id} plan={p} />)}</div>
        <p className="plans-note">Precios de referencia en pesos argentinos, por evento. Elegís tu plan y pagás recién cuando querés publicar; hasta entonces no se cobra nada. La publicación y el pago se habilitan cuando el servicio esté conectado.</p>
      </div>
    </section>
  );
}
