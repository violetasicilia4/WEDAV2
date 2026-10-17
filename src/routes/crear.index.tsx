import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Field } from '@/components/panel/ui';
import { PhotoPicker } from '@/components/panel/couple-form';
import { coupleLabel, dateShort, photoPosition, resolvePhoto, todayIso, validateOnboarding } from '@/lib/weda/logic';
import { isPlanId } from '@/lib/weda/plans';
import { seedState } from '@/lib/weda/seed';
import { replace, update, useAppState, useHydrated } from '@/lib/weda/store';
import type { PhotoChoice, PlanId } from '@/lib/weda/types';

export const Route = createFileRoute('/crear/')({
  validateSearch: (s: Record<string, unknown>): { plan?: PlanId } => (isPlanId(s['plan']) ? { plan: s['plan'] } : {}),
  component: Onboarding,
});

/* Paso 1: datos del casamiento. La fecha y la foto son opcionales: nadie queda bloqueado por no tenerlas todavía. */
function Onboarding() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const state = useAppState();
  const hydrated = useHydrated();
  const filled = useRef(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [date, setDate] = useState('');
  const [noDate, setNoDate] = useState(false);
  const [photo, setPhoto] = useState<PhotoChoice>({ kind: 'none' });
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});

  // Si ya había datos guardados (por ejemplo, la pareja volvió desde el paso 2), se recuperan: no se pierde nada.
  useEffect(() => {
    if (!hydrated || filled.current) return;
    filled.current = true;
    if (search.plan) update(s => ({ ...s, preferredPlan: search.plan ?? null }));
    if (state.couple.first || state.couple.second || state.onboarded) {
      setFirst(state.couple.first); setSecond(state.couple.second);
      setDate(state.date ?? ''); setNoDate(state.onboarded && !state.date);
      setPhoto(state.photo);
    }
  }, [hydrated, state, search.plan]);

  const previewSrc = resolvePhoto(photo);
  const names = coupleLabel({ first: first || 'Nombre', second: second || 'Nombre' });
  const initials = [first, second].map(n => n.trim().charAt(0).toUpperCase()).filter(Boolean).join(' & ');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateOnboarding({ first, second, date, noDate });
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(found.first ? 'on-first' : found.second ? 'on-second' : 'on-date')?.focus();
      return;
    }
    update(s => ({ ...s, onboarded: true, couple: { first: first.trim(), second: second.trim() }, date: noDate ? null : date, photo }));
    void navigate({ to: '/crear/plan' });
  };

  const tryExample = () => { replace(seedState()); void navigate({ to: '/panel' }); };

  return (
    <div className="pn-onboard">
      <form onSubmit={submit} noValidate className="pn-form">
        <h1>Creá tu evento</h1>
        <p className="pn-lead">Contanos lo básico. Lo demás lo completás después, a tu ritmo.</p>
        <p className="pn-demo-note">Es una demostración: lo que cargues se guarda solo en este navegador y no se envía a ningún servidor.</p>

        <div className="pn-two">
          <Field label="Tu nombre" error={errors.first}>
            {a => <input id="on-first" type="text" autoComplete="given-name" value={first} onChange={e => { setFirst(e.target.value); setErrors(x => ({ ...x, first: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <Field label="El nombre de tu pareja" error={errors.second}>
            {a => <input id="on-second" type="text" autoComplete="off" value={second} onChange={e => { setSecond(e.target.value); setErrors(x => ({ ...x, second: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
        </div>

        <Field label="Fecha del casamiento" error={errors.date}>
          {a => <input id="on-date" type="date" min={todayIso()} value={noDate ? '' : date} disabled={noDate} onChange={e => { setDate(e.target.value); setErrors(x => ({ ...x, date: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <label className="pn-check">
          <input type="checkbox" checked={noDate} onChange={e => { setNoDate(e.target.checked); setErrors(x => ({ ...x, date: undefined })); }} />
          <span>Todavía no tenemos fecha</span>
        </label>

        <PhotoPicker value={photo} onChange={setPhoto} />

        <div className="pn-actions">
          <button type="submit" className="pn-btn">Continuar</button>
          <Link to="/" className="pn-link is-muted">Volver a Weda</Link>
        </div>
        <p className="pn-alt">¿Querés recorrer todo sin cargar nada? <button type="button" className="pn-link" onClick={tryExample}>Probar con Tomás y Martina</button></p>
      </form>

      <aside className="pn-live" aria-label="Así se va a ver tu portada">
        <p className="pn-live-label">Así se va a ver tu portada</p>
        <div className={`pn-live-cover${previewSrc ? '' : ' is-plain'}`}>
          {previewSrc ? <img src={previewSrc} alt="" style={{ objectPosition: photoPosition(photo) }} /> : <span className="pn-live-mono" aria-hidden="true">{initials || 'W'}</span>}
          <div className="pn-live-copy">
            <p>¡Nos casamos!</p>
            <strong>{names.replace(/\s*&\s*/, ' y ')}</strong>
            <span>{noDate || !date ? 'Fecha a confirmar' : dateShort(date)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
