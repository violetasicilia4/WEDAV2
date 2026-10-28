import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, Upload } from 'lucide-react';
import { pageMeta } from '@/lib/site';

/* Adjuntar el comprobante desde el enlace del correo (constancia del regalo o recordatorio de la pareja). El enlace lleva el id del aporte
   y un token que solo tiene quien regaló; sin cuenta. Mismo límite y tipos que en el regalo: imagen o PDF de hasta 5 MB. */
export const Route = createFileRoute('/comprobante')({
  validateSearch: (q: Record<string, unknown>): { aporte?: string; token?: string } => ({
    ...(typeof q['aporte'] === 'string' ? { aporte: q['aporte'] } : {}),
    ...(typeof q['token'] === 'string' ? { token: q['token'] } : {}),
  }),
  head: () => {
    const { meta } = pageMeta({ title: 'Comprobante de tu regalo • Weda', description: 'Adjuntá el comprobante de la transferencia de tu regalo.', path: '/comprobante' });
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Receipt,
});

const ERR: Record<string, string> = {
  file_too_large: 'El comprobante pesa más de 5 MB. Probá con una captura más liviana.',
  unsupported_file_type: 'El comprobante tiene que ser una imagen (JPG, PNG o WebP) o un PDF.',
  contribution_rejected: 'Los novios marcaron este regalo como no recibido. Escribiles para resolverlo.',
  too_many_requests: 'Hiciste demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.',
};

function Receipt() {
  const { aporte, token } = Route.useSearch();
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'sending' | 'done'>('checking');
  const [has, setHas] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!aporte || !token) { setState('invalid'); return; }
    fetch(`/api/public/contributions/${encodeURIComponent(aporte)}`, { headers: { 'x-manage-token': token } })
      .then(async r => { if (!r.ok) throw 0; const j = await r.json() as { hasReceipt: boolean }; setHas(j.hasReceipt); setState('ready'); })
      .catch(() => setState('invalid'));
  }, [aporte, token]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !aporte || !token) { setError('Elegí la captura o el PDF de la transferencia.'); return; }
    setState('sending'); setError('');
    try {
      const r = await fetch(`/api/public/contributions/${encodeURIComponent(aporte)}/receipt`, { method: 'PUT', headers: { 'x-manage-token': token }, body: file });
      if (!r.ok) { let code = ''; try { code = (await r.json()).error ?? ''; } catch { /* sin cuerpo */ } throw new Error(ERR[code] ?? 'No pudimos subir el comprobante. Probá de nuevo en un rato.'); }
      setState('done');
    } catch (err) {
      setState('ready');
      setError(err instanceof Error && err.message ? err.message : 'No hay conexión. Revisá tu internet y probá de nuevo.');
    }
  };

  return (
    <main className="legal-page is-narrow" id="main">
      <p className="legal-brand"><Link to="/">Weda</Link></p>
      <h1>Comprobante de tu regalo</h1>
      {state === 'checking' && <p role="status">Cargando…</p>}
      {state === 'invalid' && <p>Este enlace ya no sirve. Si los novios te pidieron el comprobante, usá el enlace del correo más reciente o escribinos a <a href="mailto:hola@weda.app">hola@weda.app</a>.</p>}
      {state === 'done' && <p className="legal-ok" role="status"><Check size={18} aria-hidden="true" />Listo: los novios ya pueden ver tu comprobante.</p>}
      {(state === 'ready' || state === 'sending') && (
        <form onSubmit={send} noValidate className="legal-form">
          <p>{has ? 'Ya adjuntaste un comprobante. Si subís otro, reemplaza al anterior.' : 'Adjuntá la captura o el PDF de la transferencia.'}</p>
          <label className="legal-file">
            <Upload size={18} aria-hidden="true" />
            <span>{file ? file.name : 'Elegir archivo'}</span>
            <input type="file" accept="image/*,application/pdf" onChange={e => { setFile(e.target.files?.[0] ?? null); setError(''); }} />
          </label>
          {error && <p className="legal-error" role="alert">{error}</p>}
          <button type="submit" className="legal-btn" disabled={state === 'sending'} aria-busy={state === 'sending'}>{state === 'sending' ? 'Subiendo…' : 'Enviar comprobante'}</button>
        </form>
      )}
    </main>
  );
}
