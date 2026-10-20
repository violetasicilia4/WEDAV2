import { useEffect } from 'react';
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Eye, Gift, Globe, House, Lock, Users } from 'lucide-react';
import { PlansProvider, ToastProvider } from '@/components/panel/ui';
import { coupleLabel, resolvePhoto } from '@/lib/weda/logic';
import { can, planById, type Feature } from '@/lib/weda/plans';
import { useAppSelector, useHydrated, useStorageFull } from '@/lib/weda/store';
import '@/panel.css';

/** Evento con el que el botón de arriba le pide a «Regalos» que abra la vista previa de la lista. */
export const OPEN_GIFTS_PREVIEW = 'weda:open-gifts-preview';

export const Route = createFileRoute('/panel')({
  head: () => ({
    meta: [
      { title: 'Mi evento • Weda' },
      // Panel de una demo con datos locales: no debe indexarse.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: PanelLayout,
});

type NavItem = { to: string; label: string; icon: typeof House; feature?: Feature; end?: boolean };
const NAV: NavItem[] = [
  { to: '/panel', label: 'Inicio', icon: House, end: true },
  { to: '/panel/regalos', label: 'Regalos', icon: Gift, feature: 'gifts' },
  { to: '/panel/invitados', label: 'Invitados', icon: Users, feature: 'guests' },
  { to: '/panel/sitio', label: 'Tu página', icon: Globe, feature: 'site' },
];
/* Perfil de la pareja arriba del menú: la misma foto que usa la portada, los nombres y el estado (por ahora siempre borrador: publicar todavía no está conectado). Solo en escritorio. */
function Profile() {
  const photo = useAppSelector(s => s.photo);
  const couple = useAppSelector(s => s.couple);
  return (
    <div className="pn-profile">
      <img className="pn-profile-img" src={resolvePhoto(photo)} alt="" />
      <div className="pn-profile-text">
        <p className="pn-profile-names">{coupleLabel(couple)}</p>
        <p className="pn-profile-meta"><span>Casamiento</span><i aria-hidden="true" /><span>Borrador</span></p>
      </div>
    </div>
  );
}

function PanelLayout() {
  const navigate = useNavigate();
  // Solo lo que usa el contenedor: así escribir en el editor o los invitados no lo vuelve a dibujar.
  const onboarded = useAppSelector(s => s.onboarded);
  const couple = useAppSelector(s => s.couple);
  const planId = useAppSelector(s => s.planId);
  const hydrated = useHydrated();
  const full = useStorageFull();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const onPreview = pathname === '/panel/vista-previa';
  const onGifts = pathname === '/panel/regalos';

  // Sin evento no hay panel: se vuelve a crearlo. El plan no hace falta para entrar: se elige al publicar.
  useEffect(() => {
    if (hydrated && !onboarded) void navigate({ to: '/crear', replace: true });
  }, [hydrated, onboarded, navigate]);

  if (!hydrated || !onboarded) return <div className="pn-root"><p className="pn-loading" role="status">Cargando tu evento…</p></div>;

  return (
    <ToastProvider>
      <PlansProvider>
      <div className="pn-root pn-app">
        <a className="skip-link" href="#main">Ir al contenido</a>
        <header className="pn-top">
          <Link to="/panel" className="seed-logo" aria-label="Weda, ir al inicio">Weda<i aria-hidden="true" /></Link>
          {/* Un solo botón arriba: en «Regalos» abre la vista previa de la lista; en el resto, la vista de invitado. */}
          {!onPreview && (onGifts
            ? <button type="button" className="pn-btn pn-preview-btn" onClick={() => window.dispatchEvent(new Event(OPEN_GIFTS_PREVIEW))}><Eye size={16} aria-hidden="true" /><span>Vista previa de la lista</span></button>
            : <Link to="/panel/vista-previa" className="pn-btn pn-preview-btn"><Eye size={16} aria-hidden="true" /><span>Ver como invitado</span></Link>)}
        </header>

        <aside className="pn-side">
          <Link to="/panel" className="seed-logo pn-side-logo" aria-label="Weda, ir al inicio">Weda<i aria-hidden="true" /></Link>
          <Profile />
          <nav aria-label="Secciones del panel" className="pn-nav">
            <div className="pn-nav-group">
              {NAV.map(n => {
                const locked = !!n.feature && !can(planId, n.feature);
                return (
                  <Link key={n.to} to={n.to as never} activeOptions={{ exact: !!n.end }} activeProps={{ 'aria-current': 'page' }} className="pn-nav-link">
                    <n.icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    <span>{n.label}</span>
                    {locked && <><Lock size={13} aria-hidden="true" className="pn-nav-lock" /><span className="pn-sr">(no incluido en tu plan)</span></>}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        <main id="main" className="pn-main">
          {full && <p className="pn-banner" role="alert">No hay más lugar para guardar fotos en este navegador. Quitá alguna foto: los últimos cambios no se guardaron.</p>}
          <Outlet />
        </main>
      </div>
      </PlansProvider>
    </ToastProvider>
  );
}
