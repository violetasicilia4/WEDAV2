// Piezas chicas compartidas por el flujo de creación y el panel: campos, avisos, confirmaciones, módulos bloqueados y vista previa.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Check, Lock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { coupleLabel, dateLabel, draftsFor, isSamplePhoto, photoPosition, resolvePhoto, setPlan } from '@/lib/weda/logic';
import { publishSummary } from '@/lib/weda/publish';
import { formatPrice, PLANS, planById, planFor, PRICE_UNIT, type Feature } from '@/lib/weda/plans';
import { update, useAppState, useStorageFull } from '@/lib/weda/store';
import type { PlanId } from '@/lib/weda/types';

/* ------------------------------------------------------------------ campos */

type FieldProps = { label: string; error?: string | undefined; hint?: string | undefined; optional?: boolean; children: (a: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode };

/** Etiqueta + control + ayuda + error, con los ids bien asociados (lectores de pantalla). */
export function Field({ label, error, hint, optional, children }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-h` : '', error ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`pn-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{optional && <span className="pn-opt"> · opcional</span>}</label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && <p className="pn-hint" id={`${id}-h`}>{hint}</p>}
      {error && <p className="pn-error" id={`${id}-e`} role="alert">{error}</p>}
    </div>
  );
}

/** Cruz discreta dentro de la tarjeta del flujo de creación: cierra y vuelve al inicio. */
export function FlowClose() {
  return <Link to="/" className="pn-flow-close" aria-label="Cerrar y volver al inicio"><X size={18} strokeWidth={1.6} aria-hidden="true" /></Link>;
}

/* ------------------------------------------------------------------ portada de la pareja */

/** Bloque con la foto elegida, los nombres y la fecha: hace que el panel y la lista de regalos se sientan propios. */
export function CoupleCover({ eyebrow, variant = 'home', children }: { eyebrow?: string; variant?: 'home' | 'gifts'; children?: ReactNode }) {
  const s = useAppState();
  const src = resolvePhoto(s.photo);
  const pos = isSamplePhoto(s.photo) ? photoPosition(s.photo) : undefined;
  return (
    <section className={`pn-cover is-${variant}`} aria-label={`Portada de ${coupleLabel(s.couple)}`}>
      <img className="pn-cover-img" src={src} alt="" style={pos ? { objectPosition: pos } : undefined} />
      <div className="pn-cover-text">
        {eyebrow && <p className="pn-cover-eyebrow">{eyebrow}</p>}
        <h2>{coupleLabel(s.couple)}</h2>
        <p className="pn-cover-date">{s.date ? dateLabel(s.date) : 'Fecha por definir'}</p>
      </div>
      {children && <div className="pn-cover-actions">{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ avisos */

type ToastAction = { label: string; onClick: () => void };
type ToastApi = (text: string, tone?: 'ok' | 'error', action?: ToastAction) => void;
const ToastContext = createContext<ToastApi>(() => {});
export const useToast = () => useContext(ToastContext);

/** Aviso breve y contextual (no usa alertas del navegador). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ text: string; tone: 'ok' | 'error'; n: number; action?: ToastAction | undefined } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback<ToastApi>((text, tone = 'ok', action) => {
    window.clearTimeout(timer.current);
    setT({ text, tone, n: Date.now(), action });
    timer.current = window.setTimeout(() => setT(null), action ? 8000 : tone === 'error' ? 6000 : 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Un «Deshacer» guarda una foto de la lista de ese momento: al cambiar de pantalla se cierra para que no pise cambios posteriores.
  const pathname = useRouterState({ select: r => r.location.pathname });
  useEffect(() => { window.clearTimeout(timer.current); setT(null); }, [pathname]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pn-toast-region" role="status" aria-live="polite">
        {t && (
          <p key={t.n} className={`pn-toast is-${t.tone}`}>
            <span>{t.text}</span>
            {t.action && <button type="button" onClick={() => { t.action?.onClick(); setT(null); }}>{t.action.label}</button>}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ confirmaciones */

export function ConfirmDialog({ open, title, text, confirmLabel, onConfirm, onCancel }: { open: boolean; title: string; text: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent className="pn-dialog is-small">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{text}</DialogDescription>
        <div className="pn-actions is-end">
          <button type="button" className="pn-btn is-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="pn-btn is-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ módulos que el plan no incluye */

const FEATURE_NAMES: Record<Feature, string> = {
  gifts: 'La lista de regalos', site: 'El sitio del casamiento', rsvp: 'La confirmación de asistencia',
  guests: 'La gestión de invitados', groups: 'Los grupos y las mesas', playlist: 'La música de la fiesta',
  gallery: 'La galería de fotos', message: 'El mensaje final',
};

/** Estado bloqueado: explica qué falta y a qué plan pertenece. Lo cargado se conserva como borrador. */
export function Locked({ feature, children }: { feature: Feature; children?: ReactNode }) {
  const plan = planFor(feature);
  const plans = usePlans();
  const planId = useAppState().planId;
  return (
    <div className="pn-locked">
      <span className="pn-locked-icon" aria-hidden="true"><Lock size={22} strokeWidth={1.5} /></span>
      <h2>{FEATURE_NAMES[feature]} se activa con el plan {plan?.name ?? 'Completo'}</h2>
      <p>{children ?? 'Lo que ya cargaste se conserva como borrador. Podés cambiar de plan cuando quieras: no se cobra nada al elegirlo.'}</p>
      <div className="pn-actions is-tight">
        <button type="button" className="pn-btn" onClick={plans.open}>Ver los planes</button>
        {planId && <button type="button" className="pn-link" onClick={() => update(x => ({ ...x, planId: null }))}>Volver a probar todo</button>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ vista previa */

/** Muestra la página pública REAL (la misma de /sitio/…) en un iframe. Comparte el estado local: cada cambio se ve al instante. */
export function PreviewFrame({ path, device, anchor, jump }: { path: string; device: 'mobile' | 'desktop'; anchor?: string | undefined; jump?: number | undefined }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const watch = useRef<MutationObserver | null>(null);
  // `anchor`: id de la sección de la página a la que llevar la vista previa ('' = arriba de todo).
  // Si la sección todavía no existe (por ejemplo, un evento recién cargado), espera a que aparezca.
  const go = useCallback(() => {
    watch.current?.disconnect();
    if (anchor === undefined) return;
    try {
      const w = ref.current?.contentWindow;
      if (!w) return;
      if (anchor === '') { w.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const el = w.document.getElementById(anchor);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      const obs = new MutationObserver(() => {
        const found = w.document.getElementById(anchor);
        if (found) { obs.disconnect(); found.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
      obs.observe(w.document.body, { childList: true, subtree: true });
      watch.current = obs;
      window.setTimeout(() => obs.disconnect(), 3000);
    } catch { /* la página todavía no cargó */ }
    // `jump` cambia cada vez que se pide volver a la misma sección: por eso es dependencia aunque no se lea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, jump]);
  useEffect(() => () => watch.current?.disconnect(), []);
  useEffect(go, [go]);
  return (
    <div className={`pn-frame is-${device}`}>
      <iframe ref={ref} key={path} title="Vista previa de la página para invitados" src={path} loading="lazy" onLoad={go} />
    </div>
  );
}

/* ------------------------------------------------------------------ plan y publicación */

/** Se elige el plan al publicar (no antes). Elegir NO cobra ni publica: la publicación y el pago todavía no están conectados. */
function PlansDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const [picked, setPicked] = useState<PlanId | null>(state.planId);
  const [chosen, setChosen] = useState(false);
  const plan = planById(picked);
  const summary = picked ? publishSummary(state, picked) : null;
  const drafts = picked ? draftsFor(state, picked) : [];
  const close = () => { setChosen(false); onClose(); };
  // Mirar el resumen no cambia nada: el sitio solo se ajusta al plan si la pareja lo pide («Ver mi sitio con este plan»).
  const choose = () => { if (picked) setChosen(true); };
  const applyPlan = () => { if (picked) update(s => setPlan(s, picked)); close(); };
  const backToTrial = () => { update(s => ({ ...s, planId: null })); close(); };
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className="pn-dialog pn-plans-dialog">
        {!chosen ? (
          <>
            <DialogTitle>Elegí tu plan para publicar</DialogTitle>
            <DialogDescription>Armaste todo gratis y sin tarjeta. El plan se elige recién ahora, y podés cambiarlo cuando quieras sin perder lo que cargaste.</DialogDescription>
            <div className="pn-plan-opts" role="radiogroup" aria-label="Plan">
              {PLANS.map(p => (
                <label key={p.id} className={`pn-plan-opt${picked === p.id ? ' on' : ''}`}>
                  <input type="radio" name="plan" value={p.id} checked={picked === p.id} onChange={() => setPicked(p.id)} />
                  <span className="pn-plan-opt-main"><strong>{p.name}</strong><small>{p.summary}</small></span>
                  <span className="pn-plan-opt-price"><strong>{formatPrice(p.price)}</strong><small>{PRICE_UNIT}</small></span>
                </label>
              ))}
            </div>
            {plan && (
              <div className="pn-plan-detail" aria-live="polite">
                <p className="pn-label">{plan.inherits ? `Todo lo de ${planById(plan.inherits)?.name}, y además:` : 'Incluye:'}</p>
                <ul className="pn-plan-items">{plan.items.map(it => <li key={it}><Check size={16} strokeWidth={1.6} aria-hidden="true" /><span>{it}</span></li>)}</ul>
                {drafts.length > 0 && <p className="pn-note">Con este plan, {drafts.map(d => d.label.toLowerCase()).join(', ')} no se publica{drafts.length > 1 ? 'n' : ''}: lo que cargaste queda como borrador y se publica con el plan {[...new Set(drafts.map(d => d.plan))].join(' o ')}.</p>}
              </div>
            )}
            {!picked && <p className="pn-hint pn-why" id="pn-plan-why">Elegí uno de los tres planes para ver su resumen.</p>}
            <div className="pn-actions is-end">
              <button type="button" className="pn-btn is-ghost" onClick={close}>Ahora no</button>
              <button type="button" className="pn-btn" onClick={choose} disabled={!picked} aria-describedby={picked ? undefined : 'pn-plan-why'}>{plan ? `Ver resumen con ${plan.name}` : 'Elegí un plan'}</button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>Resumen de publicación · Plan {plan?.name}</DialogTitle>
            <DialogDescription>{plan ? `${formatPrice(plan.price)} ${PRICE_UNIT}. ` : ''}Esto es lo que se publicaría con este plan. Cambiar de plan no borra nada de lo que cargaste.</DialogDescription>
            {summary && (
              <div className="pn-publish">
                {summary.published.length > 0 && (<><p className="pn-label">Se publica</p><ul className="pn-plan-items">{summary.published.map(i => <li key={i.feature}><Check size={16} strokeWidth={1.6} aria-hidden="true" /><span><strong>{i.label}</strong> · {i.detail}</span></li>)}</ul></>)}
                {summary.empty.length > 0 && (<><p className="pn-label">Incluido, pero vacío</p><ul className="pn-plan-items is-plain">{summary.empty.map(i => <li key={i.feature}><span><strong>{i.label}</strong> · {i.detail}</span></li>)}</ul></>)}
                {summary.drafts.length > 0 && (<><p className="pn-label">Queda como borrador</p><ul className="pn-plan-items is-plain">{summary.drafts.map(i => <li key={i.feature}><span><strong>{i.label}</strong> · {i.detail} Se publica desde el plan {i.plan}.</span></li>)}</ul></>)}
                <p className="pn-label">Antes de publicar</p>
                {summary.todo.length === 0
                  ? <p className="pn-note">No te falta nada de lo que Weda puede verificar. Los detalles de estilo (fotos, galería, mensaje) son opcionales.</p>
                  : <ul className="pn-plan-items is-plain pn-todo">{summary.todo.map(t => <li key={t.text}><span>{t.text}</span><Link to={t.to as never} {...(t.search ? { search: t.search as never } : {})} className="pn-link" onClick={close}>{t.cta}</Link></li>)}</ul>}
                {summary.todo.length > 0 && <p className="pn-hint">Son recomendaciones: hoy ninguna impide publicar y podés resolverlas cuando quieras.</p>}
              </div>
            )}
            <p className="pn-note" role="status"><strong>La publicación y el pago todavía no están conectados.</strong> Hoy no se cobra ni se publica nada en Internet: el sitio sigue viéndose solo en este navegador.</p>
            <p className="pn-muted">{state.planId === picked ? `Tu sitio ya se muestra con el plan ${plan?.name}.` : state.planId ? `Tu sitio se muestra con el plan ${planById(state.planId)?.name}.` : 'Mientras no elijas, ves y probás todas las funciones.'}{' '}
              {state.planId !== picked && <button type="button" className="pn-link" onClick={applyPlan}>Ver mi sitio con este plan</button>}
              {state.planId && <>{state.planId !== picked && ' · '}<button type="button" className="pn-link" onClick={backToTrial}>Volver a probar todo</button></>}</p>
            <div className="pn-actions is-end">
              <button type="button" className="pn-btn is-ghost" onClick={() => setChosen(false)}>Cambiar de plan</button>
              <button type="button" className="pn-btn" disabled aria-disabled="true">Pagar y publicar (sin conexión)</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const PlansContext = createContext<{ open: () => void }>({ open: () => {} });
export const usePlans = () => useContext(PlansContext);

/** Provee «abrir los planes» a todo el panel y renderiza el diálogo una sola vez. */
export function PlansProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useRef({ open: () => setOpen(true) }).current;
  return (
    <PlansContext.Provider value={value}>
      {children}
      {open && <PlansDialog open onClose={() => setOpen(false)} />}
    </PlansContext.Provider>
  );
}

/* ------------------------------------------------------------------ estado de guardado */

/** Los cambios se guardan solos en este dispositivo (no hay cuenta ni nube): el aviso lo dice así. */
export function SaveStatus() {
  const s = useAppState();
  const full = useStorageFull();
  const [saving, setSaving] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaving(true);
    const t = window.setTimeout(() => setSaving(false), 700);
    return () => window.clearTimeout(t);
  }, [s]);
  return <p className={`pn-save${full ? ' is-error' : ''}`} role="status" aria-live="polite">{full ? 'No se pudieron guardar los últimos cambios' : saving ? 'Guardando…' : 'Cambios guardados en este dispositivo'}</p>;
}
