import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Field, FlowClose } from '@/components/panel/ui';
import { strongPassword } from '@/lib/weda/logic';
import { api, ApiFailure, errorText } from '@/lib/weda/remote';
import { useHydrated } from '@/lib/weda/store';
import { pageMeta } from '@/lib/site';

/* Recuperar la clave, paso 2: el enlace del correo trae el token (un solo uso, una hora). Al cambiarla se cierran todas las sesiones. */
export const Route = createFileRoute('/clave/nueva')({
  validateSearch: (q: Record<string, unknown>): { token?: string } => (typeof q['token'] === 'string' ? { token: q['token'] } : {}),
  head: () => {
    const { meta } = pageMeta({ title: 'Elegí una clave nueva • Weda', description: 'Elegí una clave nueva para tu cuenta de Weda.', path: '/clave/nueva' });
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Reset,
});

function Reset() {
  const { token } = Route.useSearch();
  const hydrated = useHydrated();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ password?: string | undefined; again?: string | undefined }>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!strongPassword(password)) found.password = 'Usá 8 o más caracteres, con mayúsculas, minúsculas y un número.';
    else if (again !== password) found.again = 'Las dos claves tienen que ser iguales.';
    setErrors(found);
    if (found.password || found.again) { document.getElementById(found.password ? 'rs-pass' : 'rs-again')?.focus(); return; }
    setState('busy'); setFormError(undefined);
    try { await api('POST', '/api/auth/reset', { token, password }); setState('done'); }
    catch (err) { setState('idle'); setFormError(errorText(err instanceof ApiFailure ? err.code : 'network')); }
  };
  const type = show ? 'text' : 'password';
  return (
    <div className="pn-account">
      <FlowClose />
      <header className="pn-account-head">
        <h1>Elegí una clave nueva</h1>
        <p>Para tu cuenta de Weda</p>
      </header>
      {!token ? (
        <div className="pn-form">
          <p className="pn-note">Este enlace está incompleto. Abrí el enlace del correo tal como llegó, o pedí uno nuevo.</p>
          <Link to="/clave" className="pn-btn pn-block">Pedir un enlace nuevo</Link>
        </div>
      ) : state === 'done' ? (
        <div className="pn-form">
          <p className="pn-note" role="status">Listo: cambiaste tu clave. Por seguridad cerramos las sesiones abiertas: ingresá con la clave nueva.</p>
          <Link to="/crear/cuenta" search={{ modo: 'ingresar' }} className="pn-btn pn-block">Ingresar</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="pn-form">
          <Field id="rs-pass" label="Clave nueva" error={errors.password} hint="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
            {a => (
              <div className="pn-pass">
                <input id="rs-pass" type={type} autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setErrors(x => ({ ...x, password: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />
                <button type="button" className="pn-pass-toggle" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar la clave' : 'Mostrar la clave'} aria-pressed={show}>
                  {show ? <EyeOff size={20} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.5} aria-hidden="true" />}
                </button>
              </div>
            )}
          </Field>
          <Field id="rs-again" label="Repetila" error={errors.again}>
            {a => <input id="rs-again" type={type} autoComplete="new-password" value={again} onChange={e => { setAgain(e.target.value); setErrors(x => ({ ...x, again: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          {formError && <p className="pn-banner" role="alert">{formError} {formError.includes('Pedí uno nuevo') && <Link to="/clave" className="pn-link">Pedir otro enlace</Link>}</p>}
          <button type="submit" className="pn-btn pn-block" disabled={state === 'busy' || !hydrated} aria-busy={state === 'busy'}>{state === 'busy' ? 'Un momento…' : 'Cambiar la clave'}</button>
        </form>
      )}
    </div>
  );
}
