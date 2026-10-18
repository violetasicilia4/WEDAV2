import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { X } from 'lucide-react';
import '@/panel.css';

export const Route = createFileRoute('/crear')({
  head: () => ({
    meta: [
      { title: 'Crear mi evento • Weda' },
      // Es una demo con datos locales: no debe indexarse.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: CreateLayout,
});

function CreateLayout() {
  return (
    <div className="pn-root pn-flow">
      <a className="skip-link" href="#main">Ir al contenido</a>
      <header className="pn-flow-head is-account">
        <Link to="/" className="pn-close" aria-label="Cerrar y volver al inicio"><X size={26} strokeWidth={1.5} aria-hidden="true" /></Link>
      </header>
      <main id="main" className="pn-flow-main"><Outlet /></main>
    </div>
  );
}
