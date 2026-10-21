import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Field } from '@/components/panel/ui';
import { OnboardingPhoto, OnboardingShell } from '@/components/panel/onboarding';
import { todayIso, validateOnboarding } from '@/lib/weda/logic';
import { update, useAppState, useHydrated } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/fecha')({
  component: DateAndPlace,
});

/* Pantalla 2 de 3: fecha y lugar. Las dos cosas pueden quedar para después: nadie se bloquea por no tenerlas todavía.
   El lugar se guarda como el nombre de la ceremonia (primer momento de la página) y se puede completar desde el panel. */
function DateAndPlace() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();
  const filled = useRef(false);
  const [date, setDate] = useState('');
  const [noDate, setNoDate] = useState(false);
  const [place, setPlace] = useState('');
  const [noPlace, setNoPlace] = useState(false);
  const [errors, setErrors] = useState<{ date?: string | undefined; place?: string | undefined }>({});

  // Sin nombres no hay evento: se vuelve a la primera pantalla.
  useEffect(() => {
    if (hydrated && !state.onboarded) void navigate({ to: '/crear', replace: true });
  }, [hydrated, state.onboarded, navigate]);

  useEffect(() => {
    if (!hydrated || filled.current) return;
    filled.current = true;
    setDate(state.date ?? '');
    setPlace(state.site.events[0]?.name ?? '');
  }, [hydrated, state]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateError = validateOnboarding({ first: state.couple.first, second: state.couple.second, date, noDate }).date;
    const placeError = !noPlace && !place.trim() ? 'Escribí el lugar o marcá «Todavía no tenemos lugar».' : undefined;
    setErrors({ date: dateError, place: placeError });
    if (dateError || placeError) { document.getElementById(dateError ? 'on-date' : 'on-place')?.focus(); return; }
    update(s => ({
      ...s,
      date: noDate ? null : date,
      site: { ...s.site, events: s.site.events.map((ev, i) => (i === 0 && !noPlace ? { ...ev, name: place.trim() } : ev)) },
    }));
    void navigate({ to: '/crear/foto' });
  };

  return (
    <OnboardingShell step={2} back="/crear" formId="ob-date" title="¿Cuándo y dónde?" sub="Si todavía no lo saben, no pasa nada: lo completan cuando quieran." side={<OnboardingPhoto src="/onboarding-fecha.webp" />}>
      <form id="ob-date" onSubmit={submit} noValidate className="pn-form">
        <Field id="on-date" label="Fecha del casamiento" error={errors.date}>
          {a => <input id="on-date" type="date" min={todayIso()} value={noDate ? '' : date} disabled={noDate} onChange={e => { setDate(e.target.value); setErrors(x => ({ ...x, date: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <label className="pn-toggle">
          <input type="checkbox" role="switch" checked={noDate} onChange={e => { setNoDate(e.target.checked); setErrors(x => ({ ...x, date: undefined })); }} />
          <span className="pn-toggle-track" aria-hidden="true" />
          <span>Todavía no tenemos fecha</span>
        </label>
        <Field id="on-place" label="Lugar del casamiento" error={errors.place}>
          {a => <input id="on-place" type="text" autoComplete="off" placeholder="Salón, jardín o ciudad" value={noPlace ? '' : place} disabled={noPlace} onChange={e => { setPlace(e.target.value); setErrors(x => ({ ...x, place: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <label className="pn-toggle">
          <input type="checkbox" role="switch" checked={noPlace} onChange={e => { setNoPlace(e.target.checked); setErrors(x => ({ ...x, place: undefined })); }} />
          <span className="pn-toggle-track" aria-hidden="true" />
          <span>Todavía no tenemos lugar</span>
        </label>
      </form>
    </OnboardingShell>
  );
}
