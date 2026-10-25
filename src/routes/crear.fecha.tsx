import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Field } from '@/components/panel/ui';
import { OnboardingPhoto, OnboardingShell } from '@/components/panel/onboarding';
import { todayIso, validateOnboarding } from '@/lib/weda/logic';
import { update, useAppState, useHydrated } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/fecha')({
  component: DateAndPlace,
});

/* Pantalla 2 de 3: fecha y lugar. Las dos cosas pueden quedar para después: se dejan vacías y se sigue (sin interruptores que activar).
   Si se escribe una fecha, se valida (que exista y no haya pasado). El lugar se guarda como el nombre de la ceremonia (primer momento de la página) y se puede completar desde el panel. */
function DateAndPlace() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();
  const filled = useRef(false);
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [errors, setErrors] = useState<{ date?: string | undefined }>({});

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
    const noDate = date === '';
    // En esta pantalla ya no hay interruptor «Todavía no tenemos fecha»: se deja vacía.
    const dateError = validateOnboarding({ first: state.couple.first, second: state.couple.second, date, noDate }).date?.replace('marcá «Todavía no tenemos fecha»', 'dejala vacía');
    setErrors({ date: dateError });
    if (dateError) { document.getElementById('on-date')?.focus(); return; }
    update(s => ({
      ...s,
      date: noDate ? null : date,
      site: { ...s.site, events: s.site.events.map((ev, i) => (i === 0 && place.trim() ? { ...ev, name: place.trim() } : ev)) },
    }));
    void navigate({ to: '/crear/foto' });
  };

  return (
    <OnboardingShell step={2} back="/crear" formId="ob-date" title="¿Cuándo y dónde?" sub="Si todavía no lo saben, pueden dejarlo vacío y completarlo cuando quieran." side={<OnboardingPhoto src="/onboarding-fecha.webp" />}>
      <form id="ob-date" onSubmit={submit} noValidate className="pn-form">
        <Field id="on-date" label="Fecha del casamiento" optional error={errors.date}>
          {a => <input id="on-date" type="date" min={todayIso()} value={date} onChange={e => { setDate(e.target.value); setErrors(x => ({ ...x, date: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <Field id="on-place" label="Lugar del casamiento" optional>
          {a => <input id="on-place" type="text" autoComplete="off" placeholder="Salón, jardín o ciudad" value={place} onChange={e => setPlace(e.target.value)} aria-describedby={a.describedBy} />}
        </Field>
      </form>
    </OnboardingShell>
  );
}
