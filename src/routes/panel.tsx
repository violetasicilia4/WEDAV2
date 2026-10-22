import { useEffect, useState } from 'react';
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { CircleHelp, Eye, Gift, Globe, Heart, House, Lock, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { SideMenuIcon } from '@/components/panel/side-menu-icon';
import { PlansProvider, PreviewFrame, ToastProvider, usePlans } from '@/components/panel/ui';
import { coupleLabel, publicPages, resolvePhoto, sitePath } from '@/lib/weda/logic';
import { openPreview, OPEN_PREVIEW, type PreviewRequest } from '@/lib/weda/preview-event';
import { can, type Feature } from '@/lib/weda/plans';
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
/* Perfil de la pareja arriba del menú: la misma foto que usa la portada, los nombres y el estado (por ahora siempre borrador: publicar todavía no está conectado).
   Es un enlace a /panel/perfil (datos del casamiento y cuenta). En escritorio va en el menú; en celular, como avatar arriba (`compact`). */
function Profile({ compact = false }: { compact?: boolean }) {
  const photo = useAppSelector(s => s.photo);
  const couple = useAppSelector(s => s.couple);
  const img = <img className="pn-profile-img" src={resolvePhoto(photo)} alt="" />;
  if (compact) return (
    <Link to="/panel/perfil" className="pn-top-avatar" activeProps={{ 'aria-current': 'page' }} aria-label={`Perfil de ${coupleLabel(couple)}`}>
      {img}
      <span className="pn-top-id" aria-hidden="true"><span className="pn-profile-names">{coupleLabel(couple)}</span><span className="pn-profile-meta">Borrador</span></span>
    </Link>
  );
  return (
    <Link to="/panel/perfil" className="pn-profile" activeProps={{ 'aria-current': 'page' }} title="Perfil" aria-label={`Perfil de ${coupleLabel(couple)}`}>
      {img}
      <span className="pn-profile-text">
        <span className="pn-profile-names">{coupleLabel(couple)}</span>
        <span className="pn-profile-meta"><span>Casamiento</span><i aria-hidden="true" /><span>Borrador</span></span>
      </span>
    </Link>
  );
}

/* Vista previa: el micrositio REAL con tus datos, en un pop-up, tal como lo recibe un invitado: invitación, «Regalá» y «Confirmá asistencia» se recorren con la barra del propio micrositio.
   No hay selector de página (la invitación incluye todo). Solo se elige cómo verlo: en compu, web o celular; en el celular, formato celular.
   `req.page` es solo desde dónde abre: «gifts» arranca en la lista de regalos (si el plan no incluye una de las dos páginas, abre la otra). */
function PreviewDialog({ req, onClose }: { req: PreviewRequest; onClose: () => void }) {
  const s = useAppState();
  const pages = publicPages(s.planId);
  const first = req.page === 'home' && !pages.invitation ? 'gifts' : req.page === 'gifts' && !pages.gifts ? 'home' : req.page;
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  const [device, setDevice] = useState<'mobile' | 'desktop'>(wide ? 'desktop' : 'mobile');
  const path = first === 'gifts' ? `${sitePath(s)}/regalos` : sitePath(s);
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      {/* El foco entra al diálogo y no al iframe de la página: así Escape lo cierra y el teclado no queda atrapado dentro de la página embebida. */}
      <DialogContent className={`pn-dialog is-pv is-${device}`} onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }}>
        <DialogTitle>Vista previa</DialogTitle>
        <DialogDescription>Así recibe tu casamiento un invitado, con tus datos. Todavía no está publicada.</DialogDescription>
        {wide && (
          <div className="pn-pv-tools">
            <div className="pn-switch is-small" role="group" aria-label="Cómo verla">
              <button type="button" className={device === 'desktop' ? 'on' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Web</button>
              <button type="button" className={device === 'mobile' ? 'on' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Celular</button>
            </div>
          </div>
        )}
        <PreviewFrame path={path} device={device} {...(first === 'home' && req.anchor !== undefined ? { anchor: req.anchor } : {})} />
      </DialogContent>
    </Dialog>
  );
}

/* «Publicar» abre el diálogo de publicación (los tres productos). Está siempre a mano: arriba a la derecha junto a «Vista previa» y en el menú. */
function PublishButton({ className, children }: { className: string; children: React.ReactNode }) {
  const plans = usePlans();
  return <button type="button" className={className} onClick={plans.open}>{children}</button>;
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
  const planId = useAppSelector(s => s.planId);
  const hydrated = useHydrated();
  const full = useStorageFull();
  const [help, setHelp] = useState(false);
  // Menú lateral (solo en web): abierto o recogido en una columna de íconos. Se recuerda en este navegador.
  const [collapsed, setCollapsed] = useState(() => { try { return typeof window !== 'undefined' && window.localStorage.getItem('weda-side') === 'collapsed'; } catch { return false; } });
  const toggleSide = () => setCollapsed(c => { const next = !c; try { window.localStorage.setItem('weda-side', next ? 'collapsed' : 'open'); } catch { /* sin almacenamiento: queda solo en esta sesión */ } return next; });
  const [pv, setPv] = useState<PreviewRequest | null>(null);
  useEffect(() => {
    const open = (e: Event) => setPv((e as CustomEvent<PreviewRequest>).detail ?? { page: 'home' });
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
      <div className="pn-root pn-app" data-side={collapsed ? 'collapsed' : 'open'}>
        <a className="skip-link" href="#main">Ir al contenido</a>
        <header className="pn-top">
          <Link to="/panel" className="seed-logo" aria-label="Weda, ir al inicio">Weda<i aria-hidden="true" /></Link>
          {/* Vista previa en todas las secciones: abre la página pública en un pop-up. «Regalos» va directo a la lista; el resto, al inicio de la invitación. */}
          <Profile compact />
          <div className="pn-top-actions">
            {!onPreview && <button type="button" className="pn-btn is-ghost pn-preview-btn" onClick={() => openPreview(onGifts ? 'gifts' : 'home')}><Eye size={16} aria-hidden="true" /><span>Vista previa</span></button>}
            <PublishButton className="pn-btn pn-publish-btn"><Heart size={16} aria-hidden="true" /><span>Publicar</span></PublishButton>
          </div>
        </header>

        <aside className="pn-side">
          <div className="pn-side-top">
            <button type="button" className="pn-side-toggle" onClick={toggleSide} aria-expanded={!collapsed} aria-controls="pn-side-nav" aria-label={collapsed ? 'Abrir el menú' : 'Recoger el menú'} title={collapsed ? 'Abrir el menú' : 'Recoger el menú'}><SideMenuIcon /></button>
            <Link to="/panel" className="seed-logo pn-side-logo" aria-label="Weda, ir al inicio">Weda<i aria-hidden="true" /></Link>
          </div>
          <Profile />
          <nav aria-label="Secciones del panel" className="pn-nav" id="pn-side-nav">
            <div className="pn-nav-group">
              {NAV.map(n => {
                const locked = !!n.feature && !can(planId, n.feature);
                return (
                  <Link key={n.to} to={n.to as never} activeOptions={{ exact: !!n.end }} activeProps={{ 'aria-current': 'page' }} className="pn-nav-link" title={n.label}>
                    <n.icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    <span>{n.label}</span>
                    {locked && <><Lock size={13} aria-hidden="true" className="pn-nav-lock" /><span className="pn-sr">(no incluido en tu plan)</span></>}
                  </Link>
                );
              })}
            </div>
          </nav>
          <button type="button" className="pn-side-help" title="Ayuda" onClick={() => setHelp(true)}><CircleHelp size={20} strokeWidth={1.5} aria-hidden="true" /><span>Ayuda</span></button>
        </aside>

        <main id="main" className="pn-main">
          {full && <p className="pn-banner" role="alert">No hay más lugar para guardar fotos en este navegador. Quitá alguna foto: los últimos cambios no se guardaron.</p>}
          <Outlet />
        </main>
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
      {pv && <PreviewDialog key={`${pv.page}-${pv.anchor ?? ''}`} req={pv} onClose={() => setPv(null)} />}
      </PlansProvider>
    </ToastProvider>
  );
}
