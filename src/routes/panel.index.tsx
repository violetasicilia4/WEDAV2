import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Eye, Gift, Globe, LayoutGrid, Lock, Pencil, Rocket, Users } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { ConfirmDialog, CoupleCover, usePlans } from '@/components/panel/ui';
import { nextAction, stages, STAGE_STATUS_LABEL, type Stage } from '@/lib/weda/journey';
import { can, formatPrice, planById, planFor, PRICE_UNIT, type Feature } from '@/lib/weda/plans';
import { openPreview } from '@/lib/weda/preview-event';
import { reset, useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/')({ component: Home });

/* Inicio: la pareja (foto y datos principales), UN siguiente paso y un panel de lugares a los que ir. Sin recuentos: acá se decide adónde seguir. Se puede entrar a cualquiera, en cualquier orden. */
function Home() {
  const s = useAppState();
  const plans = usePlans();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const list = stages(s);
  const stage = (id: Stage['id']) => list.find(x => x.id === id)!;
  const next = nextAction(s);
  const plan = planById(s.planId);

  type Tile = { key: string; title: string; text: string; Icon: typeof Gift; to?: string; search?: Record<string, string>; feature?: Feature; status?: Stage | undefined; onClick?: () => void; note?: string };
  const tiles: Tile[] = [
    { key: 'regalos', title: 'Lista de regalos', text: 'Elegí tus regalos y cómo querés recibirlos.', Icon: Gift, to: '/panel/regalos', feature: 'gifts', status: stage('regalos') },
    { key: 'sitio', title: 'Tu página', text: 'Diseñá la invitación que ven tus invitados.', Icon: Globe, to: '/panel/sitio', feature: 'site', status: stage('sitio') },
    { key: 'invitados', title: 'Invitados', text: 'Cargá tu lista y seguí las confirmaciones.', Icon: Users, to: '/panel/invitados', feature: 'guests', status: stage('invitados') },
    { key: 'mesas', title: 'Mesas y grupos', text: 'Organizá dónde se sienta cada persona.', Icon: LayoutGrid, to: '/panel/invitados', search: { vista: 'mesas' }, feature: 'groups' },
    { key: 'preview', title: 'Vista previa', text: 'Mirá cómo queda todo antes de compartirlo.', Icon: Eye, onClick: () => openPreview('home') },
    { key: 'publicar', title: 'Publicar', text: plan ? `Plan ${plan.name} · ${formatPrice(plan.price)} ${PRICE_UNIT}. Revisá qué se publica.` : 'Elegí tu plan y mirá qué se publica. Hoy es una demo: no se cobra nada.', Icon: Rocket, onClick: plans.open },
  ];

  return (
    <div className="pn-page pn-journey">
      <CoupleCover eyebrow="Tu casamiento">
        <button type="button" className="pn-btn is-small" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden="true" /> Editar datos</button>
      </CoupleCover>

      <section className="pn-next" aria-labelledby="pn-next-title">
        <p className="pn-label-s">Siguiente paso</p>
        <h2 id="pn-next-title">{next.title}</h2>
        <p className="pn-muted">{next.text}</p>
        <Link to={next.to as never} {...(next.search ? { search: next.search as never } : {})} className="pn-btn">{next.cta}<ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      <section className="hm-places" aria-labelledby="hm-places-title">
        <h2 id="hm-places-title">Adónde querés ir</h2>
        <ul className="hm-grid">
          {tiles.map(({ key, title, text, Icon, to, search, feature, status, onClick }) => {
            const locked = !!feature && !can(s.planId, feature);
            const body = (
              <>
                <span className="hm-ico" aria-hidden="true"><Icon size={22} strokeWidth={1.5} /></span>
                <span className="hm-text">
                  <strong>{title}</strong>
                  <span>{text}</span>
                  {locked
                    ? <em className="hm-tag is-lock"><Lock size={12} aria-hidden="true" /> Desde el plan {planFor(feature)?.name}</em>
                    : status && status.status !== 'todo' ? <em className={`hm-tag${status.status === 'done' ? ' is-ok' : ''}`}>{STAGE_STATUS_LABEL[status.status]}</em> : null}
                </span>
                <ArrowRight size={18} className="hm-go" aria-hidden="true" />
              </>
            );
            return (
              <li key={key}>
                {to
                  ? <Link to={to as never} {...(search ? { search: search as never } : {})} className="hm-tile">{body}</Link>
                  : <button type="button" className="hm-tile" onClick={onClick}>{body}</button>}
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="pn-page-foot">
        <p>Tus datos se guardan solo en este navegador. <button type="button" className="pn-link is-muted" onClick={() => setConfirmReset(true)}>Reiniciar la demo</button></p>
      </footer>

      {editing && <CoupleDialog open onClose={() => setEditing(false)} />}
      <ConfirmDialog open={confirmReset} title="¿Reiniciar la demo?" text="Se borran tu evento, la lista de regalos, los invitados y todo lo que cargaste en este navegador. No se puede deshacer." confirmLabel="Sí, reiniciar" onConfirm={() => { setConfirmReset(false); reset(); void navigate({ to: '/crear', replace: true }); }} onCancel={() => setConfirmReset(false)} />
    </div>
  );
}
