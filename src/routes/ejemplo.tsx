import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { wedding } from '@/lib/demo-wedding';
import { RsvpProvider, useRsvp } from '@/components/rsvp-dialog';
import '@/demo.css';
import '@/ejemplo.css';
import '@/invitacion.css';

export const Route = createFileRoute('/ejemplo')({
  head: () => ({
    meta: [
      // La demo no debe indexarse. robots.txt no la bloquea, para que los buscadores puedan leer esta directiva.
      { name: 'robots', content: 'noindex, nofollow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'es_AR' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap' },
    ],
  }),
  component: DemoLayout,
});

// Navegación de arriba, como en la landing: texto sobre la foto y, al scrollear, una burbuja de cristal que queda pegada arriba.
function DemoNav() {
  const rsvp = useRsvp();
  const ref = useRef<HTMLElement>(null);
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
  return (
    <header className="ej-bar" ref={ref}>
      <nav className="ej-bar-inner" aria-label="Secciones del sitio">
        <div className="ej-bar-pill ej-bar-close">
          <Link to="/" className="ej-bar-link" aria-label="Cerrar el ejemplo y volver a Weda"><X size={16} aria-hidden="true" /><span>Volver a Weda</span></Link>
        </div>
        <div className="ej-bar-pill ej-bar-links">
          <Link to="/ejemplo" hash="nos-casamos" className="ej-bar-link" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}>Invitación</Link>
          <Link to="/ejemplo/regalos" hash="regalos" className="ej-bar-link" activeProps={{ 'aria-current': 'page' }}>Regalá</Link>
          <button type="button" className="ej-bar-link" onClick={rsvp.open}>Confirmá asistencia</button>
        </div>
      </nav>
    </header>
  );
}

function DemoLayout() {
  return <RsvpProvider><div className="dm-root">
    <a className="skip-link" href="#main">Ir al contenido</a>
    <DemoNav />
    <main id="main"><Outlet /></main>
    <footer className="iv-footer"><div className="iv-wrap">
      <Link to="/" className="iv-footer-brand seed-logo" aria-label="Weda, volver a la página principal">Weda<i aria-hidden="true" /></Link>
      <p>Este sitio fue creado con Weda: lista de regalos, sitio del casamiento y confirmación de asistencia en un solo lugar.</p>
      <span>© 2026 Weda</span>
    </div></footer>
  </div></RsvpProvider>;
}
