import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Field } from '@/components/panel/ui';
import { todayIso, validateOnboarding } from '@/lib/weda/logic';
import { update, useAppState, useHydrated } from '@/lib/weda/store';
import type { PhotoChoice } from '@/lib/weda/types';

export const Route = createFileRoute('/crear/')({
  component: Onboarding,
});

/* Paso 2: datos del casamiento. La fecha es opcional: nadie queda bloqueado por no tenerla todavía. La foto se pide en el paso siguiente (/crear/foto). */
function Onboarding() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();
  const filled = useRef(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [date, setDate] = useState('');
  const [noDate, setNoDate] = useState(false);
  // La foto se pide en el paso siguiente: acá se conserva la que hubiera (o la imagen de muestra).
  const [photo, setPhoto] = useState<PhotoChoice>({ kind: 'none' });
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});

  // Si ya había datos guardados (por ejemplo, la pareja volvió desde el paso 2), se recuperan: no se pierde nada.
  useEffect(() => {
    if (!hydrated || filled.current) return;
    filled.current = true;
    if (state.couple.first || state.couple.second || state.onboarded) {
      setFirst(state.couple.first); setSecond(state.couple.second);
      setDate(state.date ?? ''); setNoDate(state.onboarded && !state.date);
      setPhoto(state.photo);
    }
  }, [hydrated, state]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateOnboarding({ first, second, date, noDate });
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(found.first ? 'on-first' : found.second ? 'on-second' : 'on-date')?.focus();
      return;
    }
    update(s => ({ ...s, onboarded: true, couple: { first: first.trim(), second: second.trim() }, date: noDate ? null : date, photo }));
    void navigate({ to: '/crear/foto' });
  };

  return (
    <div className="pn-account">
      <header className="pn-account-head">
        <h1>Creá tu evento</h1>
        <p className="is-soft">Contanos lo básico. Lo demás lo completás después.</p>
      </header>

      <form onSubmit={submit} noValidate className="pn-form">
        <Field label="Tu nombre" error={errors.first}>
          {a => <input id="on-first" type="text" autoComplete="given-name" value={first} onChange={e => { setFirst(e.target.value); setErrors(x => ({ ...x, first: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <Field label="El nombre de tu pareja" error={errors.second}>
          {a => <input id="on-second" type="text" autoComplete="off" value={second} onChange={e => { setSecond(e.target.value); setErrors(x => ({ ...x, second: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <Field label="Fecha del casamiento" error={errors.date}>
          {a => <input id="on-date" type="date" min={todayIso()} value={noDate ? '' : date} disabled={noDate} onChange={e => { setDate(e.target.value); setErrors(x => ({ ...x, date: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <label className="pn-toggle">
          <input type="checkbox" role="switch" checked={noDate} onChange={e => { setNoDate(e.target.checked); setErrors(x => ({ ...x, date: undefined })); }} />
          <span className="pn-toggle-track" aria-hidden="true" />
          <span>Todavía no tenemos fecha</span>
        </label>
        <button type="submit" className="pn-btn pn-block">Continuar</button>
      </form>

    </div>
  );
}
