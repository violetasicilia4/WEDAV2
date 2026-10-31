// Cambiar adónde transfieren los invitados (GIFT-14, BR-30). Dos pasos: los datos nuevos y una confirmación con lo anterior enmascarado y la clave
// actual. Las reglas las aplica el servidor (clave, versión vigente, límite por día, aviso por correo); acá se valida el formato antes de pedir la clave.
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field } from './ui';
import { cleanCbu, maskAlias, maskCbu, validateAlias, validateCbu } from '@/lib/weda/logic';
import { changePayout, errorText, type PayoutData } from '@/lib/weda/remote';

type Errors = Partial<Record<'alias' | 'cbu' | 'bank' | 'password', string>>;

const normalize = (d: PayoutData): PayoutData => ({ alias: d.alias.trim().toLowerCase(), bank: d.bank.trim(), cbu: cleanCbu(d.cbu.trim()) });
const same = (a: PayoutData, b: PayoutData) => a.alias === b.alias && a.bank === b.bank && a.cbu === b.cbu;

export function PayoutForm({ current, initial, onDone, onCancel }: { current: PayoutData; initial?: PayoutData | null; onDone: () => void; onCancel: () => void }) {
  const [data, setData] = useState<PayoutData>(initial ?? current);
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const next = normalize(data);
  const first = !current.alias && !current.bank && !current.cbu;

  useEffect(() => { if (step === 'confirm') passRef.current?.focus(); }, [step]);

  const edit = (k: keyof PayoutData, v: string) => { setData(d => ({ ...d, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); setBanner(null); };

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Errors = {};
    if (!next.alias) err.alias = 'Escribí tu alias: es lo que usan tus invitados para transferirte.';
    else { const a = validateAlias(next.alias); if (a) err.alias = a; }
    if (next.cbu) { const c = validateCbu(next.cbu); if (c) err.cbu = c; }
    if (next.bank.length > 60) err.bank = errorText('invalid_bank');
    setErrors(err);
    if (Object.keys(err).length) return;
    if (same(next, current)) { setBanner(errorText('payout_unchanged')); return; }
    setStep('confirm');
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setErrors({ password: 'Escribí tu clave actual.' }); return; }
    setBusy(true); setBanner(null);
    const r = await changePayout(next, password);
    setBusy(false);
    if (r.ok) { onDone(); return; }
    if (r.code === 'wrong_password') { setPassword(''); setErrors({ password: errorText(r.code) }); passRef.current?.focus(); return; }
    setBanner(errorText(r.code));
  };

  if (step === 'edit') return (
    <form className="pn-form" onSubmit={review} noValidate>
      <Field label="Alias" error={errors.alias}>
        {a => <input id={a.id} type="text" value={data.alias} placeholder="tomas.martina" autoComplete="off" autoCapitalize="none" spellCheck={false} onChange={e => edit('alias', e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      <Field label="Banco" optional error={errors.bank}>
        {a => <input id={a.id} type="text" value={data.bank} placeholder="Nombre del banco" autoComplete="off" maxLength={60} onChange={e => edit('bank', e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      <Field label="CBU" optional error={errors.cbu}>
        {a => <input id={a.id} type="text" inputMode="numeric" value={data.cbu} placeholder="22 números" autoComplete="off" onChange={e => edit('cbu', e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      {banner && <p className="pn-banner" role="alert">{banner}</p>}
      <div className="pn-actions is-end">
        <button type="button" className="pn-btn is-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="pn-btn">Revisar</button>
      </div>
    </form>
  );

  return (
    <form className="pn-form" onSubmit={e => void confirm(e)} noValidate>
      <p className="pn-note">{first ? 'Revisá que estén bien: tus invitados van a transferir a esta cuenta.' : 'Revisá el cambio: tus invitados van a transferir a la cuenta nueva.'}</p>
      <dl className="pn-pay">
        {!first && <div><dt>Antes</dt><dd>{maskAlias(current.alias) || 'Sin alias'}{current.cbu ? ` · CBU ${maskCbu(current.cbu)}` : ''}</dd></div>}
        <div><dt>{first ? 'Alias' : 'Ahora'}</dt><dd><code>{next.alias}</code></dd></div>
        {next.bank && <div><dt>Banco</dt><dd>{next.bank}</dd></div>}
        {next.cbu && <div><dt>CBU</dt><dd><code>{next.cbu}</code></dd></div>}
      </dl>
      <Field label="Tu clave actual" error={errors.password} hint="La pedimos para proteger adónde van los regalos.">
        {a => (
          <div className="pn-pass">
            <input id={a.id} ref={passRef} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setErrors({}); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />
            <button type="button" className="pn-pass-toggle" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar la clave' : 'Mostrar la clave'} aria-pressed={show}>
              {show ? <EyeOff size={20} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={20} strokeWidth={1.5} aria-hidden="true" />}
            </button>
          </div>
        )}
      </Field>
      <p className="pn-hint">Te avisamos por correo. Tus invitados lo ven cuando publiques los cambios de tu página.</p>
      {banner && <p className="pn-banner" role="alert">{banner}</p>}
      <div className="pn-actions is-end">
        <button type="button" className="pn-btn is-ghost" disabled={busy} onClick={() => { setStep('edit'); setPassword(''); setErrors({}); setBanner(null); }}>Volver</button>
        <button type="submit" className="pn-btn" disabled={busy} aria-busy={busy}>{busy ? 'Un momento…' : first ? 'Confirmar' : 'Confirmar cambio'}</button>
      </div>
    </form>
  );
}
