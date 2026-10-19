import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Menu, X, Gift, CalendarHeart, LogIn } from 'lucide-react';

/** Barra flotante de la landing. Se reutiliza tal cual en las demás pantallas para que el logo quede siempre en el mismo lugar. */
export function FloatNav({ onLanding = false, back = false }: { onLanding?: boolean; back?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loginHint, setLoginHint] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // Una sola barra, como en Seed: sube con la página hasta pegarse arriba y sus píldoras se van "rellenando" (--p de 0 a 1).
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty('--p', String(Math.min(1, Math.max(0, window.scrollY / 56))));
      // Pasada la portada la barra queda sobre fondo claro y las píldoras se oscurecen para que el texto no se pierda.
      const hero = document.querySelector('.seed-hero');
      el.classList.toggle('is-over-light', (hero ? hero.getBoundingClientRect().bottom : 0) < 64);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // El panel arranca justo debajo de la barra y ocupa el resto de la pantalla.
    const bar = ref.current?.querySelector('.float-bar');
    if (bar && panelRef.current) panelRef.current.style.top = `${Math.round(bar.getBoundingClientRect().bottom + 8)}px`;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);
  const close = () => { setOpen(false); setLoginHint(false); };
  return (
    <header className="float-nav" ref={ref}>
      <nav className="float-bar" aria-label="Principal">
        <div className="float-pill float-left">
          {onLanding
            ? <a href="#top" className="seed-logo" aria-label="Weda, volver arriba">Weda<i aria-hidden="true" /></a>
            : <Link to="/" className="seed-logo" aria-label="Weda, ir al inicio">Weda<i aria-hidden="true" /></Link>}
        </div>
        {back ? (
          <div className="float-pill float-right">
            <Link to="/" className="float-link"><ArrowLeft size={15} aria-hidden="true" /><span>Volver</span></Link>
          </div>
        ) : (
          <div className="float-pill float-right">
            <Link to="/encontrar" className="float-link float-desktop">Hacé un regalo</Link>
            <Link to="/crear/cuenta" className="float-cta">Crear mi evento</Link>
            <button type="button" className="float-burger" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="float-menu" onClick={() => setOpen(o => !o)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        )}
      </nav>
      <div id="float-menu" ref={panelRef} className="float-menu" hidden={!open}>
        <Link to="/encontrar" className="menu-row" onClick={close}><span className="menu-tile"><Gift size={30} strokeWidth={1.4} /></span><span><small>Para invitados</small><strong>Hacé un regalo</strong></span></Link>
        <Link to="/crear/cuenta" className="menu-row" onClick={close}><span className="menu-tile"><CalendarHeart size={30} strokeWidth={1.4} /></span><span><small>Para novios</small><strong>Crear mi evento</strong></span></Link>
        <button type="button" className="menu-row menu-row-btn" onClick={() => setLoginHint(true)}><span className="menu-tile"><LogIn size={30} strokeWidth={1.4} /></span><span><small aria-live="polite">{loginHint ? 'Próximamente' : 'Ya tengo cuenta'}</small><strong>Iniciar sesión</strong></span></button>
      </div>
    </header>
  );
}
