// Foto de portada y datos de la pareja: se usan en el onboarding y para editar después (diálogo del resumen).
import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Field, useToast } from './ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { readImage } from '@/lib/weda/images';
import { todayIso, validateOnboarding } from '@/lib/weda/logic';
import { update, useAppState } from '@/lib/weda/store';
import type { PhotoChoice } from '@/lib/weda/types';

/** Elegir la foto: subir una propia o seguir sin foto (mientras tanto, el sitio usa una imagen provisoria de Weda). Todo es local. */
export function PhotoPicker({ value, onChange, legend = 'Foto de portada' }: { value: PhotoChoice; onChange: (p: PhotoChoice) => void; legend?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Se recuerda la última foto subida para no perderla si la pareja prueba otra opción y vuelve.
  const [last, setLast] = useState<{ src: string; name: string } | null>(value.kind === 'upload' ? { src: value.src, name: value.name } : null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setLoading(true);
    try { const img = await readImage(file); setLast(img); onChange({ kind: 'upload', ...img }); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos cargar la foto.'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const uploaded = value.kind === 'upload';
  return (
    <fieldset className="pn-photo">
      <legend>{legend} <span className="pn-opt">· Opcional · Podés cambiarla después</span></legend>
      <div className="pn-photo-row">
        <button type="button" className="pn-btn is-ghost is-small" onClick={() => fileRef.current?.click()} disabled={loading}>
          <ImagePlus size={18} strokeWidth={1.4} aria-hidden="true" />{loading ? 'Cargando…' : uploaded ? 'Cambiar la foto' : 'Subir una foto'}
        </button>
        {last && (
          <button type="button" className={`pn-cover-pick${uploaded ? ' on' : ''}`} aria-pressed={uploaded} onClick={() => onChange({ kind: 'upload', ...last })}>
            <img src={last.src} alt="" /><span>Tu foto</span>
          </button>
        )}
      </div>
      <input ref={fileRef} className="pn-sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void pick(e.target.files?.[0])} aria-label="Elegir una foto de tu dispositivo" />
      {error && <p className="pn-error" role="alert">{error}</p>}
      <p className="pn-hint">{uploaded ? 'JPG, PNG o WebP de hasta 8 MB. La foto se queda en tu navegador.' : 'La podés reemplazar por tu foto cuando quieras (JPG, PNG o WebP de hasta 8 MB; se queda en tu navegador).'}</p>
    </fieldset>
  );
}

/** Diálogo para editar los datos básicos (nombres y apellidos, fecha, lugar y foto) una vez creado el evento. En el resumen solo se muestran los nombres. */
export function CoupleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState();
  const toast = useToast();
  const [first, setFirst] = useState(state.couple.first);
  const [firstLast, setFirstLast] = useState(state.couple.firstLast ?? '');
  const [second, setSecond] = useState(state.couple.second);
  const [secondLast, setSecondLast] = useState(state.couple.secondLast ?? '');
  const [date, setDate] = useState(state.date ?? '');
  const [noDate, setNoDate] = useState(!state.date);
  // El lugar es el nombre de la ceremonia (primer momento de la página): se completa o se edita también desde «Tu página».
  const [place, setPlace] = useState(state.site.events[0]?.name ?? '');
  const [noPlace, setNoPlace] = useState(!(state.site.events[0]?.name ?? '').trim());
  const [placeError, setPlaceError] = useState<string | undefined>();
  const [photo, setPhoto] = useState<PhotoChoice>(state.photo);
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    // Al editar, una fecha ya guardada que quedó en el pasado se respeta (solo se exige futura si cambió).
    const changed = date !== (state.date ?? '');
    const found = validateOnboarding({ first, second, date, noDate }, changed ? todayIso() : '0000-01-01');
    setErrors(found);
    const missingPlace = !noPlace && !place.trim() ? 'Escribí el lugar o marcá «Todavía no tenemos lugar».' : undefined;
    setPlaceError(missingPlace);
    if (Object.keys(found).length || missingPlace) return;
    const couple = { first: first.trim(), second: second.trim(), ...(firstLast.trim() ? { firstLast: firstLast.trim() } : {}), ...(secondLast.trim() ? { secondLast: secondLast.trim() } : {}) };
    update(s => ({
      ...s, couple, date: noDate ? null : date, photo,
      site: { ...s.site, events: s.site.events.map((ev, i) => (i === 0 ? { ...ev, name: noPlace ? '' : place.trim() } : ev)) },
    }));
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
            <Field label="Tu nombre" error={errors.first}>{a => <input type="text" id={a.id} autoComplete="given-name" value={first} onChange={e => setFirst(e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
            <Field label="Tu apellido">{a => <input type="text" id={a.id} autoComplete="family-name" value={firstLast} onChange={e => setFirstLast(e.target.value)} aria-describedby={a.describedBy} />}</Field>
          </div>
          <div className="pn-two">
            <Field label="Nombre de tu pareja" error={errors.second}>{a => <input type="text" id={a.id} autoComplete="off" value={second} onChange={e => setSecond(e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
            <Field label="Apellido de tu pareja">{a => <input type="text" id={a.id} autoComplete="off" value={secondLast} onChange={e => setSecondLast(e.target.value)} aria-describedby={a.describedBy} />}</Field>
          </div>
          <Field label="Fecha del casamiento" error={errors.date}>{a => <input type="date" id={a.id} value={noDate ? '' : date} disabled={noDate} onChange={e => setDate(e.target.value)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
          <label className="pn-check"><input type="checkbox" checked={noDate} onChange={e => { setNoDate(e.target.checked); setErrors(x => ({ ...x, date: undefined })); }} /><span>Todavía no tenemos fecha</span></label>
          <Field label="Lugar del casamiento" error={placeError}>{a => <input type="text" id={a.id} autoComplete="off" placeholder="Salón, jardín o ciudad" value={noPlace ? '' : place} disabled={noPlace} onChange={e => { setPlace(e.target.value); setPlaceError(undefined); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
          <label className="pn-check"><input type="checkbox" checked={noPlace} onChange={e => { setNoPlace(e.target.checked); setPlaceError(undefined); }} /><span>Todavía no tenemos lugar</span></label>
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
