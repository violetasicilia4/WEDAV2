// Cambiar la clave desde el perfil (con la sesión abierta): clave actual, nueva y confirmación. El servidor vuelve a validar todo,
// exige la clave actual y cierra las demás sesiones; esta sigue abierta.
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field } from './ui';
import { strongPassword } from '@/lib/weda/logic';
import { changePassword, errorText } from '@/lib/weda/remote';

type Errors = { current?: string | undefined; next?: string | undefined; again?: string | undefined };

export function PasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  // Se abre con un toque en «Cambiar»: el foco va directo a la clave actual.
  useEffect(() => { document.getElementById('pw-current')?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found: Errors = {};
    if (!current) found.current = 'Escribí tu clave actual.';
    if (!strongPassword(next)) found.next = errorText('weak_password');
    else if (next === current) found.next = 'La clave nueva tiene que ser distinta de la actual.';
    else if (again !== next) found.again = 'Las dos claves tienen que ser iguales.';
    setErrors(found); setFormError(undefined);
    const first = found.current ? 'pw-current' : found.next ? 'pw-next' : found.again ? 'pw-again' : null;
    if (first) { document.getElementById(first)?.focus(); return; }
    setBusy(true);
    const r = await changePassword(current, next);
    setBusy(false);
    if (r.ok) { onDone(); return; }
    // La clave actual equivocada se marca en su campo; el resto (red, límite de intentos, sesión vencida) va en el aviso del formulario.
    if (r.code === 'wrong_password') { setErrors({ current: errorText(r.code) }); setCurrent(''); document.getElementById('pw-current')?.focus(); }
    else if (r.code === 'weak_password') setErrors({ next: errorText(r.code) });
    else setFormError(errorText(r.code));
  };

  const type = show ? 'text' : 'password';
  return (
    <form onSubmit={submit} noValidate className="pn-form" aria-label="Cambiar la clave">
      <Field id="pw-current" label="Clave actual" error={errors.current}>
        {a => (
          <div className="pn-pass">
            <input id="pw-current" type={type} autoComplete="current-password" value={current} onChange={e => { setCurrent(e.target.value); setErrors(x => ({ ...x, current: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />
            <button type="button" className="pn-pass-toggle" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar las claves' : 'Mostrar las claves'} aria-pressed={show}>
              {show ? <EyeOff size={20} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.5} aria-hidden="true" />}
            </button>
          </div>
        )}
      </Field>
      <Field id="pw-next" label="Clave nueva" error={errors.next} hint="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
        {a => <input id="pw-next" type={type} autoComplete="new-password" value={next} onChange={e => { setNext(e.target.value); setErrors(x => ({ ...x, next: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      <Field id="pw-again" label="Repetí la clave nueva" error={errors.again}>
        {a => <input id="pw-again" type={type} autoComplete="new-password" value={again} onChange={e => { setAgain(e.target.value); setErrors(x => ({ ...x, again: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      {formError && <p className="pn-banner" role="alert">{formError}</p>}
      <div className="pn-actions is-end">
        <button type="button" className="pn-btn is-ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="submit" className="pn-btn" disabled={busy} aria-busy={busy}>{busy ? 'Un momento…' : 'Cambiar la clave'}</button>
      </div>
    </form>
  );
}
