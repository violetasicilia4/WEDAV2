import { useEffect } from 'react';
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Eye, Gift, Globe, House, Lock, Users } from 'lucide-react';
import { PlansProvider, SaveStatus, ToastProvider } from '@/components/panel/ui';
import { coupleLabel } from '@/lib/weda/logic';
import { can, planById, type Feature } from '@/lib/weda/plans';
import { useAppSelector, useHydrated, useStorageFull } from '@/lib/weda/store';
import '@/panel.css';

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
/* En escritorio la barra lateral agrupa las secciones con una etiqueta; en el celular es la barra inferior, en el mismo orden. */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'General', items: NAV.slice(0, 1) },
  { label: 'Tu casamiento', items: NAV.slice(1) },
];

/* Migas de pan de la barra superior (solo escritorio): la pareja con su plan y la sección actual. */
function Crumbs({ names, section }: { names: string; section: string }) {
  const planId = useAppSelector(s => s.planId);
  const plan = planById(planId);
  return (
    <nav className="pn-crumbs" aria-label="Ubicación">
      <span className="pn-crumb"><span className="pn-crumb-ico" aria-hidden="true">{names.trim().charAt(0)}</span>{names}<em className="pn-badge">{plan ? plan.name : 'Prueba'}</em></span>
      <span className="pn-crumb-sep" aria-hidden="true">/</span>
      <span className="pn-crumb is-current" aria-current="page">{section}</span>
    </nav>
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
  const section = onPreview ? 'Vista previa' : [...NAV].reverse().find(n => pathname === n.to || pathname.startsWith(`${n.to}/`))?.label ?? 'Inicio';

  // Sin evento no hay panel: se vuelve a crearlo. El plan no hace falta para entrar: se elige al publicar.
  useEffect(() => {
    if (hydrated && !onboarded) void navigate({ to: '/crear', replace: true });
  }, [hydrated, onboarded, navigate]);

  if (!hydrated || !onboarded) return <div className="pn-root"><p className="pn-loading" role="status">Cargando tu evento…</p></div>;

  const names = coupleLabel(couple);

  return (
    <ToastProvider>
      <PlansProvider>
      <div className="pn-root pn-app">
        <a className="skip-link" href="#main">Ir al contenido</a>
        <header className="pn-top">
          <Link to="/panel" className="seed-logo" aria-label="Weda, ir al inicio">Weda<i aria-hidden="true" /></Link>
          <Crumbs names={names} section={section} />
          <SaveStatus />
          {!onPreview && <Link to="/panel/vista-previa" className="pn-btn pn-preview-btn"><Eye size={16} aria-hidden="true" /><span>Ver como invitado</span></Link>}
        </header>

        <aside className="pn-side">
          <Link to="/panel" className="seed-logo pn-side-logo" aria-label="Weda, ir al inicio">Weda<i aria-hidden="true" /></Link>
          <nav aria-label="Secciones del panel" className="pn-nav">
            {NAV_GROUPS.map(g => (
              <div key={g.label} className="pn-nav-group">
                <p className="pn-nav-label" aria-hidden="true">{g.label}</p>
                {g.items.map(n => {
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
            ))}
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
