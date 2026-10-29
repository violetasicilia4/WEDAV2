// Molde de las tres pantallas para empezar (nombres, fecha y lugar, foto): progreso arriba, logo centrado,
// texto y campos a la izquierda, una imagen a la derecha y los botones abajo, al centro.
import type { ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useHydrated } from '@/lib/weda/store';

export type OnboardingStep = 1 | 2 | 3;

export function OnboardingShell({ step, title, sub, big = false, back, formId, onNext, nextLabel = 'Continuar', side, children }: {
  step: OnboardingStep; title: string; sub: ReactNode; /** La imagen de la derecha tiene más protagonismo (pantalla de la foto). */ big?: boolean; back: '/crear/cuenta' | '/crear' | '/crear/fecha';
  /** Si hay formulario, el botón principal lo envía; si no, usa onNext. */
  formId?: string; onNext?: () => void; nextLabel?: string; side: ReactNode; children: ReactNode;
}) {
  // Hasta hidratar, el botón no hace nada (ver __root.tsx): se muestra deshabilitado para que no parezca roto.
  const hydrated = useHydrated();
  return (
    <div className="ob">
      <header className="ob-top">
        <Link to="/" className="seed-logo" aria-label="Weda, volver al inicio">Weda<i aria-hidden="true" /></Link>
        <div className="ob-bar" role="progressbar" aria-label={`Paso ${step} de 3`} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}><i style={{ width: `${(step / 3) * 100}%` }} /></div>
      </header>
      <div className={`ob-body${big ? ' is-big' : ''}`}>
        <section className="ob-form" aria-labelledby="ob-title">
          <h1 id="ob-title">{title}</h1>
          <p className="ob-sub">{sub}</p>
          {children}
        </section>
        {side}
      </div>
      <footer className="ob-foot">
        <Link to={back} className="pn-btn is-ghost">Volver</Link>
        {formId
          ? <button type="submit" form={formId} className="pn-btn ob-next" disabled={!hydrated}>{nextLabel}</button>
          : <button type="button" className="pn-btn ob-next" onClick={onNext} disabled={!hydrated}>{nextLabel}</button>}
      </footer>
    </div>
  );
}

/** Imagen de la derecha: decorativa (el contenido va a la izquierda). Con `onPick` es un botón: tocarla abre el selector de fotos. */
export function OnboardingPhoto({ src, square = false, alt = '', trimLeft = false, onPick, actionLabel = 'Cambiar foto' }: {
  src: string; square?: boolean; alt?: string; trimLeft?: boolean; onPick?: () => void; actionLabel?: string;
}) {
  const img = <img src={src} alt={alt} style={trimLeft ? { transform: 'scale(1.04)', transformOrigin: '100% 50%' } : undefined} />;
  const cls = `ob-photo${square ? ' is-square' : ''}`;
  if (onPick) {
    return (
      <button type="button" className={`${cls} is-action`} onClick={onPick} aria-label={`${actionLabel}: elegir una foto de tu dispositivo`}>
        {img}
        <span className="ob-photo-hint"><ImagePlus size={16} strokeWidth={1.5} aria-hidden="true" />{actionLabel}</span>
      </button>
    );
  }
  return <figure className={cls} aria-hidden={alt ? undefined : true}>{img}</figure>;
}
