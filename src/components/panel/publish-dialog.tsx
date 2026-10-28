// Publicar: elegir el producto → revisar y pagar (pago SIMULADO, no se cobra nada) → página publicada. Con una publicación hecha, el mismo botón
// abre «Tu publicación»: ver el link, mejorar de plan (se paga solo la diferencia) o bajar la página.
// Sin cuenta, la publicación es una simulación en este navegador. Con cuenta, publicar/bajar/volver a publicar llaman al servidor (la página se abre de verdad
// para cualquiera con el link) y, si el servidor falla, no se marca nada como publicado. El cobro sigue siendo de prueba: no hay proveedor de pagos.
import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { BadgeCheck, CalendarClock, Check, ChevronDown, ExternalLink, Loader2, Plus } from 'lucide-react';
import { HIGHLIGHT_ICON, PLAN_ICON } from '@/components/plan-icons';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { dateLabel, draftsFor, sitePath } from '@/lib/weda/logic';
import { isLive, publishPaid, republish, takeDown, totalPaid, upgradeAmount, upgradeOptions, upgradePaid } from '@/lib/weda/payments';
import { publishedPagesText, publishSummary } from '@/lib/weda/publish';
import { formatPrice, PLANS, planById, PRICE_UNIT, PUBLICATION_TERM, type HighlightIcon } from '@/lib/weda/plans';
import { errorText, publishRemote, unpublishRemote, useRemote } from '@/lib/weda/remote';
import { getState, update, useAppState } from '@/lib/weda/store';
import type { PlanId } from '@/lib/weda/types';

const PAYING_MS = 1400;

type Step = 'choose' | 'review' | 'paying' | 'done' | 'manage';

export function PublishDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const online = !!useRemote().user;
  const [error, setError] = useState<string | null>(null);
  const pub = state.publication;
  const [step, setStep] = useState<Step>(pub ? 'manage' : 'choose');
  const [picked, setPicked] = useState<PlanId | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmDown, setConfirmDown] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const plan = planById(picked);
  const summary = picked ? publishSummary(state, picked) : null;
  const live = isLive(state);
  const amount = upgrading && pub && picked ? upgradeAmount(pub.planId, picked) : plan?.price ?? 0;
  const path = sitePath(state);
  const close = () => { if (step !== 'paying') onClose(); };
  const choose = (id: PlanId) => { setPicked(id); setUpgrading(false); setStep('review'); };
  const startUpgrade = (id: PlanId) => { setPicked(id); setUpgrading(true); setStep('review'); };
  // Pago SIMULADO: una pausa corta («Procesando…») y se registra el pago y la publicación. No hay cobro ni conexión.
  const pay = () => {
    if (!picked) return;
    const id = picked, up = upgrading;
    setStep('paying'); setError(null);
    timer.current = window.setTimeout(() => {
      const before = getState();
      update(s => (up ? upgradePaid(s, id) : publishPaid(s, id)));
      if (!online) { setStep('done'); return; }
      // Con cuenta: se publica de verdad en el servidor. Si falla, se deshace y no se muestra como publicada.
      void publishRemote().then(r => {
        if (r.ok) { setStep('done'); return; }
        update(s => ({ ...s, publication: before.publication, planId: before.planId }));
        setError(errorText(r.code)); setStep('review');
      });
    }, PAYING_MS);
  };
  const runRemote = (job: () => Promise<{ ok: boolean; code?: string }>, apply: () => void) => {
    setError(null);
    void job().then(r => { if (r.ok) apply(); else setError(errorText(r.code ?? null)); });
  };
  const copyLink = () => {
    const url = new URL(path, window.location.origin).toString();
    void navigator.clipboard?.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2500); }, () => undefined);
  };
  const until = pub ? dateLabel(pub.expiresAt.slice(0, 10)) : '';
  const since = pub ? dateLabel(pub.publishedAt.slice(0, 10)) : '';
  const last = pub?.payments[pub.payments.length - 1];

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className={`pn-dialog pn-plans-dialog${step === 'choose' ? ' is-products' : ''}`} onInteractOutside={e => { if (step === 'paying') e.preventDefault(); }} onEscapeKeyDown={e => { if (step === 'paying') e.preventDefault(); }}>
        {step === 'choose' && (
          <>
            <DialogTitle>¿Qué querés publicar?</DialogTitle>
            <DialogDescription>Elegí una opción. Cambiarla no borra nada de lo que armaste.</DialogDescription>
            <div className="pn-prods">
              {PLANS.map(p => {
                const base = p.inherits ? planById(p.inherits) : undefined;
                const Head = PLAN_ICON[p.id];
                const drafts = draftsFor(state, p.id);
                // «Ver link»: la página pública real, armada como se vería con este producto (no cambia el plan guardado).
                const link = `${sitePath(state)}${p.id === 'regalos' ? '/regalos' : ''}?plan=${p.id}`;
                return (
                  <article key={p.id} className={`pn-prod${state.planId === p.id ? ' is-current' : ''}`} aria-labelledby={`pn-prod-${p.id}`}>
                    <header className="pn-prod-head">
                      <span className="pn-prod-ico" aria-hidden="true"><Head size={22} strokeWidth={1.5} /></span>
                      <div>
                        <h3 id={`pn-prod-${p.id}`}>{p.name}</h3>
                        <p className="pn-prod-what">{p.product}</p>
                      </div>
                    </header>
                    {state.planId === p.id && <span className="pn-prod-tag">Tu elección actual</span>}
                    <p className="pn-prod-price"><strong>{formatPrice(p.price)}</strong></p>
                    <ul className="pn-prod-facts">
                      <li><BadgeCheck size={16} strokeWidth={1.6} aria-hidden="true" /> {PRICE_UNIT.charAt(0).toUpperCase() + PRICE_UNIT.slice(1)}</li>
                      <li><CalendarClock size={16} strokeWidth={1.6} aria-hidden="true" /> Publicada {PUBLICATION_TERM}</li>
                    </ul>
                    <ul className="pn-feats">
                      {base && <li className="is-base"><Plus size={18} strokeWidth={1.6} aria-hidden="true" /><span>Todo lo de {base.name}</span></li>}
                      {p.highlights.map(h => {
                        const Icon = HIGHLIGHT_ICON[h.icon];
                        return <li key={h.label}><Icon size={18} strokeWidth={1.5} aria-hidden="true" /><span>{h.label}</span></li>;
                      })}
                    </ul>
                    <details className="pn-prod-more">
                      <summary>Ver más <ChevronDown size={16} aria-hidden="true" /></summary>
                      <ul className="pn-plan-items is-plain">{p.items.map(it => <li key={it}><Check size={16} strokeWidth={1.6} aria-hidden="true" /><span>{it}</span></li>)}</ul>
                      {drafts.length > 0 && <p className="pn-note">No se publica: {drafts.map(d => d.label.toLowerCase()).join(', ')}. Lo que cargaste queda como borrador.</p>}
                    </details>
                    <div className="pn-prod-actions">
                      <a className="pn-btn is-ghost" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Ver el link de ${p.name} (se abre en otra pestaña)`}>
                        <ExternalLink size={16} aria-hidden="true" /> Ver link
                      </a>
                      <button type="button" className="pn-btn" aria-label={`Publicar ${p.name}`} onClick={() => choose(p.id)}>Publicar</button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="pn-actions is-end">
              <button type="button" className="pn-btn is-ghost" onClick={close}>Ahora no</button>
            </div>
          </>
        )}
        {(step === 'review' || step === 'paying') && plan && (
          <>
            <DialogTitle>{upgrading ? `Mejorar a ${plan.name}` : `Publicar · ${plan.name}`}</DialogTitle>
            <DialogDescription>{upgrading ? `Pagás solo la diferencia con tu plan actual. La vigencia no cambia: sigue hasta el ${until}.` : `${formatPrice(plan.price)} ${PRICE_UNIT} · publicada ${PUBLICATION_TERM}. Esto es lo que se publica.`}</DialogDescription>
            {summary && (
              <div className="pn-publish">
                {summary.published.length > 0 && (<><p className="pn-group-label">Se publica</p><ul className="pn-plan-items">{summary.published.map(i => <li key={i.feature}><Check size={16} strokeWidth={1.6} aria-hidden="true" /><span><strong>{i.label}</strong> · {i.detail}</span></li>)}</ul></>)}
                {summary.empty.length > 0 && (<><p className="pn-group-label">Incluido, pero vacío</p><ul className="pn-plan-items is-plain">{summary.empty.map(i => <li key={i.feature}><span><strong>{i.label}</strong> · {i.detail}</span></li>)}</ul></>)}
                {summary.drafts.length > 0 && (<><p className="pn-group-label">Queda como borrador</p><ul className="pn-plan-items is-plain">{summary.drafts.map(i => <li key={i.feature}><span><strong>{i.label}</strong> · {i.detail} Se publica desde el plan {i.plan}.</span></li>)}</ul></>)}
                <p className="pn-group-label">Antes de publicar</p>
                {summary.todo.length === 0
                  ? <p className="pn-note">No te falta nada de lo que Weda puede verificar. Los detalles de estilo (fotos, galería, mensaje) son opcionales.</p>
                  : <ul className="pn-plan-items is-plain pn-todo">{summary.todo.map(t => <li key={t.text}><span>{t.text}</span><Link to={t.to as never} {...(t.search ? { search: t.search as never } : {})} className="pn-link" onClick={close}>{t.cta}</Link></li>)}</ul>}
                {summary.todo.length > 0 && <p className="pn-hint">Son recomendaciones: hoy ninguna impide publicar y podés resolverlas cuando quieras.</p>}
              </div>
            )}
            <dl className="pn-pay">
              <div><dt>Plan</dt><dd>{plan.name}</dd></div>
              <div><dt>Se publica</dt><dd>{publishedPagesText(plan.id)}</dd></div>
              <div><dt>Duración</dt><dd>{upgrading ? `Hasta el ${until}` : `Publicada ${PUBLICATION_TERM}, desde hoy`}</dd></div>
              {upgrading && pub && <div><dt>Ya pagaste</dt><dd>{formatPrice(totalPaid(pub))}</dd></div>}
              <div className="is-total"><dt>{upgrading ? 'Pagás la diferencia' : 'Total'}</dt><dd>{formatPrice(amount)} · {PRICE_UNIT}</dd></div>
            </dl>
            {error && <p className="pn-banner" role="alert">No se pudo publicar: {error}</p>}
            <p className="pn-note" role="status">Al publicar, cualquiera que tenga el link va a poder abrir tu página.</p>
            <div className="pn-actions is-end">
              <button type="button" className="pn-btn is-ghost" disabled={step === 'paying'} onClick={() => setStep(pub ? 'manage' : 'choose')}>Volver</button>
              <button type="button" className="pn-btn" disabled={step === 'paying'} aria-busy={step === 'paying'} onClick={pay}>
                {step === 'paying' ? <><Loader2 size={16} className="pn-spin" aria-hidden="true" /> Procesando el pago…</> : `Pagar ${formatPrice(amount)}`}
              </button>
            </div>
          </>
        )}
        {step === 'done' && pub && plan && (
          <>
            <DialogTitle>¡Pagaste tu plan {plan.name}!</DialogTitle>
            <DialogDescription>{upgrading ? `Mejoraste tu plan: tu página ya se muestra con ${plan.name}.` : 'Tu página ya está publicada.'}</DialogDescription>
            <dl className="pn-pay">
              <div><dt>Pagaste hoy</dt><dd>{formatPrice(last?.amount ?? amount)}</dd></div>
              <div><dt>Total pagado</dt><dd>{formatPrice(totalPaid(pub))}</dd></div>
              <div><dt>Publicada hasta</dt><dd>{until}</dd></div>
              <div><dt>Tu link</dt><dd><code>{path}</code></dd></div>
            </dl>
            <div className="pn-actions">
              <a className="pn-btn" href={path} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> Ver mi página<span className="pn-sr"> (se abre en otra pestaña)</span></a>
              <button type="button" className="pn-btn is-ghost" onClick={copyLink}>{copied ? 'Link copiado' : 'Copiar link'}</button>
            </div>
            <p className="pn-note">Tu página está publicada: cualquiera con el link la puede abrir. Desde «Publicada» podés mejorar tu plan o bajar la página cuando quieras.</p>
            <div className="pn-actions is-end"><button type="button" className="pn-btn is-ghost" onClick={onClose}>Listo</button></div>
          </>
        )}
        {step === 'manage' && pub && (
          <>
            <DialogTitle>Tu publicación</DialogTitle>
            <DialogDescription>{live ? `Tu página está publicada con el plan ${planById(pub.planId)?.name}.` : `Diste de baja tu página. Tu plan ${planById(pub.planId)?.name} sigue pago hasta el ${until}.`}</DialogDescription>
            <dl className="pn-pay">
              <div><dt>Estado</dt><dd>{live ? 'Publicada' : 'Dada de baja'}</dd></div>
              <div><dt>Plan</dt><dd>{planById(pub.planId)?.name}</dd></div>
              <div><dt>Publicada desde</dt><dd>{since}</dd></div>
              <div><dt>Vigente hasta</dt><dd>{until}</dd></div>
              {pub.payments.length > 0 && <div><dt>Total pagado</dt><dd>{formatPrice(totalPaid(pub))} · {PRICE_UNIT}</dd></div>}
              {live && <div><dt>Tu link</dt><dd><code>{path}</code></dd></div>}
            </dl>
            {live && (
              <div className="pn-actions">
                <a className="pn-btn" href={path} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> Ver mi página<span className="pn-sr"> (se abre en otra pestaña)</span></a>
                <button type="button" className="pn-btn is-ghost" onClick={copyLink}>{copied ? 'Link copiado' : 'Copiar link'}</button>
              </div>
            )}
            {upgradeOptions(pub.planId).length > 0 && (
              <div className="pn-upgrade">
                <p className="pn-group-label">Mejorar tu plan</p>
                <ul>
                  {upgradeOptions(pub.planId).map(p => (
                    <li key={p.id}>
                      <span><strong>{p.name}</strong><small>{p.product} · pagás {formatPrice(upgradeAmount(pub.planId, p.id))} de diferencia</small></span>
                      <button type="button" className="pn-btn is-ghost is-small" aria-label={`Mejorar a ${p.name}`} onClick={() => startUpgrade(p.id)}>Mejorar</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {confirmDown ? (
              <div className="pn-note" role="alertdialog" aria-label="Confirmar bajar la página">
                <p><strong>¿Bajar tu página?</strong> Deja de estar publicada. No se devuelve el pago y tu plan sigue vigente hasta el {until}: podés volver a publicarla sin pagar de nuevo.</p>
                <div className="pn-actions is-end">
                  <button type="button" className="pn-btn is-ghost" onClick={() => setConfirmDown(false)}>Cancelar</button>
                  <button type="button" className="pn-btn is-danger" onClick={() => { const apply = () => { update(takeDown); setConfirmDown(false); }; if (online) runRemote(unpublishRemote, apply); else apply(); }}>Sí, bajar la página</button>
                </div>
              </div>
            ) : (
              <div className="pn-actions is-end">
                {live
                  ? <button type="button" className="pn-btn is-ghost" onClick={() => setConfirmDown(true)}>Bajar la página</button>
                  : <button type="button" className="pn-btn" onClick={() => { const apply = () => update(republish); if (online) runRemote(publishRemote, apply); else apply(); }}>Volver a publicar</button>}
                <button type="button" className="pn-btn is-ghost" onClick={onClose}>Cerrar</button>
              </div>
            )}
            {error && <p className="pn-banner" role="alert">{error}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
