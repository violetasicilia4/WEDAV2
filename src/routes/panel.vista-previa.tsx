import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PreviewFrame, usePlans } from '@/components/panel/ui';
import { publicPages, sitePath } from '@/lib/weda/logic';
import { useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/vista-previa')({ component: Preview });

/* Vista previa: la página pública REAL (la misma de /ejemplo, con tus datos) vista como la ve un invitado. */
function Preview() {
  const s = useAppState();
  const pages = publicPages(s.planId);
  const [page, setPage] = useState<'home' | 'gifts'>(pages.invitation ? 'home' : 'gifts');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const plans = usePlans();
  const base = sitePath(s);
  const path = page === 'gifts' || !pages.invitation ? `${base}/regalos` : base;

  return (
    <div className="pn-page pn-page-preview">
      <header className="pn-page-head">
        <div>
          <h1>Ver como invitado</h1>
          <p className="pn-sub">Así la ven tus invitados. Todavía no está publicada.</p>
        </div>
        <div className="pn-head-actions">
          <Link to={(pages.invitation ? '/panel/sitio' : '/panel/regalos') as never} className="pn-btn is-ghost"><ArrowLeft size={16} aria-hidden="true" />{page === 'gifts' || !pages.invitation ? 'Volver a mis regalos' : 'Volver a editar mi página'}</Link>
          <button type="button" className="pn-btn" onClick={plans.open}>Publicar</button>
        </div>
      </header>

      <div className="pn-preview-bar">
        <div className="pn-switch is-small" role="group" aria-label="Qué página ver">
          {pages.invitation && <button type="button" className={page === 'home' ? 'on' : ''} aria-pressed={page === 'home'} onClick={() => setPage('home')}>Invitación</button>}
          {pages.gifts && <button type="button" className={page === 'gifts' || !pages.invitation ? 'on' : ''} aria-pressed={page === 'gifts' || !pages.invitation} onClick={() => setPage('gifts')}>Lista de regalos</button>}
        </div>
        <div className="pn-switch is-small" role="group" aria-label="Tamaño de la vista previa">
          <button type="button" className={device === 'mobile' ? 'on' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Celular</button>
          <button type="button" className={device === 'desktop' ? 'on' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Compu</button>
        </div>
        <a className="pn-link" href={path} target="_blank" rel="noopener noreferrer">Abrir en otra pestaña <ExternalLink size={13} aria-hidden="true" /></a>
      </div>

      <PreviewFrame path={path} device={device} />
      {!pages.invitation && <p className="pn-note">Tu plan incluye la lista de regalos. La invitación y la confirmación de asistencia están desde el plan Invitación.</p>}

    </div>
  );
}
