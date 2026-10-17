// Foto de portada y datos de la pareja: se usan en el onboarding y para editar después (diálogo del resumen).
import { useRef, useState } from 'react';
import { Check, ImagePlus } from 'lucide-react';
import { Field, useToast } from './ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { readImage } from '@/lib/weda/images';
import { todayIso, validateOnboarding, WEDA_COVERS } from '@/lib/weda/logic';
import { update, useAppState } from '@/lib/weda/store';
import type { PhotoChoice } from '@/lib/weda/types';

type Mode = 'upload' | 'weda' | 'none';
const modeOf = (p: PhotoChoice): Mode => (p.kind === 'upload' ? 'upload' : 'weda');

/** Elegir la foto: subir una, usar una imagen genérica de Weda o seguir sin foto. Todo es local. */
export function PhotoPicker({ value, onChange, legend = 'Foto de portada' }: { value: PhotoChoice; onChange: (p: PhotoChoice) => void; legend?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Se recuerda la última foto subida para no perderla si la pareja prueba otra opción y vuelve.
  const [last, setLast] = useState<{ src: string; name: string } | null>(value.kind === 'upload' ? { src: value.src, name: value.name } : null);
  const mode = modeOf(value);
  const wedaId = value.kind === 'weda' ? value.id : WEDA_COVERS[0]!.id;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setLoading(true);
    try { const img = await readImage(file); setLast(img); onChange({ kind: 'upload', ...img }); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos cargar la foto.'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <fieldset className="pn-photo">
      <legend>{legend} <span className="pn-opt">· opcional</span></legend>
      <div className="pn-choices" role="radiogroup" aria-label={legend}>
        <label className={`pn-choice${mode === 'upload' ? ' on' : ''}`}>
          <input type="radio" name="photo-mode" checked={mode === 'upload'} onChange={() => { if (last) onChange({ kind: 'upload', ...last }); else fileRef.current?.click(); }} />
          <ImagePlus size={20} strokeWidth={1.4} aria-hidden="true" /><span>Subir una foto</span>
        </label>
        <label className={`pn-choice${mode === 'weda' ? ' on' : ''}`}>
          <input type="radio" name="photo-mode" checked={mode === 'weda'} onChange={() => onChange({ kind: 'weda', id: wedaId })} />
          <Check size={20} strokeWidth={1.4} aria-hidden="true" /><span>Imagen de muestra</span>
        </label>
      </div>
      <input ref={fileRef} className="pn-sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void pick(e.target.files?.[0])} aria-label="Elegir una foto de tu dispositivo" />
      {mode === 'upload' && value.kind === 'upload' && (
        <div className="pn-photo-row">
          <img src={value.src} alt="" className="pn-thumb" />
          <button type="button" className="pn-link" onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? 'Cargando…' : 'Cambiar la foto'}</button>
          <button type="button" className="pn-link is-muted" onClick={() => onChange({ kind: 'none' })}>Usar la imagen de muestra</button>
        </div>
      )}
      {mode === 'weda' && (
        <ul className="pn-covers">
          {WEDA_COVERS.map(c => (
            <li key={c.id}>
              <button type="button" className={wedaId === c.id ? 'on' : ''} aria-pressed={wedaId === c.id} onClick={() => onChange({ kind: 'weda', id: c.id })}>
                <img src={c.src} alt="" /><span>{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {mode === 'weda' && <p className="pn-hint">Es una imagen de muestra: cuando tengas tu foto, subila y la reemplaza.</p>}
      {error && <p className="pn-error" role="alert">{error}</p>}
      <p className="pn-hint">JPG, PNG o WebP de hasta 8 MB. La foto se queda en tu navegador.</p>
    </fieldset>
  );
}

/** Diálogo para editar los datos básicos (nombres, fecha y foto) una vez creado el evento. */
export function CoupleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const toast = useToast();
  const [first, setFirst] = useState(state.couple.first);
  const [second, setSecond] = useState(state.couple.second);
  const [date, setDate] = useState(state.date ?? '');
  const [noDate, setNoDate] = useState(!state.date);
  const [photo, setPhoto] = useState<PhotoChoice>(state.photo);
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    // Al editar, una fecha ya guardada que quedó en el pasado se respeta (solo se exige futura si cambió).
    const changed = date !== (state.date ?? '');
    const found = validateOnboarding({ first, second, date, noDate }, changed ? todayIso() : '0000-01-01');
    setErrors(found);
    if (Object.keys(found).length) return;
    update(s => ({ ...s, couple: { first: first.trim(), second: second.trim() }, date: noDate ? null : date, photo }));
    toast('Datos guardados.');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="pn-dialog">
        <DialogTitle>Datos del casamiento</DialogTitle>
        <DialogDescription>Los cambios se ven al instante en la vista previa.</DialogDescription>
        <form onSubmit={save} noValidate className="pn-form">
          <div className="pn-two">
            <Field label="Tu nombre" error={errors.first}>{a => <input type="text" id={a.id} value={first} onChange={e => setFirst(e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
            <Field label="Nombre de tu pareja" error={errors.second}>{a => <input type="text" id={a.id} value={second} onChange={e => setSecond(e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
          </div>
          <Field label="Fecha del casamiento" error={errors.date}>{a => <input type="date" id={a.id} value={noDate ? '' : date} disabled={noDate} onChange={e => setDate(e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
          <label className="pn-check"><input type="checkbox" checked={noDate} onChange={e => { setNoDate(e.target.checked); setErrors(x => ({ ...x, date: undefined })); }} /><span>Todavía no tenemos fecha</span></label>
          <PhotoPicker value={photo} onChange={setPhoto} />
          <div className="pn-actions is-end">
            <button type="button" className="pn-btn is-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="pn-btn">Guardar</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
