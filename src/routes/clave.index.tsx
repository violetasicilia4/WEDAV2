import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Field, FlowClose } from '@/components/panel/ui';
import { isEmail } from '@/lib/weda/logic';
import { api, ApiFailure, errorText } from '@/lib/weda/remote';
import { useHydrated } from '@/lib/weda/store';
import { pageMeta } from '@/lib/site';

/* Recuperar la clave, paso 1: pedir el enlace por correo. La respuesta es la misma exista o no la cuenta (el servidor no lo revela). */
export const Route = createFileRoute('/clave/')({
  head: () => {
    const { meta } = pageMeta({ title: 'Recuperar la clave • Weda', description: 'Pedí un enlace para elegir una clave nueva.', path: '/clave' });
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Forgot,
});

function Forgot() {
  const hydrated = useHydrated();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) { setError('Ingresá un correo válido, por ejemplo nombre@correo.com.'); document.getElementById('fg-email')?.focus(); return; }
    setState('busy'); setError(undefined);
    try { await api('POST', '/api/auth/forgot', { email: email.trim() }); setState('sent'); }
    catch (err) { setState('idle'); setError(errorText(err instanceof ApiFailure ? err.code : 'network')); }
  };
  return (
    <div className="pn-account">
      <FlowClose />
      <header className="pn-account-head">
        <h1>Recuperar la clave</h1>
        <p>{state === 'sent' ? 'Revisá tu correo' : 'Te mandamos un enlace para elegir una nueva'}</p>
      </header>
      {state === 'sent' ? (
        <div className="pn-form">
          <p className="pn-note" role="status">Si hay una cuenta con <strong>{email.trim()}</strong>, te llega un correo con el enlace. Vale por una hora. Si no lo ves, revisá la carpeta de spam.</p>
          <Link to="/crear/cuenta" search={{ modo: 'ingresar' }} className="pn-btn pn-block">Volver a ingresar</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="pn-form">
          <Field id="fg-email" label="Correo electrónico" error={error}>
            {a => <input id="fg-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(undefined); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <button type="submit" className="pn-btn pn-block" disabled={state === 'busy' || !hydrated} aria-busy={state === 'busy'}>{state === 'busy' ? 'Un momento…' : 'Mandarme el enlace'}</button>
          <p className="pn-alt"><Link to="/crear/cuenta" search={{ modo: 'ingresar' }} className="pn-link">Volver a ingresar</Link></p>
        </form>
      )}
    </div>
  );
}
