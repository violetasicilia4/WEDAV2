import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
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
  const path = useRouterState({ select: s => s.location.pathname });
  const account = path.startsWith('/crear/cuenta');
  const step = path.startsWith('/crear/plan') ? 3 : 2;
  return (
    <div className="pn-root pn-flow">
      <a className="skip-link" href="#main">Ir al contenido</a>
      {account ? (
        <header className="pn-flow-head is-account">
          <Link to="/" className="pn-close" aria-label="Cerrar y volver al inicio"><X size={26} strokeWidth={1.5} aria-hidden="true" /></Link>
        </header>
      ) : (
        <header className="pn-flow-head">
          <Link to="/" className="seed-logo" aria-label="Weda, volver al inicio">Weda<i aria-hidden="true" /></Link>
          <p className="pn-flow-step" aria-label={`Paso ${step} de 3`}>Paso {step} de 3</p>
        </header>
      )}
      <main id="main" className="pn-flow-main"><Outlet /></main>
    </div>
  );
}
