import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
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

/** Las tres pantallas para empezar (nombres, fecha y lugar, foto) son páginas completas y blancas. */
const ONBOARDING = ['/crear', '/crear/fecha', '/crear/foto'];

function CreateLayout() {
  // El registro (/crear/cuenta) va sobre la landing oscurecida; las pantallas para empezar, sobre blanco.
  const onboarding = useRouterState({ select: s => ONBOARDING.includes(s.location.pathname.replace(/\/$/, '')) });
  return (
    <div className={`pn-root pn-flow${onboarding ? ' is-onboarding' : ''}`}>
      {!onboarding && (
        <>
          {/* De fondo, la propia página de Weda, translúcida: decorativa, sin foco ni lectura de pantalla. */}
          <iframe className="pn-flow-bg" src="/" title="" aria-hidden="true" tabIndex={-1} />
          <div className="pn-flow-veil" aria-hidden="true" />
        </>
      )}
      <a className="skip-link" href="#main">Ir al contenido</a>
      <main id="main" className="pn-flow-main"><Outlet /></main>
    </div>
  );
}
