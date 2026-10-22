import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { usePlans } from '@/components/panel/ui';
import { checklist, type ChecklistItem } from '@/lib/weda/journey';
import { useAppState } from '@/lib/weda/store';

/** «Prepará tu evento»: las tareas reales del armado, con su estado derivado de los datos. Cada fila es un único elemento interactivo (enlace o botón) que lleva a hacer esa tarea. */
export function Checklist() {
  const s = useAppState();
  const plans = usePlans();
  const [couple, setCouple] = useState(false);
  const items = checklist(s);
  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const all = total > 0 && done === total;
  const status = all ? '¡Todo listo! Tu invitación está preparada ✨' : `${done} de ${total} completados`;

  const row = (i: ChecklistItem) => {
    const body = (
      <>
        <span className="ck-mark" aria-hidden="true">{i.done && <Check size={14} strokeWidth={2.5} />}</span>
        <span className="ck-label">{i.label}<span className="pn-sr">{i.done ? ' (completado)' : ' (pendiente)'}</span></span>
        {!i.done && <span className="ck-action" aria-hidden="true">{i.action}</span>}
      </>
    );
    if (i.to) return <Link to={i.to as never} {...(i.search ? { search: i.search as never } : {})} className="ck-row">{body}</Link>;
    return <button type="button" className="ck-row" onClick={() => (i.dialog === 'couple' ? setCouple(true) : plans.open())}>{body}</button>;
  };

  return (
    <section className="ck" aria-labelledby="ck-title">
      <div className="ck-head">
        <h2 id="ck-title">Prepará tu evento</h2>
        <p className="ck-count" role="status" aria-live="polite">{status}</p>
      </div>
      <div className="ck-bar" role="progressbar" aria-label="Progreso de tu evento" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={`${done} de ${total} completados`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <ul className="ck-list">
        {items.map(i => <li key={i.id} className={i.done ? 'is-done' : undefined}>{row(i)}</li>)}
      </ul>
      {couple && <CoupleDialog open onClose={() => setCouple(false)} />}
    </section>
  );
}
