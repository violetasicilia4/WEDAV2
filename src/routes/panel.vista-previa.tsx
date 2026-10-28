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
  const plans = usePlans();
  const base = sitePath(s);
  // El micrositio se recorre con su propia barra (Invitación · Regalá · Confirmá asistencia): acá no hay selector de página. Abre en la invitación, o en los regalos si el plan no incluye invitación.
  const path = pages.invitation ? base : `${base}/regalos`;

  return (
    <div className="pn-page pn-page-preview">
      <header className="pn-page-head">
        <div>
          <h1>Vista previa</h1>
          <p className="pn-sub">Así la ven tus invitados. Todavía no está publicada.</p>
        </div>
        <div className="pn-head-actions">
          <Link to={(pages.invitation ? '/panel/sitio' : '/panel/regalos') as never} className="pn-btn is-ghost"><ArrowLeft size={16} aria-hidden="true" />{pages.invitation ? 'Volver a editar mi página' : 'Volver a mis regalos'}</Link>
          <button type="button" className="pn-btn" onClick={plans.open}>Publicar</button>
        </div>
      </header>

      <div className="pn-preview-bar">
        <a className="pn-link" href={`${path}?borrador`} target="_blank" rel="noopener noreferrer">Abrir vista limpia <ExternalLink size={13} aria-hidden="true" /><span className="pn-sr"> (se abre en una pestaña nueva)</span></a>
      </div>

      <PreviewFrame path={path} device="mobile" />
    </div>
  );
}
