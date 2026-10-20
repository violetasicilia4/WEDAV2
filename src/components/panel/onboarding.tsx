// Molde de las tres pantallas para empezar (nombres, fecha y lugar, foto): progreso arriba, logo centrado,
// texto y campos a la izquierda, una imagen a la derecha y los botones abajo, al centro.
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export type OnboardingStep = 1 | 2 | 3;

export function OnboardingShell({ step, title, sub, back, formId, onNext, nextLabel = 'Continuar', side, children }: {
  step: OnboardingStep; title: string; sub: string; back: '/crear/cuenta' | '/crear' | '/crear/fecha';
  /** Si hay formulario, el botón principal lo envía; si no, usa onNext. */
  formId?: string; onNext?: () => void; nextLabel?: string; side: ReactNode; children: ReactNode;
}) {
  return (
    <div className="ob">
      <header className="ob-top">
        <Link to="/" className="seed-logo" aria-label="Weda, volver al inicio">Weda<i aria-hidden="true" /></Link>
        <div className="ob-bar" role="progressbar" aria-label={`Paso ${step} de 3`} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}><i style={{ width: `${(step / 3) * 100}%` }} /></div>
      </header>
      <div className="ob-body">
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
          ? <button type="submit" form={formId} className="pn-btn ob-next">{nextLabel}</button>
          : <button type="button" className="pn-btn ob-next" onClick={onNext}>{nextLabel}</button>}
      </footer>
    </div>
  );
}

/** Imagen de la derecha: decorativa (el contenido va a la izquierda). */
export function OnboardingPhoto({ src, square = false, alt = '' }: { src: string; square?: boolean; alt?: string }) {
  return <figure className={`ob-photo${square ? ' is-square' : ''}`} aria-hidden={alt ? undefined : true}><img src={src} alt={alt} /></figure>;
}
