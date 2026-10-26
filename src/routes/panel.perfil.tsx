import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, LogOut } from 'lucide-react';
import { CoupleForm } from '@/components/panel/couple-form';
import { Field, useToast } from '@/components/panel/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { isEmail, strongPassword } from '@/lib/weda/logic';
import { logout, useRemote } from '@/lib/weda/remote';
import { update, useAppSelector } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/perfil')({ component: Profile });

/* Perfil: (1) los datos del casamiento (nombres, fecha, lugar y foto), que se guardan de verdad en este navegador y se ven en la página,
   la lista de regalos y la vista previa; (2) la cuenta: correo, clave y cerrar sesión. Todavía no hay cuentas reales: el correo se recuerda
   solo en este navegador, la clave NO se guarda (el cambio pide la clave actual, valida la nueva y avisa que no se aplicó) y cerrar sesión lleva a «Ingresá a Weda»
   sin borrar lo cargado. Cuando haya backend, esta pantalla ya tiene los lugares para conectarlo. */
function Profile() {
  const email = useAppSelector(s => s.email);
  const remote = useRemote();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'email' | 'pass' | null>(null);
  const close = () => setDialog(null);

  return (
    <div className="pn-page pf">
      <header className="pn-page-head is-compact">
        <div>
          <h1>Perfil</h1>
          <p className="pn-sub">Los datos de tu casamiento y los de tu cuenta.</p>
        </div>
      </header>

      <section className="pf-card" aria-labelledby="pf-wed">
        <div className="pf-head">
          <h2 id="pf-wed">Datos del casamiento</h2>
          <p>Se ven en tu página, en la lista de regalos y en la vista previa.</p>
        </div>
        <CoupleForm />
      </section>

      <section className="pf-card" aria-labelledby="pf-acc">
        <div className="pf-head">
          <h2 id="pf-acc">Tu cuenta</h2>
          <p>Con estos datos ingresás a Weda.</p>
        </div>
        <dl className="pf-rows">
          <div className="pf-row">
            <dt>Correo electrónico</dt>
            <dd className={email ? undefined : 'is-empty'}>{email || 'Todavía no cargaste un correo'}</dd>
            {!remote.user && <button type="button" className="pn-btn is-ghost is-small" onClick={() => setDialog('email')}>{email ? 'Cambiar' : 'Agregar'}</button>}
          </div>
          <div className="pf-row">
            <dt>Clave</dt>
            <dd aria-label="Clave oculta">••••••••</dd>
            {!remote.user && <button type="button" className="pn-btn is-ghost is-small" onClick={() => setDialog('pass')}>Cambiar</button>}
          </div>
        </dl>
        {remote.user
          ? <p className="pn-note">Tu casamiento se guarda en tu cuenta: podés abrirlo desde otro dispositivo. Cambiar el correo o la clave todavía no está disponible.</p>
          : <p className="pn-note">Estás en modo demostración: sin cuenta, tu casamiento se guarda solo en este navegador. Creá una cuenta o ingresá para guardarlo en Weda y abrirlo desde otro dispositivo.</p>}
        <div className="pf-out">
          <button type="button" className="pn-btn is-ghost" onClick={() => { void (remote.user ? logout() : Promise.resolve()).then(() => navigate({ to: '/crear/cuenta', search: { modo: 'ingresar' } })); }}><LogOut size={16} aria-hidden="true" />{remote.user ? 'Cerrar sesión' : 'Ingresar con una cuenta'}</button>
          <p className="pn-hint">{remote.user ? 'Al cerrar sesión se borra de este navegador la copia de tu casamiento; en tu cuenta sigue guardado.' : 'Tus datos quedan guardados en este navegador.'}</p>
        </div>
      </section>

      {dialog === 'email' && <EmailDialog current={email} onClose={close} />}
      {dialog === 'pass' && <PasswordDialog onClose={close} />}
    </div>
  );
}

function EmailDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | undefined>();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(value)) { setError('Ingresá un correo válido, por ejemplo nombre@correo.com.'); return; }
    update(s => ({ ...s, email: value.trim() }));
    toast('Correo guardado.');
    onClose();
  };
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="pn-dialog">
        <DialogTitle>{current ? 'Cambiar el correo' : 'Agregar un correo'}</DialogTitle>
        <DialogDescription>Es el correo con el que ingresás a Weda. Se guarda solo en este navegador.</DialogDescription>
        <form onSubmit={submit} noValidate className="pn-form">
          <Field label="Correo electrónico" error={error}>
            {a => <input id={a.id} type="email" inputMode="email" autoComplete="email" autoFocus value={value} onChange={e => { setValue(e.target.value); setError(undefined); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <div className="pn-actions is-end">
            <button type="button" className="pn-btn is-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="pn-btn">Guardar correo</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* Pide la clave actual, la nueva y su repetición. No hay dónde guardar ni contra qué verificar la clave actual (no hay cuentas): se exige que esté escrita,
   se valida la nueva igual que al registrarse y, si todo está bien, se avisa con claridad que no se aplicó. Con backend, la verificación va en `submit`. */
function PasswordDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  type Errors = { current?: string | undefined; next?: string | undefined; again?: string | undefined };
  const [errors, setErrors] = useState<Errors>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!current) found.current = 'Ingresá tu clave actual.';
    if (!strongPassword(next)) found.next = 'Usá 8 o más caracteres, con mayúsculas, minúsculas y un número.';
    else if (next === current) found.next = 'La clave nueva tiene que ser distinta de la actual.';
    if (!found.next && again !== next) found.again = 'Las dos claves tienen que ser iguales.';
    setErrors(found);
    const first = found.current ? 'pf-current' : found.next ? 'pf-new' : found.again ? 'pf-again' : '';
    if (first) { document.getElementById(first)?.focus(); return; }
    toast('La clave no se cambió: esta demo todavía no guarda claves.', 'error');
    onClose();
  };
  const clear = (k: keyof Errors) => setErrors(x => ({ ...x, [k]: undefined }));
  const type = show ? 'text' : 'password';
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="pn-dialog">
        <DialogTitle>Cambiar la clave</DialogTitle>
        <DialogDescription>Todavía no hay cuentas reales: podés probar el formulario, pero la clave no se guarda.</DialogDescription>
        <form onSubmit={submit} noValidate className="pn-form">
          <Field id="pf-current" label="Clave actual" error={errors.current}>
            {a => (
              <div className="pn-pass">
                <input id="pf-current" type={type} autoComplete="current-password" autoFocus value={current} onChange={e => { setCurrent(e.target.value); clear('current'); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />
                <button type="button" className="pn-pass-toggle" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar las claves' : 'Mostrar las claves'} aria-pressed={show}>
                  {show ? <EyeOff size={20} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.5} aria-hidden="true" />}
                </button>
              </div>
            )}
          </Field>
          <Field id="pf-new" label="Clave nueva" error={errors.next} hint="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
            {a => <input id="pf-new" type={type} autoComplete="new-password" value={next} onChange={e => { setNext(e.target.value); clear('next'); clear('again'); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <Field id="pf-again" label="Repetí la clave nueva" error={errors.again}>
            {a => <input id="pf-again" type={type} autoComplete="new-password" value={again} onChange={e => { setAgain(e.target.value); clear('again'); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <div className="pn-actions is-end">
            <button type="button" className="pn-btn is-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="pn-btn">Cambiar clave</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
