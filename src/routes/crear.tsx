import { useEffect } from 'react';
import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { ensureRemote } from '@/lib/weda/remote';
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
  // Si ya hay sesión, el casamiento que se arma en estas pantallas se guarda también en la cuenta.
  useEffect(() => { void ensureRemote(); }, []);
  // El registro (/crear/cuenta) va sobre la landing oscurecida; las pantallas para empezar, sobre blanco.
  // Se lee la ruta ya resuelta (no la pedida): al salir hacia /panel la pantalla vieja sigue montada hasta que carga la nueva, y con la ruta pedida
  // este contenedor montaba la landing entera de fondo justo en ese momento, congelando la transición en equipos y redes lentas.
  const path = useRouterState({ select: s => (s.resolvedLocation ?? s.location).pathname.replace(/\/$/, '') });
  const onboarding = ONBOARDING.includes(path);
  const showBackdrop = !onboarding && path.startsWith('/crear');
  return (
    <div className={`pn-root pn-flow${onboarding ? ' is-onboarding' : ''}`}>
      {showBackdrop && (
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
