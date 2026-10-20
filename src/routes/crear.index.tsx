import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Field } from '@/components/panel/ui';
import { OnboardingPhoto, OnboardingShell } from '@/components/panel/onboarding';
import { validateOnboarding } from '@/lib/weda/logic';
import { update, useAppState, useHydrated } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/')({
  component: Names,
});

/* Pantalla 1 de 3: quiénes se casan. Nombre y apellido de cada uno, con el «&» en el medio. Los apellidos son opcionales.
   Después vienen la fecha y el lugar (/crear/fecha) y la foto (/crear/foto); al terminar se entra al panel. */
function Names() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();
  const filled = useRef(false);
  const [first, setFirst] = useState('');
  const [firstLast, setFirstLast] = useState('');
  const [second, setSecond] = useState('');
  const [secondLast, setSecondLast] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});

  // Si ya había datos guardados (por ejemplo, la pareja volvió desde la pantalla siguiente), se recuperan: no se pierde nada.
  useEffect(() => {
    if (!hydrated || filled.current) return;
    filled.current = true;
    setFirst(state.couple.first); setSecond(state.couple.second);
    setFirstLast(state.couple.firstLast ?? ''); setSecondLast(state.couple.secondLast ?? '');
  }, [hydrated, state]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateOnboarding({ first, second, date: '', noDate: true });
    setErrors(found);
    if (found.first || found.second) { document.getElementById(found.first ? 'on-first' : 'on-second')?.focus(); return; }
    const couple = { first: first.trim(), second: second.trim(), ...(firstLast.trim() ? { firstLast: firstLast.trim() } : {}), ...(secondLast.trim() ? { secondLast: secondLast.trim() } : {}) };
    update(s => ({ ...s, onboarded: true, couple }));
    void navigate({ to: '/crear/fecha' });
  };
  const text = (set: (v: string) => void, key?: 'first' | 'second') => (e: React.ChangeEvent<HTMLInputElement>) => { set(e.target.value); if (key) setErrors(x => ({ ...x, [key]: undefined })); };

  return (
    <OnboardingShell step={1} back="/crear/cuenta" formId="ob-names" title="Conozcámonos. ¿Cómo se llaman?" sub="Con estos datos armamos tu panel y tu sitio. Lo demás lo completás después." side={<OnboardingPhoto src="/onboarding-nombres.webp" trimLeft />}>
      <form id="ob-names" onSubmit={submit} noValidate className="pn-form">
        <div className="pn-two">
          <Field label="Tu nombre" error={errors.first}>
            {a => <input id="on-first" type="text" autoComplete="given-name" value={first} onChange={text(setFirst, 'first')} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <Field label="Tu apellido" optional>
            {a => <input id="on-first-last" type="text" autoComplete="family-name" value={firstLast} onChange={text(setFirstLast)} aria-describedby={a.describedBy} />}
          </Field>
        </div>
        <p className="ob-amp" aria-hidden="true">&amp;</p>
        <div className="pn-two">
          <Field label="Nombre de tu pareja" error={errors.second}>
            {a => <input id="on-second" type="text" autoComplete="off" value={second} onChange={text(setSecond, 'second')} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <Field label="Apellido de tu pareja" optional>
            {a => <input id="on-second-last" type="text" autoComplete="off" value={secondLast} onChange={text(setSecondLast)} aria-describedby={a.describedBy} />}
          </Field>
        </div>
      </form>
    </OnboardingShell>
  );
}
