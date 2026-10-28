import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { HIGHLIGHT_ICON } from '@/components/plan-icons';
import { formatPrice, PLANS, planById, PUBLICATION_TERM, type Plan } from '@/lib/weda/plans';

/** Lo que incluye un plan, de más básico a más completo: cada plan suma lo suyo a lo del anterior. */
const chain = (plan: Plan): Plan[] => (plan.inherits ? [...chain(planById(plan.inherits) as Plan), plan] : [plan]);

function PlanCard({ plan }: { plan: Plan }) {
  const base = plan.inherits ? planById(plan.inherits) : undefined;
  const [open, setOpen] = useState(false);
  return (
    <article className="plan-card" aria-labelledby={`plan-${plan.id}`}>
      <header className="plan-media">
        <div className="plan-media-top">
          <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
          <p className="plan-sub">{plan.product}</p>
        </div>
        <div className="plan-media-bottom">
          <p className="plan-price"><strong>{formatPrice(plan.price)}</strong></p>
          <p className="plan-term"><b>Pago único</b> · <span>Publicada {PUBLICATION_TERM}</span></p>
        </div>
      </header>
      <ul>
        {base && <li className="plan-inherit"><Plus size={18} strokeWidth={1.6} aria-hidden="true" /><span><strong>Todo lo de {base.name}</strong>, y además:</span></li>}
        {plan.highlights.map(h => {
          const Icon = HIGHLIGHT_ICON[h.icon];
          return <li key={h.label}><Icon size={18} strokeWidth={1.5} aria-hidden="true" /><span>{h.label}</span></li>;
        })}
      </ul>
      <button type="button" className="plan-more-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">Ver lo que incluye</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="plan-dialog">
          <DialogTitle>{plan.name}: lo que incluye</DialogTitle>
          <DialogDescription>{formatPrice(plan.price)} · Pago único · Publicada {PUBLICATION_TERM}</DialogDescription>
          {base && <p className="plan-dialog-base"><Plus size={16} strokeWidth={1.6} aria-hidden="true" /><span>Incluye todo lo de {chain(plan).slice(0, -1).map(p => p.name).join(' y ')}</span></p>}
          <ul>{plan.items.map(it => <li key={it}>{it}</li>)}</ul>
          <Button variant="seed" asChild><Link to="/crear/cuenta">Empezar gratis</Link></Button>
        </DialogContent>
      </Dialog>
      <Button variant="seed" asChild><Link to="/crear/cuenta">Empezar gratis</Link></Button>
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
          <p>Creá tu evento, personalizá tu sitio y probá las herramientas de Weda.</p>
        </div>
        <div className="plans-grid">{PLANS.map(p => <PlanCard key={p.id} plan={p} />)}</div>
      </div>
    </section>
  );
}
