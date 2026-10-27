// Banner de primeros pasos del Inicio: regalos → sitio de casamiento → publicación. Cada paso se marca solo, según los datos reales.
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, ChevronDown, Eye, Gift, Globe, Send, Sparkles } from 'lucide-react';
import { usePlans } from '@/components/panel/ui';
import { coupleLabel, dateLabel } from '@/lib/weda/logic';
import { giftsStage, nextAction, siteStage } from '@/lib/weda/journey';
import { openPreview } from '@/lib/weda/preview-event';
import { useAppState } from '@/lib/weda/store';

type Step = {
  key: 'regalos' | 'sitio' | 'publicar';
  label: string;
  done: boolean;
  title: string;
  text: string;
  Icon: typeof Gift;
};

const KEY = 'weda-home-steps';
const readHidden = () => { try { return localStorage.getItem(KEY) === 'hidden'; } catch { return false; } };

export function GetStarted() {
  const s = useAppState();
  const plans = usePlans();
  const [hidden, setHidden] = useState(readHidden);
  const [picked, setPicked] = useState<Step['key'] | null>(null);
  const toggle = () => setHidden(h => { try { localStorage.setItem(KEY, h ? 'shown' : 'hidden'); } catch { /* sin almacenamiento */ } return !h; });

  const g = giftsStage(s), si = siteStage(s);
  const next = nextAction(s);
  const steps: Step[] = [
    g.status === 'done'
      ? { key: 'regalos', label: 'Lista de regalos', done: true, title: 'Tu lista de regalos está lista', text: g.detail, Icon: Gift }
      : { key: 'regalos', label: 'Lista de regalos', done: false, title: s.gifts.items.length === 0 ? 'Armá tu lista de regalos' : 'Dejá lista tu lista de regalos', text: s.gifts.items.length === 0 ? 'Elegí un set completo o los regalos uno por uno.' : g.detail, Icon: Gift },
    si.status === 'done'
      ? { key: 'sitio', label: 'Sitio de casamiento', done: true, title: 'Tu sitio de casamiento está listo', text: si.detail, Icon: Globe }
      : { key: 'sitio', label: 'Sitio de casamiento', done: false, title: si.status === 'todo' ? 'Diseñá tu sitio de casamiento' : 'Terminá tu sitio de casamiento', text: si.status === 'todo' ? 'Cargá los lugares y horarios y elegí qué mostrar a tus invitados.' : si.detail, Icon: Globe },
    { key: 'publicar', label: 'Publicación', done: false, title: 'Revisá y publicá', text: 'Mirá cómo queda y elegí qué publicar. Hoy es una demostración: no se publica ni se cobra nada.', Icon: Send },
  ];
  const auto = steps.find(x => !x.done)?.key ?? 'publicar';
  const active = steps.find(x => x.key === (picked ?? auto)) ?? steps[2]!;
  const doneCount = steps.filter(x => x.done).length;

  const action = (() => {
    if (active.key === 'regalos') {
      const cta = active.done ? 'Editar lista' : next.stage === 'regalos' ? next.cta : 'Continuar';
      return <Link to="/panel/regalos" {...(!active.done && next.stage === 'regalos' && next.search ? { search: next.search as never } : {})} className="pn-btn">{cta}<ArrowRight size={16} aria-hidden="true" /></Link>;
    }
    if (active.key === 'sitio') return <Link to="/panel/sitio" className="pn-btn">{active.done ? 'Editar sitio' : si.status === 'todo' ? 'Diseñar mi sitio' : 'Continuar'}<ArrowRight size={16} aria-hidden="true" /></Link>;
    return (
      <>
        <button type="button" className="pn-btn" onClick={plans.open}>Publicar<ArrowRight size={16} aria-hidden="true" /></button>
        <button type="button" className="pn-btn is-ghost" onClick={() => openPreview('home')}><Eye size={16} aria-hidden="true" />Vista previa</button>
      </>
    );
  })();

  return (
    <section className="gs" aria-labelledby="gs-title">
      <div className="gs-head">
        <div className="gs-id">
          <h2 id="gs-title"><Sparkles size={18} aria-hidden="true" />Primeros pasos <span className="gs-count">{doneCount} de 3</span></h2>
          <p className="gs-couple">{coupleLabel(s.couple)} · {s.date ? dateLabel(s.date) : 'Fecha por definir'}</p>
        </div>
        <div className="gs-head-actions">
          <button type="button" className="pn-link is-muted" aria-expanded={!hidden} aria-controls="gs-body" onClick={toggle}>
            {hidden ? 'Mostrar' : 'Ocultar'}<ChevronDown size={14} className={hidden ? '' : 'is-up'} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id="gs-body" hidden={hidden}>
        <div className="gs-tabs" role="tablist" aria-label="Pasos para armar tu casamiento">
          {steps.map((x, i) => (
            <button key={x.key} type="button" role="tab" id={`gs-tab-${x.key}`} aria-selected={x.key === active.key} aria-controls="gs-panel" className={`gs-tab${x.key === active.key ? ' on' : ''}${x.done ? ' is-done' : ''}`} onClick={() => setPicked(x.key)}>
              <span className="gs-num" aria-hidden="true">{x.done ? <Check size={14} strokeWidth={2.4} /> : i + 1}</span>
              <span>{x.label}{x.done && <span className="pn-sr"> (completo)</span>}</span>
            </button>
          ))}
        </div>
        <div className="gs-panel" id="gs-panel" role="tabpanel" aria-labelledby={`gs-tab-${active.key}`}>
          <div className="gs-copy">
            <h3>{active.title}</h3>
            <p>{active.text}</p>
            <div className="gs-actions">{action}</div>
          </div>
          <div className="gs-art" aria-hidden="true"><active.Icon size={64} strokeWidth={1.1} /></div>
        </div>
      </div>
    </section>
  );
}
