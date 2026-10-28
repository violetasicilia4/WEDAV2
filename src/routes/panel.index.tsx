import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, ChevronRight, Gift, Globe, LayoutGrid, Lock, Send, Users } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { GetStarted } from '@/components/panel/get-started';
import { usePlans } from '@/components/panel/ui';
import { coupleLabel, isSamplePhoto, photoPosition, resolvePhoto } from '@/lib/weda/logic';
import { can, planFor, type Feature } from '@/lib/weda/plans';
import { useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/')({
  // «?editar=datos» abre «Datos del casamiento» al entrar (lo usa el pendiente «Definí la fecha» del diálogo de publicar).
  validateSearch: (q: Record<string, unknown>): { editar?: 'datos' } => (q['editar'] === 'datos' ? { editar: 'datos' } : {}),
  component: Home,
});

/* Inicio (diseño de la dueña, 2026-10-28): encabezado con los nombres y la foto de la pareja, los tres pasos (regalos → sitio → publicación)
   con el paso actual destacado, dos accesos («Diseñá tu invitación», «Elegí qué publicar») y, separadas, las herramientas que no se publican. */
function Home() {
  const s = useAppState();
  const plans = usePlans();
  const navigate = useNavigate();
  const { editar } = Route.useSearch();
  const [editing, setEditing] = useState(editar === 'datos');
  // Ya estando en el Inicio (por ejemplo, desde el diálogo de publicar) el parámetro cambia sin montar la pantalla de nuevo: se abre igual.
  useEffect(() => { if (editar === 'datos') setEditing(true); }, [editar]);
  const closeEditing = () => { setEditing(false); if (editar) void navigate({ to: '/panel', search: {}, replace: true }); };

  type Tile = { key: string; title: string; text: string; Icon: typeof Gift; tone?: string; to?: string; search?: Record<string, string>; feature?: Feature; onClick?: () => void };
  /* Accesos a lo que se publica (además de los pasos). */
  const build: Tile[] = [
    { key: 'sitio', title: 'Diseñá tu invitación', text: 'Personalizá tu página con fotos, información y todos los detalles de tu día.', Icon: Globe, tone: 'sage', to: '/panel/sitio', feature: 'site' },
    { key: 'publicar', title: 'Elegí qué publicar', text: 'Cuando esté lista, elegí si querés publicar solo la lista de regalos o el sitio completo. Vas a ver los planes y precios antes de confirmar.', Icon: Send, tone: 'sky', onClick: plans.open },
  ];
  /* Administración de fondo. No se publica y no hace falta para publicar. */
  const manage: Tile[] = [
    { key: 'invitados', title: 'Invitados', text: 'Cargá tu lista y seguí las confirmaciones.', Icon: Users, to: '/panel/invitados', feature: 'guests' },
    { key: 'mesas', title: 'Mesas y grupos', text: 'Organizá dónde se sienta cada persona.', Icon: LayoutGrid, to: '/panel/invitados', search: { vista: 'mesas' }, feature: 'groups' },
  ];

  const renderTile = ({ title, text, Icon, tone, to, search, feature, onClick }: Tile) => {
    const locked = !!feature && !can(s.planId, feature);
    const body = (
      <>
        <span className={`hm-ico${tone ? ` is-${tone}` : ''}`} aria-hidden="true"><Icon size={22} strokeWidth={1.5} /></span>
        <span className="hm-text">
          <strong>{title}</strong>
          <span>{text}</span>
          {locked && <em className="hm-tag is-lock"><Lock size={12} aria-hidden="true" /> Desde el plan {planFor(feature)?.name}</em>}
        </span>
        <ArrowRight size={18} className="hm-go is-arrow" aria-hidden="true" />
        <ChevronRight size={20} className="hm-go is-chev" aria-hidden="true" />
      </>
    );
    return to
      ? <Link to={to as never} {...(search ? { search: search as never } : {})} className="hm-tile">{body}</Link>
      : <button type="button" className="hm-tile" onClick={onClick}>{body}</button>;
  };

  return (
    <div className="pn-page pn-journey hx-home">
      <header className="hx-hero">
        <div className="hx-hero-copy">
          <p className="hx-kicker">Tu casamiento · {coupleLabel(s.couple)}</p>
          <h1>Bienvenidos</h1>
          <p>Armá tu lista de regalos, diseñá tu sitio y elegí qué publicar cuando esté listo.</p>
        </div>
        <div className="hx-hero-photo" aria-hidden="true">
          <img src={resolvePhoto(s.photo)} alt="" style={{ objectPosition: photoPosition(s.photo) }} data-sample={isSamplePhoto(s.photo) ? '' : undefined} />
        </div>
      </header>

      <GetStarted />

      <section className="hm-path" aria-labelledby="hm-path-title">
        <h2 id="hm-path-title" className="pn-sr">Accesos rápidos</h2>
        <ul className="hm-grid">
          {build.map(tile => <li key={tile.key}>{renderTile(tile)}</li>)}
        </ul>
      </section>

      <section className="hm-manage" aria-labelledby="hm-manage-title">
        <div className="hm-head">
          <h2 id="hm-manage-title">Herramientas adicionales</h2>
        </div>
        <ul className="hm-grid">
          {manage.map(tile => <li key={tile.key}>{renderTile(tile)}</li>)}
        </ul>
      </section>

      {editing && <CoupleDialog open onClose={closeEditing} />}
    </div>
  );
}
