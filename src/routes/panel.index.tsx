import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Check, CircleDot, Circle, Eye, Lock, Pencil } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { ConfirmDialog, usePlans } from '@/components/panel/ui';
import { headline, nextAction, progress, stages, STAGE_STATUS_LABEL, type Stage } from '@/lib/weda/journey';
import { coupleLabel, dateLabel } from '@/lib/weda/logic';
import { planById, planFor } from '@/lib/weda/plans';
import { reset, useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/')({ component: Home });

const featureOf: Record<Stage['id'], Parameters<typeof planFor>[0] | null> = { regalos: 'gifts', sitio: 'site', invitados: 'guests', publicar: null };

/* Inicio: bienvenida, un único progreso y las cuatro etapas del recorrido. Se puede entrar a cualquiera, en cualquier orden. */
function Home() {
  const s = useAppState();
  const navigate = useNavigate();
  const plans = usePlans();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const plan = planById(s.planId);
  const list = stages(s);
  const pct = progress(list);
  const next = nextAction(s);
  const fresh = pct === 0;

  return (
    <div className="pn-page pn-journey">
      <header className="pn-page-head">
        <div>
          <p className="pn-kicker">Tu casamiento</p>
          <h1>{coupleLabel(s.couple)}</h1>
          <p className="pn-sub">
            {s.date ? dateLabel(s.date) : 'Fecha por definir'} · <button type="button" className="pn-link" onClick={() => setEditing(true)}><Pencil size={12} aria-hidden="true" /> Editar datos</button>
          </p>
        </div>
      </header>

      <section className="pn-welcome" aria-labelledby="pn-welcome-title">
        <h2 id="pn-welcome-title">{fresh ? '¡Empecemos a crear su casamiento!' : headline(pct)}</h2>
        <p>{fresh
          ? 'Armá tu lista de regalos, diseñá tu invitación y organizá a tus invitados. Podés hacerlo a tu ritmo, guardar los cambios y publicar cuando estés listo.'
          : 'Seguí a tu ritmo: todo se guarda solo y podés volver cuando quieras.'}</p>
        <div className="pn-welcome-actions">
          <Link to={next.to as never} className="pn-btn">{fresh ? 'Continuar creando mi casamiento' : next.label}</Link>
          {!fresh && <span className="pn-muted">Lo que conviene hacer ahora</span>}
        </div>
        <div className="pn-progress" role="progressbar" aria-label="Avance general" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%` }} /></div>
        <p className="pn-muted" role="status">{pct}% de tu casamiento armado</p>
      </section>

      <section className="pn-section" aria-labelledby="pn-stages">
        <h2 id="pn-stages" className="pn-sr">Etapas</h2>
        <ol className="pn-stages">
          {list.map(st => {
            const Icon = st.status === 'done' ? Check : st.status === 'todo' ? Circle : CircleDot;
            const isNext = next.stage === st.id;
            const feat = featureOf[st.id];
            const needs = st.locked && feat ? planFor(feat)?.name : null;
            return (
              <li key={st.id} className={`pn-stage is-${st.status}${isNext ? ' is-next' : ''}${st.locked ? ' is-locked' : ''}`}>
                <span className="pn-stage-ico" aria-hidden="true"><Icon size={18} strokeWidth={1.7} /></span>
                <div className="pn-stage-text">
                  <p className="pn-stage-kicker">{st.step}{st.optional && ' · no frena nada'}</p>
                  <h3>{st.title}</h3>
                  <p className="pn-muted">{st.description}</p>
                  <p className="pn-stage-detail">{st.detail}</p>
                  {needs && <p className="pn-note is-inline"><Lock size={13} aria-hidden="true" /> Se publica desde el plan {needs}. Lo que cargues se conserva.</p>}
                </div>
                <div className="pn-stage-side">
                  <span className={`pn-chip is-${st.status}`}>{STAGE_STATUS_LABEL[st.status]}</span>
                  <Link to={st.to as never} className={`pn-btn is-small${isNext ? '' : ' is-ghost'}`}>{st.cta}</Link>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="pn-actions">
          <Link to="/panel/vista-previa" className="pn-btn is-ghost"><Eye size={16} aria-hidden="true" />Ver cómo queda</Link>
          <button type="button" className="pn-btn" onClick={plans.open}>Publicar mi casamiento</button>
        </div>
        <p className="pn-muted">La publicación y el pago todavía no están conectados: hoy podés armar todo, elegir plan y ver el resumen, pero no se publica ni se cobra nada.</p>
      </section>

      <footer className="pn-page-foot">
        <p>Demostración: tus datos se guardan solo en este navegador. {plan ? `Plan ${plan.name}` : 'Sin plan elegido'} · <button type="button" className="pn-link" onClick={plans.open}>{plan ? 'Cambiar de plan' : 'Ver los planes'}</button> · <button type="button" className="pn-link is-muted" onClick={() => setConfirmReset(true)}>Reiniciar la demo</button></p>
      </footer>

      {editing && <CoupleDialog open onClose={() => setEditing(false)} />}
      <ConfirmDialog open={confirmReset} title="¿Reiniciar la demo?" text="Se borran tu evento, la lista de regalos, los invitados y todo lo que cargaste en este navegador. No se puede deshacer." confirmLabel="Sí, reiniciar" onConfirm={() => { setConfirmReset(false); reset(); void navigate({ to: '/crear', replace: true }); }} onCancel={() => setConfirmReset(false)} />
    </div>
  );
}
