import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Search, X } from 'lucide-react';
import { FloatNav } from '@/components/float-nav';
import { wedding } from '@/lib/demo-wedding';
import { pageMeta } from '@/lib/site';
import { invitationPath } from '@/lib/weda/logic';

export const Route = createFileRoute('/encontrar')({
  head: () => {
    const { meta } = pageMeta({ title: 'Encontrá un casamiento • Weda', description: 'Buscá a los novios por su nombre y entrá a su invitación, su lista de regalos y la confirmación de asistencia.' });
    // El listado identifica a personas: no debe indexarse.
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Find,
});

/* Pantalla de invitados. Todavía no hay búsqueda de casamientos reales (decisión de privacidad pendiente: docs/auditoria-ux-conversion/backend-dependencies.md, D5).
   Antes mostraba parejas inventadas que abrían la lista de ejemplo, como si fueran reales (auditoría 2026-10-28). Ahora: pegar el link que mandaron los novios. */
function Find() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const path = invitationPath(value);
    if (!path) { setError('Pegá el link completo que te mandaron, por ejemplo weda.app/sitio/ana-y-leo.'); return; }
    void navigate({ to: path as never });
  };
  return (
    <div className="find">
      <a className="skip-link" href="#buscar">Ir al formulario</a>
      <section className="find-hero" aria-labelledby="find-title">
        <img className="find-hero-img" src={wedding.photo} alt="" />
        <FloatNav back />
        <div className="find-hero-copy">
          <h1 id="find-title">Encontrá un casamiento</h1>
          <p>Abrí el link de la invitación que te mandaron los novios.</p>
        </div>
      </section>
      <main id="buscar" className="find-main">
        <form className="find-form" onSubmit={go} noValidate>
          <label htmlFor="find-q" className="find-sr">Link de la invitación</label>
          <div className="find-field">
            <Search className="find-icon" size={20} aria-hidden="true" />
            <input id="find-q" type="url" inputMode="url" value={value} onChange={e => { setValue(e.target.value); setError(''); }} placeholder="Pegá el link acá" autoComplete="off" enterKeyHint="go" aria-invalid={!!error} aria-describedby={error ? 'find-err' : undefined} />
            {value && <button type="button" className="find-clear" aria-label="Borrar" onClick={() => { setValue(''); setError(''); }}><X size={18} aria-hidden="true" /></button>}
          </div>
          {error && <p className="find-error" id="find-err" role="alert">{error}</p>}
          <button type="submit" className="find-go">Abrir la invitación <ArrowRight size={16} aria-hidden="true" /></button>
        </form>
        <div className="find-empty">
          <p>¿No tenés el link? Pediselo a los novios: lo comparten cuando publican su invitación.</p>
          <Link to="/ejemplo" className="find-reset">Ver una invitación de ejemplo</Link>
        </div>
      </main>
    </div>
  );
}

