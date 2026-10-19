import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PreviewFrame, usePlans } from '@/components/panel/ui';
import { sectionGaps } from '@/lib/weda/journey';
import { publicPages, sitePath } from '@/lib/weda/logic';
import { planById } from '@/lib/weda/plans';
import { publishSummary } from '@/lib/weda/publish';
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
  // Sin plan elegido se prueba todo: el resumen se muestra como quedaría con el plan más completo.
  const summary = publishSummary(s, s.planId ?? 'completo');
  const gaps = sectionGaps(s);
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
        <a className="pn-link" href={path} target="_blank" rel="noopener noreferrer">Abrir vista limpia <ExternalLink size={13} aria-hidden="true" /><span className="pn-sr"> (se abre en una pestaña nueva)</span></a>
      </div>

      <PreviewFrame path={path} device={device} />
      <p className="pn-hint">Los invitados la abren sobre todo desde el celular. <button type="button" className="pn-link" onClick={() => setDevice(device === 'mobile' ? 'desktop' : 'mobile')}>{device === 'mobile' ? 'Probar en pantalla de compu' : 'Volver a la vista de celular'}</button></p>
      <section className="pn-sec-sum" aria-labelledby="pn-sum-title">
        <h2 id="pn-sum-title">Qué estás viendo</h2>
        <p className="pn-muted">{s.planId ? `Con el plan ${planById(s.planId)?.name}.` : 'Todavía no elegiste plan: ves todas las funciones. Al publicar, cada plan incluye distintas.'}</p>
        <ul>
          {summary.items.map(i => (
            <li key={i.feature}>
              <span>{i.label}</span>
              <span className={`pn-sum-tag is-${i.state}`}>{i.state === 'published' ? 'Configurado' : i.state === 'empty' ? 'Incluido, falta cargar' : `Requiere plan ${i.plan}`}</span>
            </li>
          ))}
        </ul>
        {gaps.length > 0 && <p className="pn-note">Pendiente de completar: {gaps.map(g => g.label).join(', ')}. <Link to="/panel/sitio" className="pn-link">Ir a completarlo</Link></p>}
      </section>
    </div>
  );
}
