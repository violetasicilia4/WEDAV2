import { useEffect, useRef, useState } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { ensureRemote } from '@/lib/weda/remote';
// Los estilos del panel se importan acá (y en components/panel/ui.tsx), no en el archivo de la ruta: así viajan con el código de estas
// pantallas y la landing no los descarga (auditoría F-06).
import '@/panel.css';

/** Las tres pantallas para empezar (nombres, fecha y lugar, foto) son páginas completas y blancas. */
const ONBOARDING = ['/crear', '/crear/fecha', '/crear/foto'];

export function CreateLayout() {
  // Si ya hay sesión, el casamiento que se arma en estas pantallas se guarda también en la cuenta.
  useEffect(() => { void ensureRemote(); }, []);
  // El registro (/crear/cuenta) va sobre la landing oscurecida; las pantallas para empezar, sobre blanco.
  // Se lee la ruta ya resuelta (no la pedida): al salir hacia /panel la pantalla vieja sigue montada hasta que carga la nueva, y con la ruta pedida
  // este contenedor montaba la landing entera de fondo justo en ese momento, congelando la transición en equipos y redes lentas.
  const path = useRouterState({ select: s => (s.resolvedLocation ?? s.location).pathname.replace(/\/$/, '') });
  const onboarding = ONBOARDING.includes(path);
  const showBackdrop = !onboarding && path.startsWith('/crear');
  // El fondo aparece recién cuando la landing terminó de pintarse: antes el iframe vacío se veía como un destello blanco.
  const [bgReady, setBgReady] = useState(false);
  const bg = useRef<HTMLIFrameElement>(null);
  // Si el iframe terminó de cargar antes de que React escuchara (entrada directa a /crear/cuenta), igual se muestra.
  useEffect(() => { if (bg.current?.contentDocument?.readyState === 'complete' && bg.current.contentDocument.URL !== 'about:blank') setBgReady(true); }, [showBackdrop]);
  return (
    <div className={`pn-root pn-flow${onboarding ? ' is-onboarding' : ''}`}>
      {showBackdrop && (
        <>
          {/* De fondo, la propia página de Weda, translúcida: decorativa, sin foco ni lectura de pantalla. */}
          <iframe ref={bg} className={`pn-flow-bg${bgReady ? ' is-ready' : ''}`} src="/" title="" aria-hidden="true" tabIndex={-1} onLoad={() => setBgReady(true)} />
          <div className="pn-flow-veil" aria-hidden="true" />
        </>
      )}
      <a className="skip-link" href="#main">Ir al contenido</a>
      <main id="main" className="pn-flow-main"><Outlet /></main>
    </div>
  );
}
