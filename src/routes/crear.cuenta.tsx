import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Field, FlowClose } from '@/components/panel/ui';
import { accountDestination, hasEvent } from '@/lib/weda/account';
import { isEmail, strongPassword } from '@/lib/weda/logic';
import { errorText, login, register } from '@/lib/weda/remote';
import { getState, useAppState, useHydrated } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/cuenta')({
  // «?modo=ingresar» abre la pantalla en «Ingresá a Weda» (el botón «Iniciar sesión» de la landing).
  validateSearch: (q: Record<string, unknown>): { modo?: 'ingresar' } => (q['modo'] === 'ingresar' ? { modo: 'ingresar' } : {}),
  component: Account,
});

type Mode = 'signup' | 'login';

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);
const AppleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

/* Paso 1: cuenta. Con correo y clave se crea la cuenta o se ingresa de verdad (sesión en el servidor, src/lib/weda/remote.ts). El borrador de este navegador nunca se
   borra: si la cuenta no tenía casamiento se sube; si ya tenía uno, se abre ese y el borrador local queda guardado aparte. «Google» y «Apple» siguen siendo una simulación
   (no hay OAuth): continúan sin cuenta, en modo demostración.
   Sin avisos: la pantalla no menciona el evento guardado. */
function Account() {
  const navigate = useNavigate();
  const { modo } = Route.useSearch();
  const state = useAppState();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<Mode>(modo === 'ingresar' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ email?: string | undefined; password?: string | undefined }>({});
  const signup = mode === 'signup';
  const saved = hydrated && hasEvent(state);

  // Con evento guardado, sigue donde corresponde (panel si ya lo terminó; si no, el onboarding con lo ya cargado). Sin evento, empieza el onboarding.
  const next = () => { void navigate({ to: saved ? accountDestination(state) : '/crear' }); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!isEmail(email)) found.email = 'Ingresá un correo válido, por ejemplo nombre@correo.com.';
    if (signup ? !strongPassword(password) : !password) found.password = signup ? 'Usá 8 o más caracteres, con mayúsculas, minúsculas y un número.' : 'Ingresá tu clave.';
    setErrors(found);
    if (found.email || found.password) { document.getElementById(found.email ? 'ac-email' : 'ac-pass')?.focus(); return; }
    setBusy(true); setFormError(undefined);
    void (signup ? register : login)(email.trim(), password).then(r => {
      setBusy(false);
      if (r.ok) { const s = getState(); void navigate({ to: hasEvent(s) ? accountDestination(s) : '/crear' }); return; }
      if (r.code === 'email_taken' || r.code === 'invalid_email') setErrors({ email: errorText(r.code) });
      else if (r.code === 'invalid_credentials' || r.code === 'weak_password') setErrors({ password: errorText(r.code) });
      else setFormError(errorText(r.code));
    });
  };

  return (
    <div className="pn-account">
      <FlowClose />
      <header className="pn-account-head">
        <h1>¡Bienvenidos!</h1>
        <p>{signup ? 'Registrate en Weda' : 'Ingresá a Weda'}</p>
      </header>


      <form onSubmit={submit} noValidate className="pn-form">
        <Field id="ac-email" label="Correo electrónico" error={errors.email}>
          {a => <input id="ac-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <Field id="ac-pass" label="Clave" error={errors.password} hint={signup ? 'Mínimo 8 caracteres, con mayúscula, minúscula y número.' : undefined}>
          {a => (
            <div className="pn-pass">
              <input id="ac-pass" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => { setPassword(e.target.value); setErrors(x => ({ ...x, password: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />
              <button type="button" className="pn-pass-toggle" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar la clave' : 'Mostrar la clave'} aria-pressed={show}>
                {show ? <EyeOff size={20} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.5} aria-hidden="true" />}
              </button>
            </div>
          )}
        </Field>
        {signup && <p className="pn-terms">Al registrarte, aceptás los <strong>Términos de uso</strong> y la <strong>Política de privacidad</strong> de Weda.</p>}
        {formError && <p className="pn-banner" role="alert">{formError}</p>}
        <button type="submit" className="pn-btn pn-block" disabled={busy} aria-busy={busy}>{busy ? 'Un momento…' : signup ? 'Registrarme' : 'Ingresar'}</button>
      </form>

      <p className="pn-or" aria-hidden="true"><span>o</span></p>

      <div className="pn-social">
        <button type="button" className="pn-btn is-ghost pn-block" onClick={next}><GoogleMark />{signup ? 'Registrarme con Google' : 'Ingresar con Google'}</button>
        <button type="button" className="pn-btn is-ghost pn-block" onClick={next}><AppleMark />{signup ? 'Registrarme con Apple' : 'Ingresar con Apple'}</button>
      </div>

      <p className="pn-alt pn-account-switch">
        {signup ? '¿Ya sos miembro? ' : '¿Todavía no tenés cuenta? '}
        <button type="button" className="pn-link" onClick={() => { setMode(signup ? 'login' : 'signup'); setErrors({}); }}>{signup ? 'Ingresá' : 'Registrate'}</button>
      </p>
    </div>
  );
}
