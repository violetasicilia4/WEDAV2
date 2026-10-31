import { track } from '@/lib/analytics';
import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Field, FlowClose } from '@/components/panel/ui';
import { accountDestination, hasEvent } from '@/lib/weda/account';
import { isEmail, strongPassword } from '@/lib/weda/logic';
import { errorText, login, register, setNotice } from '@/lib/weda/remote';
import { getState, update, useAppState, useHydrated } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/cuenta')({
  // «?modo=ingresar» abre la pantalla en «Ingresá a Weda» (el botón «Iniciar sesión» de la landing).
  validateSearch: (q: Record<string, unknown>): { modo?: 'ingresar' } => (q['modo'] === 'ingresar' ? { modo: 'ingresar' } : {}),
  component: Account,
});

type Mode = 'signup' | 'login';

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);



/* Paso 1: cuenta. Con correo y clave se crea la cuenta o se ingresa de verdad (sesión en el servidor, src/lib/weda/remote.ts). El borrador de este navegador nunca se
   borra: si la cuenta no tenía casamiento se sube; si ya tenía uno, se abre ese y el borrador local queda guardado aparte. «Apple» se descartó (decisión de la dueña, 2026-10-29). «Registrarme / Ingresar con Google» se ve como el flujo real (G de colores, sin etiquetas),
   pero todavía no hay OAuth: al tocarlo NO simula una cuenta (antes avanzaba sin registrar a nadie; auditoría 2026-10-28) y avisa con honestidad que todavía
   no está habilitado y que se use el correo. Cuando exista el OAuth, este botón lo inicia.
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
  const [googleMsg, setGoogleMsg] = useState(false);
  const [errors, setErrors] = useState<{ email?: string | undefined; password?: string | undefined }>({});
  const signup = mode === 'signup';
  const saved = hydrated && hasEvent(state);

  // Con evento guardado, sigue donde corresponde (panel si ya lo terminó; si no, el onboarding con lo ya cargado). Sin evento, empieza el onboarding.
  const googleSoon = () => setGoogleMsg(true);
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
      // Si el servidor no tiene base de datos (por ejemplo un hosting de prueba), se sigue en modo demostración, como antes de que existieran las cuentas.
      if (!r.ok && r.code === 'backend_unavailable') {
        update(s => ({ ...s, email: email.trim() }));
        setNotice('No pudimos crear tu cuenta en este momento. Podés seguir armando tu casamiento y crearla más tarde.');
        next();
        return;
      }
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
          {a => <input id="ac-email" onFocus={() => { if (signup) track('signup_started'); }} type="email" inputMode="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
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
        {signup && <p className="pn-terms">Al registrarte, aceptás los <a href="/terminos" target="_blank" rel="noopener noreferrer"><strong>Términos de uso</strong></a> y la <a href="/privacidad" target="_blank" rel="noopener noreferrer"><strong>Política de privacidad</strong></a> de Weda.</p>}
        {!signup && <p className="pn-alt"><Link to="/clave" className="pn-link">¿Olvidaste tu clave?</Link></p>}
        {formError && <p className="pn-banner" role="alert">{formError}</p>}
        <button type="submit" className="pn-btn pn-block" disabled={busy || !hydrated} aria-busy={busy}>{busy ? 'Un momento…' : signup ? 'Registrarme' : 'Ingresar'}</button>
      </form>

      <div className="pn-or" aria-hidden="true">o</div>
      <button type="button" className="pn-btn is-ghost pn-block pn-social" onClick={googleSoon}><GoogleMark />{signup ? 'Registrarme con Google' : 'Ingresar con Google'}</button>
      {googleMsg && <p className="pn-banner" role="alert">El acceso con Google todavía no está habilitado. Por ahora usá tu correo y una clave.</p>}

      <p className="pn-alt pn-account-switch">
        {signup ? '¿Ya sos miembro? ' : '¿Todavía no tenés cuenta? '}
        <button type="button" className="pn-link" onClick={() => { setMode(signup ? 'login' : 'signup'); setErrors({}); }}>{signup ? 'Ingresá' : 'Registrate'}</button>
      </p>
    </div>
  );
}
