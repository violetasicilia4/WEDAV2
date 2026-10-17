// Piezas chicas compartidas por el flujo de creación y el panel: campos, avisos, confirmaciones, módulos bloqueados y vista previa.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { planFor, type Feature } from '@/lib/weda/plans';
import { useAppState, useStorageFull } from '@/lib/weda/store';

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
};

/** Estado bloqueado: explica qué falta y a qué plan pertenece. No simula que la función esté disponible. */
export function Locked({ feature, children }: { feature: Feature; children?: ReactNode }) {
  const plan = planFor(feature);
  return (
    <div className="pn-locked">
      <span className="pn-locked-icon" aria-hidden="true"><Lock size={22} strokeWidth={1.5} /></span>
      <h2>{FEATURE_NAMES[feature]} no está incluida en tu plan</h2>
      <p>{children ?? `Está disponible desde el plan ${plan?.name ?? 'Completo'}. Podés cambiar de plan cuando quieras: no se cobra nada al elegirlo.`}</p>
      <Link to="/crear/plan" className="pn-btn">Ver los planes</Link>
    </div>
  );
}

/* ------------------------------------------------------------------ vista previa */

/** Muestra la página pública REAL (la misma de /sitio/…) en un iframe. Comparte el estado local: cada cambio se ve al instante. */
export function PreviewFrame({ path, device, anchor }: { path: string; device: 'mobile' | 'desktop'; anchor?: string | undefined }) {
  const ref = useRef<HTMLIFrameElement>(null);
  // `anchor`: id de la sección de la página a la que llevar la vista previa ('' = arriba de todo).
  const go = useCallback(() => {
    if (anchor === undefined) return;
    try {
      const w = ref.current?.contentWindow;
      if (!w) return;
      if (anchor === '') w.scrollTo({ top: 0, behavior: 'smooth' });
      else w.document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* la página todavía no cargó */ }
  }, [anchor]);
  useEffect(go, [go]);
  return (
    <div className={`pn-frame is-${device}`}>
      <iframe ref={ref} key={path} title="Vista previa de la página para invitados" src={path} loading="lazy" onLoad={go} />
    </div>
  );
}

/* ------------------------------------------------------------------ publicar */

/** «Publicar» no publica ni cobra nada: explica qué falta. No simula una contratación. */
export function PublishDialog({ open, onClose, showPreviewLink = true }: { open: boolean; onClose: () => void; showPreviewLink?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="pn-dialog is-small">
        <DialogTitle>Todavía no se puede publicar</DialogTitle>
        <DialogDescription>La publicación y el pago se van a habilitar cuando el servicio esté conectado. Hoy podés armar todo y revisarlo como invitado. No se cobró nada ni se publicó nada en Internet.</DialogDescription>
        <div className="pn-actions">
          {showPreviewLink && <Link to="/panel/vista-previa" className="pn-btn" onClick={onClose}>Ver como invitado</Link>}
          <button type="button" className="pn-btn is-ghost" onClick={onClose}>Entendido</button>
        </div>
      </DialogContent>
    </Dialog>
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
