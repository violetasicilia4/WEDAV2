import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ImagePlus } from 'lucide-react';
import { readImage } from '@/lib/weda/images';
import { resolvePhoto } from '@/lib/weda/logic';
import { update, useAppState, useHydrated, useStorageFull } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/foto')({
  // La vista de la portada usa la misma tipografía que la página pública (Cormorant Garamond), que se carga igual que ahí.
  head: () => ({
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap' },
    ],
  }),
  component: PhotoStep,
});

/** Fecha corta con puntos, como la portada pública: «20 . 03 . 27». */
const spaced = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d} . ${m} . ${(y ?? '').slice(-2)}`; };

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
    <div className="pn-account pn-photo-step">
      <header className="pn-account-head">
        <h1>Sumá una foto de ustedes</h1>
        <p className="is-soft">Podés cambiarla cuando quieras.</p>
      </header>

      {/* Vista de la portada: misma composición que la página pública (¡Nos casamos! · nombres · fecha), centrada. */}
      <figure className="pn-cover-preview">
        <img src={resolvePhoto(state.photo)} alt={uploaded ? 'Tu foto de portada' : ''} />
        <figcaption className="pn-cover-copy">
          {state.site.coverText.trim() && <span className="pn-cover-eyebrow">{state.site.coverText.trim()}</span>}
          <span className="pn-cover-names">{state.couple.first} y {state.couple.second}</span>
          <span className="pn-cover-date">{state.date ? spaced(state.date) : 'Fecha a confirmar'}</span>
        </figcaption>
      </figure>

      <input ref={fileRef} className="pn-sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void pick(e.target.files?.[0])} aria-label="Elegir una foto de tu dispositivo" />
      {uploaded ? (
        <>
          <p className="pn-sr" role="status">Listo, así se ve tu portada.</p>
          <button type="button" className="pn-btn pn-block" onClick={goPanel}>Continuar</button>
          <button type="button" className="pn-btn is-ghost pn-block" onClick={() => fileRef.current?.click()} disabled={loading}><ImagePlus size={18} strokeWidth={1.4} aria-hidden="true" />{loading ? 'Cargando…' : 'Cambiar la foto'}</button>
        </>
      ) : (
        <>
          <button type="button" className="pn-btn pn-block" onClick={() => fileRef.current?.click()} disabled={loading}><ImagePlus size={18} strokeWidth={1.4} aria-hidden="true" />{loading ? 'Cargando…' : 'Subir una foto de ustedes'}</button>
          <button type="button" className="pn-link pn-skip" onClick={goPanel}>Ahora no, la subo después</button>
        </>
      )}
      {error && <p className="pn-error" role="alert">{error}</p>}
      {full && <p className="pn-error" role="alert">No hay más lugar para guardar la foto en este navegador. Probá con una más liviana.</p>}
    </div>
  );
}
