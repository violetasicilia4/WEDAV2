import { Link } from '@tanstack/react-router';

/** Pie de la landing y de las páginas informativas (por ejemplo /lista-de-regalos). Los enlaces a secciones apuntan a la landing («/#…») para que funcionen desde cualquier página. */
export function SiteFooter() {
  return (
    <footer className="seed-footer"><div className="section-inner">
      <div className="footer-top">
        <div><a href="/" className="seed-logo" aria-label="Weda, inicio">Weda<i aria-hidden="true" /></a><p className="footer-mission">Tu casamiento empieza antes del gran día.</p></div>
        <nav className="footer-nav" aria-label="Secciones de Weda">
          <Link to="/lista-de-regalos">Lista de regalos</Link>
          <Link to="/ejemplo">Sitio del casamiento</Link>
          <a href="/#products">Confirmación de asistencia</a>
          <Link to="/ejemplo">Ver ejemplo</Link>
        </nav>
      </div>
      <div className="footer-bottom"><span>© 2026 Weda</span><span className="footer-legal"><Link to="/terminos">Términos de uso</Link> · <Link to="/privacidad">Privacidad</Link></span></div>
    </div></footer>
  );
}
