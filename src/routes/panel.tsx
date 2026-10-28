import { useEffect, useState } from 'react';
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { ChevronDown, CircleHelp, Eye, Gift, Globe, Heart, House, Lock, Mail, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { SideMenuIcon } from '@/components/panel/side-menu-icon';
import { PlansProvider, PreviewFrame, ToastProvider, usePlans } from '@/components/panel/ui';
import { coupleLabel, publicPages, resolvePhoto, sitePath } from '@/lib/weda/logic';
import { openPreview, OPEN_PREVIEW, type PreviewRequest } from '@/lib/weda/preview-event';
import { can, formatPrice, PLANS, PUBLICATION_TERM, type Feature } from '@/lib/weda/plans';
import { ensureRemote, errorText, hasUnsaved, dismissNotice, reloadFromServer, retrySave, useRemote } from '@/lib/weda/remote';
import { useAppSelector, useAppState, useHydrated, useStorageFull } from '@/lib/weda/store';
import { isLive } from '@/lib/weda/payments';
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
/* Perfil de la pareja arriba del menú: la misma foto que usa la portada, los nombres y el estado (Borrador o Publicada, según el pago simulado).
   Es un enlace a /panel/perfil (datos del casamiento y cuenta). En escritorio va en el menú; en celular, como avatar arriba (`compact`). */
function Profile({ compact = false }: { compact?: boolean }) {
  const photo = useAppSelector(s => s.photo);
  const couple = useAppSelector(s => s.couple);
  const status = useAppSelector(s => isLive(s)) ? 'Publicada' : 'Borrador';
  const img = <img className="pn-profile-img" src={resolvePhoto(photo)} alt="" />;
  if (compact) return (
    <Link to="/panel/perfil" className="pn-top-avatar" activeProps={{ 'aria-current': 'page' }} aria-label={`Perfil de ${coupleLabel(couple)}`}>
      {img}
      <span className="pn-top-id" aria-hidden="true"><span className="pn-profile-names">{coupleLabel(couple)}</span><span className="pn-profile-meta">{status}</span></span>
    </Link>
  );
  return (
    <Link to="/panel/perfil" className="pn-profile" activeProps={{ 'aria-current': 'page' }} title="Perfil" aria-label={`Perfil de ${coupleLabel(couple)}`}>
      {img}
      <span className="pn-profile-text">
        <span className="pn-profile-names">{coupleLabel(couple)}</span>
        <span className="pn-profile-meta"><span>Casamiento</span><i aria-hidden="true" /><span>{status}</span></span>
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

function PublishLabel() {
  const state = useAppState();
  const live = isLive(state);
  const down = !!state.publication && !live;
  return <><Heart size={16} aria-hidden="true" /><span>{live ? 'Publicada' : down ? 'Despublicada' : 'Publicar'}</span></>;
}

/* Ayuda: preguntas frecuentes (cada respuesta se abre al tocar la pregunta) y el correo de consultas. Precios y duración salen de `plans.ts`.
   Respuestas definidas por la dueña (2026-10-28). */
function HelpDialog({ onClose }: { onClose: () => void }) {
  const prices = PLANS.map(p => `${p.name} ${formatPrice(p.price)}`).join(', ');
  const faq: [string, string][] = [
    ['¿Cuánto cuesta y cuándo pago?', `Armás todo gratis y pagás una sola vez, al publicar: ${prices}. Es un pago único y la página queda publicada ${PUBLICATION_TERM}.`],
    ['¿Puedo cambiar de plan después de publicar?', 'Sí, a un plan más completo: pagás solo la diferencia. No se puede pasar a un plan más económico.'],
    ['¿Cómo comparto la invitación?', 'Al publicar se genera el link de tu página. Lo podés mandar a todos tus contactos.'],
    ['¿Cómo recibo los regalos?', 'Cargás el alias de tu cuenta en Regalos → Datos de cobro. Tus invitados eligen un regalo, te transfieren directo a esa cuenta y adjuntan el comprobante. No hay comisión: el dinero va directo a tu banco y podés validar cada regalo con su comprobante.'],
    ['¿Dónde veo los regalos que recibí?', 'En Regalos → Aportes recibidos: quién te hizo el regalo, qué regalos eligió (puede ser más de uno), el monto, la fecha y el comprobante.'],
    ['¿Puedo editar la invitación después de publicarla?', 'Sí. Mientras la página esté publicada, la podés editar cuando quieras.'],
    ['¿Cuánto tiempo queda online la página?', `${PUBLICATION_TERM[0]!.toUpperCase()}${PUBLICATION_TERM.slice(1)} desde que la publicás.`],
  ];
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="pn-dialog">
        <DialogTitle>Ayuda</DialogTitle>
        <DialogDescription>Preguntas frecuentes</DialogDescription>
        <div className="pn-faq">
          {faq.map(([q, a]) => (
            <details key={q}>
              <summary>{q}<ChevronDown size={18} aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <p className="pn-contact"><Mail size={16} aria-hidden="true" /><span>¿Necesitás ayuda? Escribinos a <a className="pn-link" href="mailto:hola@weda.app">hola@weda.app</a></span></p>
        <div className="pn-actions is-end"><button type="button" className="pn-btn" onClick={onClose}>Entendido</button></div>
      </DialogContent>
    </Dialog>
  );
}

/* Estado del guardado en la cuenta: nunca dice «guardado» sin que el servidor lo haya confirmado. Sin sesión no muestra nada (modo demostración). */
function SyncBanner() {
  const r = useRemote();
  if (r.save === 'conflict') return (
    <p className="pn-banner" role="alert">{errorText('revision_conflict')} Para no pisar esos cambios, dejamos de guardar acá. <button type="button" className="pn-link" onClick={() => { void reloadFromServer(); }}>Recargar lo guardado</button></p>
  );
  if (r.save === 'error') return (
    <p className="pn-banner" role="alert">No pudimos guardar tus últimos cambios en tu cuenta ({errorText(r.error)}) Siguen en este navegador y vamos a reintentar. <button type="button" className="pn-link" onClick={retrySave}>Reintentar ahora</button></p>
  );
  if (r.notice) return <p className="pn-banner is-info" role="status">{r.notice} <button type="button" className="pn-link" onClick={dismissNotice}>Entendido</button></p>;
  if (r.user) return <p className="pn-sr" role="status" aria-live="polite">{r.save === 'saving' ? 'Guardando…' : r.save === 'saved' ? 'Cambios guardados en tu cuenta' : ''}</p>;
  return null;
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
  // Primero se sabe si hay sesión (y se trae el casamiento de la cuenta): recién ahí se decide si falta crearlo.
  const remote = useRemote();
  useEffect(() => { void ensureRemote(); }, []);
  useEffect(() => {
    if (hydrated && remote.settled && !onboarded) void navigate({ to: '/crear', replace: true });
  }, [hydrated, remote.settled, onboarded, navigate]);
  // Cambios sin confirmar por el servidor: avisa antes de cerrar la pestaña.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (hasUnsaved()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (!hydrated || !remote.settled || !onboarded) return <div className="pn-root"><p className="pn-loading" role="status">Cargando tu evento…</p></div>;

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
            <PublishButton className="pn-btn pn-publish-btn"><PublishLabel /></PublishButton>
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
          <SyncBanner />
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
