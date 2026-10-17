import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
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
  const step = path.startsWith('/crear/plan') ? 2 : 1;
  return (
    <div className="pn-root pn-flow">
      <a className="skip-link" href="#main">Ir al contenido</a>
      <header className="pn-flow-head">
        <Link to="/" className="seed-logo" aria-label="Weda, volver al inicio">Weda<i aria-hidden="true" /></Link>
        <p className="pn-flow-step" aria-label={`Paso ${step} de 2`}>Paso {step} de 2</p>
      </header>
      <main id="main" className="pn-flow-main"><Outlet /></main>
    </div>
  );
}
