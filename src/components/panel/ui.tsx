// Piezas chicas compartidas por el flujo de creación y el panel: campos, avisos, confirmaciones, operaciones bloqueadas y vista previa.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Lock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { coupleLabel, dateLabel, isSamplePhoto, photoPosition, resolvePhoto } from '@/lib/weda/logic';
import { planForOperation, type Operation } from '@/lib/weda/plans';
import { useRemote } from '@/lib/weda/remote';
import { PublishDialog } from '@/components/panel/publish-dialog';
import { update, useAppState } from '@/lib/weda/store';
// Estilos del panel: viajan con el código de las pantallas que usan estos componentes, no con la landing (auditoría F-06).
import '@/panel.css';

/* ------------------------------------------------------------------ campos */

type FieldProps = { label: string; /** Id del control si ya tiene uno fijo (lo usan tests y el foco al validar): la etiqueta queda asociada a ese. Sin él se genera uno. */ id?: string; error?: string | undefined; hint?: string | undefined; optional?: boolean; children: (a: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode };

/** Etiqueta + control + ayuda + error, con los ids bien asociados (lectores de pantalla). */
export function Field({ label, id: fixedId, error, hint, optional, children }: FieldProps) {
  const auto = useId();
  const id = fixedId ?? auto;
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

/**
 * Aviso de una operación bloqueada (BR-62): la sección se sigue viendo y los botones de gestión quedan deshabilitados; esto explica qué los
 * desbloquea. `id` va en el `aria-describedby` de esos botones. Con el trial vencido (BR-64) explica cómo seguir.
 */
export function OperationNotice({ id, op }: { id: string; op: Operation }) {
  const plans = usePlans();
  const access = useRemote().access;
  const plan = planForOperation(op);
  const paused = access?.state === 'paused';
  const paidWaiting = access?.state === 'paid_unpublished';
  return (
    <div className="pn-opnotice" id={id} role="note">
      <Lock size={16} strokeWidth={1.6} aria-hidden="true" />
      <p>
        {paused
          ? `Terminó tu período gratuito. Se habilita al contratar y publicar con ${plan?.name ?? 'Celebración'}.`
          : paidWaiting
            ? `Tu pago está confirmado: se habilita cuando publiques tu página.`
            : `Se habilita al publicar con ${plan?.name ?? 'Celebración'}. Mientras tanto podés ver cómo funciona.`}
      </p>
      <button type="button" className="pn-link" onClick={plans.open}>{paidWaiting ? 'Publicar' : paused ? 'Elegir plan' : 'Ver qué incluye'}</button>
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
      <iframe ref={ref} key={path} title="Vista previa de la página para invitados" src={`${path}${path.includes('?') ? '&' : '?'}borrador`} loading="lazy" onLoad={go} />
    </div>
  );
}

/* ------------------------------------------------------------------ plan y publicación */

const PlansContext = createContext<{ open: () => void }>({ open: () => {} });
export const usePlans = () => useContext(PlansContext);

/** Provee «abrir los planes» a todo el panel y renderiza el diálogo una sola vez. */
export function PlansProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useRef({ open: () => setOpen(true) }).current;
  return (
    <PlansContext.Provider value={value}>
      {children}
      {open && <PublishDialog open onClose={() => setOpen(false)} />}
    </PlansContext.Provider>
  );
}

/* ------------------------------------------------------------------ estado de guardado */
