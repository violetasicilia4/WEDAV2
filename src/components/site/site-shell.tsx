// Estructura común de la página pública de un casamiento (la de /ejemplo y la de cada pareja):
// barra de arriba, contenido, pie y el formulario de confirmación. Lee todo de useSite().
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { CalendarCheck, Gift, Mail, Menu, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { RsvpProvider, useRsvp } from '@/components/rsvp-dialog';
import { useSite } from '@/lib/weda/site-model';
import '@/demo.css';
import '@/ejemplo.css';
import '@/invitacion.css';

// `to` recibe rutas dinámicas (/sitio/tomas-y-martina): el router solo conoce los patrones, no cada valor.
const to = (path: string) => path as never;

// true cuando la página se muestra dentro de la vista previa del panel (un iframe): ahí no hace falta el botón de salir.
const useEmbedded = () => useSyncExternalStore(() => () => {}, () => window.self !== window.top, () => false);

// Navegación de arriba, como en la landing: texto sobre la foto y, al scrollear, una burbuja de cristal que queda pegada arriba.
function SiteNav() {
  const rsvp = useRsvp();
  const site = useSite();
  const ref = useRef<HTMLElement>(null);
  const embedded = useEmbedded();
  // Mobile: las secciones viven detrás de un botón de tres líneas (arriba a la derecha) y se despliegan al tocarlo.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [open]);
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty('--p', String(Math.min(1, Math.max(0, window.scrollY / 56))));
      // Pasada la portada, la barra queda sobre fondo claro: se vuelve gris translúcida para que los botones no se pierdan.
      const cover = document.querySelector('.iv-cover');
      const edge = cover ? cover.getBoundingClientRect().bottom : 0;
      el.classList.toggle('is-over-light', edge < 64);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  const showInvitation = site.blocks.invitation;
  const showRsvp = site.blocks.rsvp;
  const showGifts = site.gifts.length > 0;
  return (
    <header className={`ej-bar${embedded ? ' is-embedded' : ''}`} ref={ref}>
      <nav className="ej-bar-inner" aria-label="Secciones del sitio">
        <div className="ej-bar-pill ej-bar-close">
          <Link to={to(site.exit.href)} className="ej-bar-link" aria-label={site.exit.label}><X size={16} aria-hidden="true" /><span>{site.exit.label}</span></Link>
        </div>
        <div className="ej-bar-pill ej-bar-links">
          {showInvitation && <Link to={to(site.homePath)} hash="nos-casamos" className="ej-bar-link" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}>Invitación</Link>}
          {showGifts && <Link to={to(site.giftsPath)} className="ej-bar-link" activeProps={{ 'aria-current': 'page' }}>Regalá</Link>}
          {showRsvp && <button type="button" className="ej-bar-link" onClick={rsvp.open}>Confirmá asistencia</button>}
          <button type="button" className="ej-bar-link ej-bar-burger" aria-label={open ? 'Cerrar el menú' : 'Abrir el menú'} aria-expanded={open} aria-controls="ej-bar-menu" onClick={() => setOpen(o => !o)}>{open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}</button>
        </div>
      </nav>
      <div id="ej-bar-menu" className="ej-bar-menu" hidden={!open}>
        {showInvitation && <Link to={to(site.homePath)} hash="nos-casamos" className="menu-row" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }} onClick={() => setOpen(false)}><span className="menu-tile"><Mail size={30} strokeWidth={1.4} aria-hidden="true" /></span><span><small>Los detalles</small><strong>Invitación</strong></span></Link>}
        {showGifts && <Link to={to(site.giftsPath)} className="menu-row" activeProps={{ 'aria-current': 'page' }} onClick={() => setOpen(false)}><span className="menu-tile"><Gift size={30} strokeWidth={1.4} aria-hidden="true" /></span><span><small>Lista de regalos</small><strong>Regalá</strong></span></Link>}
        {showRsvp && <button type="button" className="menu-row" onClick={() => { setOpen(false); rsvp.open(); }}><span className="menu-tile"><CalendarCheck size={30} strokeWidth={1.4} aria-hidden="true" /></span><span><small>{site.rsvp.deadline ? `Antes del ${site.rsvp.deadline}` : 'Contanos si venís'}</small><strong>Confirmá asistencia</strong></span></button>}
      </div>
    </header>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const site = useSite();
  return <RsvpProvider><div className="dm-root">
    <a className="skip-link" href="#main">Ir al contenido</a>
    <SiteNav />
    <main id="main">{children}</main>
    <footer className="iv-footer"><div className="iv-wrap">
      <Link to="/" className="iv-footer-brand seed-logo" aria-label="Weda, volver a la página principal">Weda<i aria-hidden="true" /></Link>
      <p>{site.kind === 'demo'
        ? 'Este sitio fue creado con Weda: lista de regalos, sitio del casamiento y confirmación de asistencia en un solo lugar.'
        : `Sitio de ${site.names} creado con Weda.`}</p>
      <span>© 2026 Weda</span>
    </div></footer>
  </div></RsvpProvider>;
}
