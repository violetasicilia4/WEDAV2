import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Search, X } from 'lucide-react';
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

/* Pantalla de invitados: una franja con foto y el buscador apoyado sobre su borde, para que se pueda escribir sin bajar.
   Debajo, las parejas en círculos; cada una abre su lista de regalos (hoy, la de ejemplo). */
function Find() {
  const [query, setQuery] = useState('');
  const results = findCouples(query);
  const searching = query.trim() !== '';
  return (
    <div className="find">
      <a className="skip-link" href="#buscar">Ir al buscador</a>
      <section className="find-hero" aria-labelledby="find-title">
        <img className="find-hero-img" src={wedding.photo} alt="" />
        <FloatNav back />
        <div className="find-hero-copy">
          <h1 id="find-title">Encontrá un casamiento</h1>
          <p>Buscá a los novios por su nombre y entrá a su lista de regalos.</p>
        </div>
      </section>
      <main id="buscar" className="find-main">
        <form role="search" className="find-form" onSubmit={e => e.preventDefault()}>
          <label htmlFor="find-q" className="find-sr">Nombres de la pareja</label>
          <div className="find-field">
            <Search className="find-icon" size={20} aria-hidden="true" />
            <input id="find-q" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombres de la pareja" autoComplete="off" autoCapitalize="words" enterKeyHint="search" />
            {query && <button type="button" className="find-clear" aria-label="Borrar búsqueda" onClick={() => setQuery('')}><X size={18} aria-hidden="true" /></button>}
          </div>
        </form>
        <div className="find-results" aria-live="polite">
          {results.length === 0 ? (
            <div className="find-empty">
              <p>No encontramos ese casamiento. Revisá cómo está escrito el nombre o pedile el link de la invitación a los novios.</p>
              <button type="button" className="find-reset" onClick={() => setQuery('')}>Ver todos los casamientos</button>
            </div>
          ) : (
            <>
              {searching && <p className="find-count">{results.length === 1 ? '1 casamiento encontrado' : `${results.length} casamientos encontrados`}</p>}
              <ul className="find-circles">
                {results.map(c => (
                  <li key={c.id}>
                    <Link to={c.to} className="find-couple">
                      <span className="find-photo"><img src={c.photo} alt="" loading="lazy" /></span>
                      <span className="find-names">{c.names}</span>
                      <span className="find-cta">Ver su lista <ArrowRight size={14} aria-hidden="true" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <p className="find-note">Parejas de demostración: todas abren la lista de regalos de ejemplo.</p>
      </main>
    </div>
  );
}
