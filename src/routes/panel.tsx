import { useEffect, useState } from 'react';
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { CircleHelp, Eye, Gift, Globe, House, Lock, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PlansProvider, PreviewFrame, ToastProvider } from '@/components/panel/ui';
import { coupleLabel, publicPages, resolvePhoto, sitePath } from '@/lib/weda/logic';
import { openPreview, OPEN_PREVIEW, type PreviewPage } from '@/lib/weda/preview-event';
import { can, planById, type Feature } from '@/lib/weda/plans';
import { useAppSelector, useAppState, useHydrated, useStorageFull } from '@/lib/weda/store';
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
  { to: '/panel/sitio', label: 'Tu página', icon: Globe, feature: 'site' },
  { to: '/panel/invitados', label: 'Invitados', icon: Users, feature: 'guests' },
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

/* Vista previa: la página pública REAL con tus datos, en un pop-up. En compu se ve en formato web (con opción de ver el celular); en el celular, en formato celular.
   Se abre siempre arriba de la página que corresponde: «home» = inicio de la invitación, «gifts» = lista de regalos. Si el plan no incluye una de las dos, muestra la otra. */
function PreviewDialog({ page: first, onClose }: { page: PreviewPage; onClose: () => void }) {
  const s = useAppState();
  const pages = publicPages(s.planId);
  const [page, setPage] = useState<PreviewPage>(first === 'home' && !pages.invitation ? 'gifts' : first === 'gifts' && !pages.gifts ? 'home' : first);
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  const [device, setDevice] = useState<'mobile' | 'desktop'>(wide ? 'desktop' : 'mobile');
  const path = page === 'gifts' ? `${sitePath(s)}/regalos` : sitePath(s);
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className={`pn-dialog is-pv is-${device}`}>
        <DialogTitle>Vista previa</DialogTitle>
        <DialogDescription>Así la ven tus invitados, con tus datos. Todavía no está publicada.</DialogDescription>
        <div className="pn-pv-tools">
          {pages.invitation && pages.gifts && (
            <div className="pn-switch is-small" role="group" aria-label="Qué página ver">
              <button type="button" className={page === 'home' ? 'on' : ''} aria-pressed={page === 'home'} onClick={() => setPage('home')}>Invitación</button>
              <button type="button" className={page === 'gifts' ? 'on' : ''} aria-pressed={page === 'gifts'} onClick={() => setPage('gifts')}>Lista de regalos</button>
            </div>
          )}
          {wide && (
            <div className="pn-switch is-small" role="group" aria-label="Cómo verla">
              <button type="button" className={device === 'desktop' ? 'on' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Web</button>
              <button type="button" className={device === 'mobile' ? 'on' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Celular</button>
            </div>
          )}
        </div>
        <PreviewFrame path={path} device={device} />
      </DialogContent>
    </Dialog>
  );
}

/* Ayuda: explica lo que Weda hace hoy, sin prometer lo que todavía no está conectado. */
function HelpDialog({ onClose }: { onClose: () => void }) {
  const tips: [string, string][] = [
    ['Tu página', 'Es la invitación que ven tus invitados. Completá los datos, mirá cómo queda y volvé a editar cuando quieras.'],
    ['Regalos', 'Elegí packs o regalos sueltos, o creá los tuyos. Cargá cómo querés recibir los aportes desde «Datos de cobro».'],
    ['Invitados', 'Cargalos de a uno o importá una planilla de Excel. Después organizalos en mesas y grupos.'],
    ['Publicar', 'Armás todo gratis. El plan se elige al publicar y cambiar de plan no borra lo que cargaste.'],
  ];
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="pn-dialog">
        <DialogTitle>Ayuda</DialogTitle>
        <DialogDescription>Cómo se arma tu casamiento en Weda.</DialogDescription>
        <dl className="pn-help">{tips.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
        <p className="pn-note">Hoy es una demo: tus datos se guardan solo en este navegador y no se publica ni se cobra nada.</p>
        <div className="pn-actions is-end"><button type="button" className="pn-btn" onClick={onClose}>Entendido</button></div>
      </DialogContent>
    </Dialog>
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
  const [help, setHelp] = useState(false);
  const [pv, setPv] = useState<PreviewPage | null>(null);
  useEffect(() => {
    const open = (e: Event) => setPv((e as CustomEvent<{ page: PreviewPage }>).detail?.page ?? 'home');
    window.addEventListener(OPEN_PREVIEW, open);
    return () => window.removeEventListener(OPEN_PREVIEW, open);
  }, []);
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
          {/* Vista previa en todas las secciones: abre la página pública en un pop-up. «Regalos» va directo a la lista; el resto, al inicio de la invitación. */}
          {!onPreview && <button type="button" className="pn-btn pn-preview-btn" onClick={() => openPreview(onGifts ? 'gifts' : 'home')}><Eye size={16} aria-hidden="true" /><span>Vista previa</span></button>}
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
          <button type="button" className="pn-side-help" onClick={() => setHelp(true)}><CircleHelp size={20} strokeWidth={1.5} aria-hidden="true" /><span>Ayuda</span></button>
        </aside>

        <main id="main" className="pn-main">
          {full && <p className="pn-banner" role="alert">No hay más lugar para guardar fotos en este navegador. Quitá alguna foto: los últimos cambios no se guardaron.</p>}
          <Outlet />
        </main>
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
      {pv && <PreviewDialog key={pv} page={pv} onClose={() => setPv(null)} />}
      </PlansProvider>
    </ToastProvider>
  );
}
