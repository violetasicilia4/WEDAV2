import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Eye, Gift, Globe, LayoutGrid, Lock, Pencil, Users } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { ConfirmDialog, CoupleCover } from '@/components/panel/ui';
import { nextAction } from '@/lib/weda/journey';
import { can, planFor, type Feature } from '@/lib/weda/plans';
import { openPreview } from '@/lib/weda/preview-event';
import { reset, useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/')({ component: Home });

/* Inicio en dos secciones: (1) «Lo que vas a publicar» (regalos, página, vista previa) y (2) «Gestión de invitados», aparte y más abajo, porque invitados y mesas no se publican. Sin numeración, sin estados y sin recuentos. «Publicar» no es una tarjeta: es el botón de arriba a la derecha (siempre visible) y el del menú. */
function Home() {
  const s = useAppState();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const next = nextAction(s);

  type Tile = { key: string; title: string; text: string; Icon: typeof Gift; to?: string; search?: Record<string, string>; feature?: Feature; onClick?: () => void };
  /* Lo que arma la página que se publica. */
  const build: Tile[] = [
    { key: 'regalos', title: 'Lista de regalos', text: 'Elegí tus regalos y cómo querés recibirlos.', Icon: Gift, to: '/panel/regalos', feature: 'gifts' },
    { key: 'sitio', title: 'Diseñá tu página', text: 'Armá la invitación que ven tus invitados.', Icon: Globe, to: '/panel/sitio', feature: 'site' },
    { key: 'preview', title: 'Vista previa', text: 'Mirá cómo queda todo antes de compartirlo.', Icon: Eye, onClick: () => openPreview('home') },
  ];
  /* Administración de fondo. No se publica y no hace falta para publicar. */
  const manage: Tile[] = [
    { key: 'invitados', title: 'Invitados', text: 'Cargá tu lista y seguí las confirmaciones.', Icon: Users, to: '/panel/invitados', feature: 'guests' },
    { key: 'mesas', title: 'Mesas y grupos', text: 'Organizá dónde se sienta cada persona.', Icon: LayoutGrid, to: '/panel/invitados', search: { vista: 'mesas' }, feature: 'groups' },
  ];

  const renderTile = ({ title, text, Icon, to, search, feature, onClick }: Tile) => {
    const locked = !!feature && !can(s.planId, feature);
    const body = (
      <>
        <span className="hm-ico" aria-hidden="true"><Icon size={22} strokeWidth={1.5} /></span>
        <span className="hm-text">
          <strong>{title}</strong>
          <span>{text}</span>
          {locked && <em className="hm-tag is-lock"><Lock size={12} aria-hidden="true" /> Desde el plan {planFor(feature)?.name}</em>}
        </span>
        <ArrowRight size={18} className="hm-go" aria-hidden="true" />
      </>
    );
    return to
      ? <Link to={to as never} {...(search ? { search: search as never } : {})} className="hm-tile">{body}</Link>
      : <button type="button" className="hm-tile" onClick={onClick}>{body}</button>;
  };

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

      <section className="hm-path" aria-labelledby="hm-path-title">
        <div className="hm-head">
          <h2 id="hm-path-title">Lo que vas a publicar</h2>
          <p>Armalo en el orden que quieras. Cuando esté listo, publicás desde el botón de arriba.</p>
        </div>
        <ul className="hm-grid">
          {build.map(tile => <li key={tile.key}>{renderTile(tile)}</li>)}
        </ul>
      </section>

      <section className="hm-manage" aria-labelledby="hm-manage-title">
        <div className="hm-head">
          <h2 id="hm-manage-title">Gestión de invitados</h2>
          <p>Esta parte no se publica: es tu panel de administración. Cargá a tu gente cuando quieras y seguí sus confirmaciones.</p>
        </div>
        <ul className="hm-grid">
          {manage.map(tile => <li key={tile.key}>{renderTile(tile)}</li>)}
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
