// Pasos del Inicio: lista de regalos → diseño del sitio → publicación. Cada paso se marca solo, según los datos reales (journey.ts).
// Diseño de la dueña (2026-10-28): pasos numerados unidos por una línea, el paso elegido con su ícono, texto, botón y una muestra
// de cómo se ve en la invitación. Los tres paneles se dibujan en la misma celda: el bloque mide siempre lo que el más largo.
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Eye, Gift, Globe, Send } from 'lucide-react';
import { usePlans } from '@/components/panel/ui';
import { coupleLabel, photoPosition, resolvePhoto, sitePath } from '@/lib/weda/logic';
import { giftsStage, nextAction, siteStage } from '@/lib/weda/journey';
import { openPreview } from '@/lib/weda/preview-event';
import { useAppState } from '@/lib/weda/store';
import type { AppState } from '@/lib/weda/types';

type Key = 'regalos' | 'sitio' | 'publicar';
type Step = { key: Key; label: string; done: boolean; title: string; text: string; Icon: typeof Gift };

/** Fotos de muestra (del catálogo de Weda) mientras la lista no tiene regalos con foto. */
const SAMPLE_GIFTS = ['/regalo-cafetera.webp', '/regalo-vajilla.jpg', '/regalo-sabanas.webp'];

/** Muestra de cómo se ve cada paso en la invitación: fotos de la lista, la portada o el link. Es decorativa (el texto ya dice lo mismo). */
function Sample({ step, s }: { step: Key; s: AppState }) {
  if (step === 'regalos') {
    const own = s.gifts.items.map(g => g.image).filter((x): x is string => !!x);
    const pics = (own.length >= 3 ? own : [...own, ...SAMPLE_GIFTS]).slice(0, 3);
    return (
      <figure className="hx-sample is-gifts" aria-hidden="true">
        <div className="hx-card">
          <div className="hx-pics">{pics.map((src, i) => <img key={i} src={src} alt="" loading="lazy" decoding="async" />)}</div>
          <p className="hx-card-cap"><Gift size={13} strokeWidth={1.7} />Nuestra lista de regalos</p>
        </div>
      </figure>
    );
  }
  if (step === 'sitio') {
    return (
      <figure className="hx-sample is-site" aria-hidden="true">
        <div className="hx-card">
          <div className="hx-cover">
            <img src={resolvePhoto(s.photo)} alt="" style={{ objectPosition: photoPosition(s.photo) }} loading="lazy" decoding="async" />
            <span>¡Nos casamos!<strong>{coupleLabel(s.couple)}</strong></span>
          </div>
        </div>
      </figure>
    );
  }
  return (
    <figure className="hx-sample is-publish" aria-hidden="true">
      <div className="hx-card">
        <p className="hx-link-label">Tu link</p>
        <p className="hx-link">{sitePath(s)}</p>
        <p className="hx-card-cap"><Send size={13} strokeWidth={1.7} />Lo compartís cuando publiques</p>
      </div>
    </figure>
  );
}

export function GetStarted() {
  const s = useAppState();
  const plans = usePlans();
  const [picked, setPicked] = useState<Key | null>(null);

  const g = giftsStage(s), si = siteStage(s);
  const next = nextAction(s);
  const steps: Step[] = [
    g.status === 'done'
      ? { key: 'regalos', label: 'Lista de regalos', done: true, title: 'Tu lista de regalos está lista', text: g.detail, Icon: Gift }
      : { key: 'regalos', label: 'Lista de regalos', done: false, title: s.gifts.items.length === 0 ? 'Armá tu lista de regalos' : 'Dejá lista tu lista de regalos', text: s.gifts.items.length === 0 ? 'Elegí un set completo o los regalos uno por uno. Configurá cómo querés recibirlos.' : g.detail, Icon: Gift },
    si.status === 'done'
      ? { key: 'sitio', label: 'Diseño del sitio', done: true, title: 'Tu sitio de casamiento está listo', text: si.detail, Icon: Globe }
      : { key: 'sitio', label: 'Diseño del sitio', done: false, title: si.status === 'todo' ? 'Diseñá tu sitio de casamiento' : 'Terminá tu sitio de casamiento', text: si.status === 'todo' ? 'Cargá los lugares y horarios y elegí qué mostrar a tus invitados.' : si.detail, Icon: Globe },
    { key: 'publicar', label: 'Publicación', done: false, title: 'Revisá y publicá', text: 'Mirá cómo queda y elegí qué publicar.', Icon: Send },
  ];
  const auto = steps.find(x => !x.done)?.key ?? 'publicar';
  const active = steps.find(x => x.key === (picked ?? auto)) ?? steps[2]!;

  const actionFor = (x: Step) => {
    if (x.key === 'regalos') {
      const cta = x.done ? 'Editar lista' : s.gifts.items.length === 0 ? 'Armar mi lista' : next.stage === 'regalos' ? next.cta : 'Continuar';
      return <Link to="/panel/regalos" {...(!x.done && next.stage === 'regalos' && next.search ? { search: next.search as never } : {})} className="pn-btn hx-cta">{cta}<ArrowRight size={16} aria-hidden="true" /></Link>;
    }
    if (x.key === 'sitio') return <Link to="/panel/sitio" className="pn-btn hx-cta">{x.done ? 'Editar sitio' : si.status === 'todo' ? 'Diseñar mi sitio' : 'Continuar'}<ArrowRight size={16} aria-hidden="true" /></Link>;
    return (
      <>
        <button type="button" className="pn-btn hx-cta" onClick={plans.open}>Publicar<ArrowRight size={16} aria-hidden="true" /></button>
        <button type="button" className="pn-btn is-ghost" onClick={() => openPreview('home')}><Eye size={16} aria-hidden="true" />Vista previa</button>
      </>
    );
  };

  return (
    <section className="hx-steps" aria-labelledby="gs-title">
      <h2 id="gs-title" className="pn-sr">Primeros pasos</h2>
      <div className="hx-stepper" role="tablist" aria-label="Pasos para armar tu casamiento">
        {steps.map((x, i) => (
          <button key={x.key} type="button" role="tab" id={`gs-tab-${x.key}`} aria-selected={x.key === active.key} aria-controls={`gs-panel-${x.key}`} className={`hx-step${x.key === active.key ? ' on' : ''}${x.done ? ' is-done' : ''}`} onClick={() => setPicked(x.key)}>
            <span className="hx-dot" aria-hidden="true">{x.done && x.key !== active.key ? <Check size={16} strokeWidth={2.4} /> : i + 1}</span>
            <span className="hx-step-label">{x.label}{x.done && <span className="pn-sr"> (completo)</span>}</span>
          </button>
        ))}
      </div>
      <div className="hx-stack">
        {steps.map((x, i) => {
          const on = x.key === active.key;
          return (
            <div key={x.key} className={`hx-panel is-${x.key}${on ? ' on' : ''}`} id={`gs-panel-${x.key}`} role="tabpanel" aria-labelledby={`gs-tab-${x.key}`} aria-hidden={on ? undefined : true} inert={!on}>
              <div className="hx-ico" aria-hidden="true"><x.Icon size={56} strokeWidth={1.2} /></div>
              <div className="hx-copy">
                <p className="hx-eyebrow">Paso {i + 1} de 3</p>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
                <div className="hx-actions">{actionFor(x)}</div>
              </div>
              <Sample step={x.key} s={s} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
