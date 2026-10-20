import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ImagePlus } from 'lucide-react';
import { OnboardingPhoto, OnboardingShell } from '@/components/panel/onboarding';
import { readImage } from '@/lib/weda/images';
import { update, useAppState, useHydrated, useStorageFull } from '@/lib/weda/store';

/** Marcador de posición (dos siluetas) hasta que la pareja suba su foto: deja claro que ahí va una foto de los dos. */
const DEFAULT_PHOTO = '/foto-por-defecto.svg';

export const Route = createFileRoute('/crear/foto')({
  component: PhotoStep,
});

/* Paso 3: la foto de la pareja. Es lo primero que ven los invitados y le da identidad a la página, por eso se pide acá, con la portada
   a la vista. No bloquea: quien todavía no la tiene puede seguir con la imagen de muestra y subirla después desde el panel. */
function PhotoStep() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();
  const full = useStorageFull();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const uploaded = state.photo.kind === 'upload';

  // Sin los nombres cargados no hay portada que mostrar: se vuelve al paso anterior.
  useEffect(() => {
    if (hydrated && !state.onboarded) void navigate({ to: '/crear', replace: true });
  }, [hydrated, state.onboarded, navigate]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setLoading(true);
    try { const img = await readImage(file); update(s => ({ ...s, photo: { kind: 'upload', ...img } })); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos cargar la foto.'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const goPanel = () => void navigate({ to: '/panel' });
  if (!hydrated || !state.onboarded) return <p className="pn-loading" role="status">Cargando…</p>;

  return (
    <OnboardingShell step={3} big back="/crear/fecha" onNext={goPanel} title="Sumá una foto de ustedes" sub={<>Es lo primero que ven tus invitados.<br />Podés cambiarla cuando quieras.</>} side={<OnboardingPhoto src={state.photo.kind === 'upload' ? state.photo.src : DEFAULT_PHOTO} square alt={uploaded ? 'Tu foto de portada' : ''} onPick={() => fileRef.current?.click()} actionLabel={uploaded ? 'Cambiar foto' : 'Subir foto'} />}>
      <input ref={fileRef} className="pn-sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void pick(e.target.files?.[0])} aria-label="Elegir una foto de tu dispositivo" />
      <button type="button" className="pn-btn is-ghost ob-upload" onClick={() => fileRef.current?.click()} disabled={loading}><ImagePlus size={18} strokeWidth={1.4} aria-hidden="true" />{loading ? 'Cargando…' : uploaded ? 'Cambiar la foto' : 'Subir una foto de ustedes'}</button>
      {uploaded && <p className="pn-sr" role="status">Listo, así se ve tu portada.</p>}
      {!uploaded && (
        <>
          <p className="ob-hint">Si todavía no la tienen, pueden seguir y subirla después desde el panel.</p>
          <button type="button" className="pn-link ob-skip" onClick={goPanel}>Omitir por ahora</button>
        </>
      )}
      {error && <p className="pn-error" role="alert">{error}</p>}
      {full && <p className="pn-error" role="alert">No hay más lugar para guardar la foto en este navegador. Probá con una más liviana.</p>}
    </OnboardingShell>
  );
}
