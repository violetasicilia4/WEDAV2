import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { FloatNav } from '@/components/float-nav';
import { wedding } from '@/lib/demo-wedding';
import { findCouples } from '@/lib/demo-couples';

export const Route = createFileRoute('/encontrar')({
  head: () => ({
    meta: [
      { title: 'Encontrá un casamiento • Weda' },
      { name: 'description', content: 'Buscá a los novios por su nombre y entrá a su invitación, su lista de regalos y la confirmación de asistencia.' },
      // El listado identifica a personas: no debe indexarse.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Find,
});

function Find() {
  const [query, setQuery] = useState('');
  const results = findCouples(query);
  return (
    <div className="find">
      <a className="skip-link" href="#buscar">Ir al buscador</a>
      <section className="find-hero">
        <img className="find-hero-img" src={wedding.photo} alt="" />
        <FloatNav back />
        <div className="find-hero-copy">
          <h1>Encontrá un casamiento</h1>
        </div>
      </section>
      <main id="buscar" className="find-main">
        <form role="search" className="find-form" onSubmit={e => e.preventDefault()}>
          <label htmlFor="find-q">Nombres de la pareja</label>
          <div className="find-field">
            <input id="find-q" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar" autoComplete="off" />
            <button type="submit" className="find-submit" aria-label="Buscar casamiento"><Search size={20} aria-hidden="true" /></button>
          </div>
        </form>
        <div className="find-results" aria-live="polite">
          {results.length === 0 ? (
            <p className="find-empty">No encontramos ese casamiento. Revisá cómo está escrito el nombre o pedile el link de la invitación a los novios.</p>
          ) : (
            <ul className="find-circles">
              {results.map(c => (
                <li key={c.id}>
                  {/* Por ahora no lleva a ninguna pantalla; cuando exista la lista de cada pareja, este botón la abrirá (c.to). */}
                  <button type="button" className="find-couple">
                    <span className="find-photo"><img src={c.photo} alt="" loading="lazy" /></span>
                    <span className="find-names">{c.names}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
