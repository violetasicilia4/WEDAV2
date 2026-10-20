import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Gift, Globe, Lock, Pencil, Users } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { ConfirmDialog, CoupleCover, usePlans } from '@/components/panel/ui';
import { formatARS } from '@/lib/demo-wedding';
import { eventComplete, nextAction, sectionGaps, stages, type Stage, type StageStatus } from '@/lib/weda/journey';
import { giftTotal } from '@/lib/weda/logic';
import { formatPrice, planById, planFor, PRICE_UNIT } from '@/lib/weda/plans';
import { reset, useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/')({ component: Home });

const featureOf: Record<Stage['id'], Parameters<typeof planFor>[0] | null> = { regalos: 'gifts', sitio: 'site', invitados: 'guests', publicar: null };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const TONE: Record<StageStatus, 'ok' | 'todo' | 'off'> = { done: 'ok', review: 'todo', doing: 'todo', todo: 'off' };

/* Inicio: la pareja, cuántos pasos de armado están listos (se cuentan, no se estiman), UN siguiente paso y accesos directos. Se puede entrar a cualquiera, en cualquier orden. */
function Home() {
  const s = useAppState();
  const plans = usePlans();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const list = stages(s);
  const build = list.filter(x => x.id !== 'publicar' && !x.locked);
  const done = build.filter(x => x.status === 'done').length;
  const next = nextAction(s);
  const stage = (id: Stage['id']) => list.find(x => x.id === id)!;
  const gaps = sectionGaps(s);
  const eventsDone = s.site.events.filter(eventComplete).length;
  const confirmed = s.guests.filter(g => g.status === 'confirmed').length;
  const tiles = [
    { st: stage('sitio'), label: 'Invitación', Icon: Globe, to: '/panel/sitio',
      sub: eventsDone === 0 && gaps.length > 0 ? 'Cargá la ceremonia y el lugar' : gaps.length > 0 ? `Falta: ${gaps[0]!.label}${gaps.length > 1 ? ` y ${gaps.length - 1} más` : ''}` : eventsDone > 0 ? plural(eventsDone, 'evento listo', 'eventos listos') : 'Sin empezar' },
    { st: stage('regalos'), label: 'Regalos', Icon: Gift, to: '/panel/regalos',
      sub: s.gifts.items.length === 0 ? 'Sin regalos todavía' : `${plural(s.gifts.items.length, 'regalo', 'regalos')} · ${formatARS(giftTotal(s.gifts.items))}` },
    { st: stage('invitados'), label: 'Invitados', Icon: Users, to: '/panel/invitados',
      sub: s.guests.length === 0 ? 'Sin invitados todavía' : `${s.guests.length} · ${plural(confirmed, 'confirmó', 'confirmaron')}` },
  ];

  const stats = [
    { n: confirmed, label: 'Confirmados', sub: s.guests.length > 0 ? `de ${s.guests.length} invitados` : 'Sin invitados' },
    { n: s.gifts.items.length, label: 'Regalos', sub: s.gifts.items.length > 0 ? formatARS(giftTotal(s.gifts.items)) : 'Sin regalos' },
    { n: done, label: 'Pasos listos', sub: build.length > 0 ? `de ${build.length}` : 'Elegí un plan' },
  ];

  return (
    <div className="pn-page pn-journey">
      <CoupleCover eyebrow="Tu casamiento">
        <button type="button" className="pn-btn is-small" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden="true" /> Editar datos</button>
      </CoupleCover>

      <ul className="pn-kpis" aria-label="Resumen">
        {stats.map(x => (
          <li key={x.label} className="pn-kpi">
            <span className="pn-kpi-label">{x.label}</span>
            <strong className="num">{x.n}</strong>
            <span className="pn-kpi-sub">{x.sub}</span>
          </li>
        ))}
      </ul>

      <section className="pn-next" aria-labelledby="pn-next-title">
        <p className="pn-label-s">Siguiente paso</p>
        <h2 id="pn-next-title">{next.title}</h2>
        <p className="pn-muted">{next.text}</p>
        <Link to={next.to as never} {...(next.search ? { search: next.search as never } : {})} className="pn-btn">{next.cta}<ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      <section className="pn-state" aria-labelledby="pn-state-title">
        <div className="pn-state-head">
          <h2 id="pn-state-title">Tu evento</h2>
          <p role="status">{build.length === 0 ? 'Elegí un plan para empezar' : `${done} de ${build.length} ${build.length === 1 ? 'paso listo' : 'pasos listos'}`}</p>
        </div>
        <div className="pn-segs" aria-hidden="true">{build.map(x => <i key={x.id} className={`is-${x.status}`} />)}</div>
        <ul className="pn-tiles">
          {tiles.map(({ st, label, Icon, to, sub }) => (
            <li key={st.id}>
              <Link to={to as never} className={`pn-tile${st.locked ? ' is-locked' : ''}`}>
                <span className="pn-tile-ico" aria-hidden="true"><Icon size={20} strokeWidth={1.5} /></span>
                <span className="pn-tile-text">
                  <strong>{label}</strong>
                  <span>{st.locked ? <><Lock size={12} aria-hidden="true" /> Desde el plan {planFor(featureOf[st.id]!)?.name}</> : sub}</span>
                </span>
                {!st.locked && <i className={`pn-sdot is-${TONE[st.status]}`} aria-hidden="true" />}
                <span className="pn-sr">{st.locked ? '' : ` · ${st.status === 'done' ? 'Completo' : st.status === 'todo' ? 'Sin empezar' : 'En progreso'}`}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="pn-pubstate">
          <div>
            <p className="pn-label-s">Publicación</p>
            <p><strong>Borrador</strong> · {s.planId ? `Plan ${planById(s.planId)?.name}, ${formatPrice(planById(s.planId)!.price)} ${PRICE_UNIT}` : 'Todavía no elegiste plan: probás todo gratis'}</p>
            <p className="pn-hint">El plan se elige al publicar. Hoy es una demo: no se publica ni se cobra nada.</p>
          </div>
          <button type="button" className="pn-btn is-ghost" onClick={plans.open}>Ver planes y publicar</button>
        </div>
      </section>

      <footer className="pn-page-foot">
        <p>Tus datos se guardan solo en este navegador. <button type="button" className="pn-link is-muted" onClick={() => setConfirmReset(true)}>Reiniciar la demo</button></p>
      </footer>

      {editing && <CoupleDialog open onClose={() => setEditing(false)} />}
      <ConfirmDialog open={confirmReset} title="¿Reiniciar la demo?" text="Se borran tu evento, la lista de regalos, los invitados y todo lo que cargaste en este navegador. No se puede deshacer." confirmLabel="Sí, reiniciar" onConfirm={() => { setConfirmReset(false); reset(); void navigate({ to: '/crear', replace: true }); }} onCancel={() => setConfirmReset(false)} />
    </div>
  );
}
