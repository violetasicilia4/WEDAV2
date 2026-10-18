import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Check, CircleDot, Circle, Eye, HardDrive, ListChecks, X } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { ConfirmDialog, usePlans } from '@/components/panel/ui';
import { coupleLabel, dateLabel, guestStats, readiness, STATUS_LABEL_TASK, type Task } from '@/lib/weda/logic';
import { can, planById } from '@/lib/weda/plans';
import { reset, useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/')({ component: Home });

const GUIDE_KEY = 'weda-guide-hidden';
/** La guía de bienvenida se puede ocultar y volver a abrir. Es solo una preferencia de pantalla de este navegador. */
function useGuide() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(localStorage.getItem(GUIDE_KEY) === '1'); } catch { /* sin almacenamiento: se muestra */ } }, []);
  const set = (v: boolean) => { setHidden(v); try { localStorage.setItem(GUIDE_KEY, v ? '1' : '0'); } catch { /* idem */ } };
  return [hidden, set] as const;
}

const ACTION: Record<Task['status'], string> = { todo: 'Empezar', doing: 'Seguir', done: 'Editar' };

/* Inicio: qué se está armando, cuánto falta y qué conviene hacer ahora. El avance sale de los datos reales. */
function Home() {
  const s = useAppState();
  const navigate = useNavigate();
  const [hidden, setHidden] = useGuide();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const plan = planById(s.planId);
  const plans = usePlans();
  const r = readiness(s);
  const g = guestStats(s);
  const doneCount = r.tasks.filter(t => t.done).length;

  const detail = (t: Task): string | null => {
    if (t.id === 'regalos') return s.gifts.items.length ? `${s.gifts.items.length} ${s.gifts.items.length === 1 ? 'regalo' : 'regalos'} en tu lista${s.gifts.alias.trim() ? '' : ' · falta tu alias'}` : null;
    if (t.id === 'invitados') return g.total ? `${g.confirmed} confirmaron · ${g.pending} sin responder · ${g.declined} no asisten` : null;
    if (t.id === 'mesas') return s.groups.length ? `${s.groups.length} ${s.groups.length === 1 ? 'grupo' : 'grupos'} · ${g.withoutGroup} sin lugar` : null;
    if (t.id === 'datos') return s.date ? dateLabel(s.date) : 'Todavía sin fecha: podés seguir sin ella';
    return null;
  };

  return (
    <div className="pn-page">
      <header className="pn-page-head">
        <div>
          <p className="pn-kicker">Tu casamiento</p>
          <h1>{coupleLabel(s.couple)}</h1>
          <p className="pn-sub">{s.date ? dateLabel(s.date) : 'Fecha por definir'} · {plan ? `Plan ${plan.name}` : 'Prueba gratuita'}</p>
        </div>
      </header>

      {!hidden && (
        <section className="pn-hints" aria-label="Cómo funciona">
          <ul>
            <li><ListChecks size={18} strokeWidth={1.5} aria-hidden="true" />Completá en el orden que quieras</li>
            <li><Eye size={18} strokeWidth={1.5} aria-hidden="true" />Mirá cómo queda cuando quieras</li>
            <li><HardDrive size={18} strokeWidth={1.5} aria-hidden="true" />Se guarda solo en este dispositivo</li>
          </ul>
          <button type="button" className="pn-icon" onClick={() => setHidden(true)} aria-label="Ocultar este aviso"><X size={16} aria-hidden="true" /></button>
        </section>
      )}

      <section className="pn-section" aria-labelledby="pn-tasks">
        <div className="pn-progress-head">
          <h2 id="pn-tasks">Tu avance</h2>
          <p className="pn-muted" role="status">{doneCount} de {r.tasks.length} pasos completos</p>
        </div>
        <div className="pn-progress" role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={r.tasks.length} aria-valuenow={doneCount}><i style={{ width: `${(doneCount / Math.max(r.tasks.length, 1)) * 100}%` }} /></div>
        <ul className="pn-steps">
          {r.tasks.map(t => {
            const isNext = r.next?.id === t.id;
            const d = detail(t);
            const Icon = t.status === 'done' ? Check : t.status === 'doing' ? CircleDot : Circle;
            const act = t.id === 'datos'
              ? <button type="button" className={`pn-btn is-small${isNext ? '' : ' is-ghost'}`} onClick={() => setEditing(true)}>{ACTION[t.status]}</button>
              : <Link to={t.to as never} className={`pn-btn is-small${isNext ? '' : ' is-ghost'}`}>{ACTION[t.status]}</Link>;
            return (
              <li key={t.id} className={`pn-step is-${t.status}${isNext ? ' is-next' : ''}`}>
                <span className="pn-step-ico" aria-hidden="true"><Icon size={18} strokeWidth={1.7} /></span>
                <div className="pn-step-text">
                  <p className="pn-step-title"><strong>{t.label}</strong>{t.optional && <em> · opcional</em>}<span className={`pn-chip is-${t.status}`}>{STATUS_LABEL_TASK[t.status]}</span></p>
                  <p className="pn-muted">{d ?? t.help}</p>
                  {isNext && <p className="pn-next-tag">Lo que conviene hacer ahora</p>}
                </div>
                {act}
              </li>
            );
          })}
        </ul>
        {!can(s.planId, 'site') && <p className="pn-note">Tu plan incluye la lista de regalos. La página del casamiento, la confirmación de asistencia y los invitados están desde el plan Invitación. <button type="button" className="pn-link" onClick={plans.open}>Ver los planes</button></p>}
        <div className="pn-actions"><Link to="/panel/vista-previa" className="pn-btn"><Eye size={16} aria-hidden="true" />Ver como invitado</Link>{hidden && <button type="button" className="pn-link" onClick={() => setHidden(false)}>¿Cómo funciona?</button>}</div>
      </section>

      <footer className="pn-page-foot">
        <p>Demostración: tus datos se guardan solo en este navegador. <button type="button" className="pn-link" onClick={plans.open}>{plan ? 'Cambiar de plan' : 'Elegir plan para publicar'}</button> · <button type="button" className="pn-link is-muted" onClick={() => setConfirmReset(true)}>Reiniciar la demo</button></p>
      </footer>

      {editing && <CoupleDialog open onClose={() => setEditing(false)} />}
      <ConfirmDialog open={confirmReset} title="¿Reiniciar la demo?" text="Se borran tu evento, la lista de regalos, los invitados y todo lo que cargaste en este navegador. No se puede deshacer." confirmLabel="Sí, reiniciar" onConfirm={() => { setConfirmReset(false); reset(); void navigate({ to: '/crear', replace: true }); }} onCancel={() => setConfirmReset(false)} />
    </div>
  );
}
