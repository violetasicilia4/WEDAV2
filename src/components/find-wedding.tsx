import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, RotateCcw, Search, TriangleAlert } from "lucide-react";
import {
  coupleNames,
  demoWeddings,
  formatWeddingDate,
  type DemoWedding,
} from "@/lib/encontrar/data";
import { checkQuery, searchWeddings } from "@/lib/encontrar/search";

type View =
  | { name: "idle" }
  | { name: "invalid"; reason: "empty" | "short" }
  | { name: "loading" }
  | { name: "results"; query: string; items: DemoWedding[] }
  | { name: "empty"; query: string }
  | { name: "error" }
  | { name: "selected"; item: DemoWedding };

const INVALID_TEXT = {
  empty: "Escribí los nombres de la pareja para buscar.",
  short: "Escribí al menos dos letras de alguno de los nombres.",
};

function Cover({ item, priority = false }: { item: DemoWedding; priority?: boolean }) {
  return (
    <img
      className="fw-cover"
      src={item.cover}
      alt={item.coverAlt}
      loading={priority ? "eager" : "lazy"}
      style={item.coverPosition ? { objectPosition: item.coverPosition } : undefined}
    />
  );
}

function DateLine({ date }: { date: string | null }) {
  const label = formatWeddingDate(date);
  return label ? (
    <p className="fw-date">
      <time dateTime={date ?? undefined}>{label}</time>
    </p>
  ) : (
    <p className="fw-date is-pending">Fecha por confirmar</p>
  );
}

function ResultCard({ item, onSelect }: { item: DemoWedding; onSelect: (i: DemoWedding) => void }) {
  const names = coupleNames(item);
  return (
    <li>
      <article className="fw-card">
        <div className="fw-photo">
          <Cover item={item} />
        </div>
        <div className="fw-card-body">
          <h3>{names}</h3>
          <DateLine date={item.date} />
          <button
            type="button"
            className="fw-btn"
            onClick={() => onSelect(item)}
            aria-label={`Encontrar mi casamiento: ${names}`}
          >
            Encontrar mi casamiento
          </button>
        </div>
      </article>
    </li>
  );
}

/* Casamientos de demostración a la vista, sin necesidad de buscar: foto circular, nombres y un botón «Regalá». */
function Gallery({ onSelect }: { onSelect: (i: DemoWedding) => void }) {
  return (
    <section className="fw-gallery" aria-labelledby="fw-gallery-title">
      <h2 id="fw-gallery-title">Casamientos de demostración</h2>
      <p className="fw-gallery-lead">Elegí uno para ver cómo funciona. Son parejas ficticias.</p>
      <ul className="fw-tiles">
        {demoWeddings.map((item) => {
          const names = coupleNames(item);
          return (
            <li key={item.id} className="fw-tile">
              <span className="fw-tile-photo">
                <Cover item={item} />
              </span>
              <span className="fw-tile-names">{names}</span>
              <button
                type="button"
                className="fw-btn fw-tile-btn"
                onClick={() => onSelect(item)}
                aria-label={`Regalá a ${names}`}
              >
                Regalá
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Skeletons() {
  return (
    <ul className="fw-grid" aria-hidden="true">
      {[0, 1, 2].map((n) => (
        <li key={n}>
          <div className="fw-card fw-skeleton">
            <div className="fw-photo" />
            <div className="fw-card-body">
              <i />
              <i className="short" />
              <i className="btn" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Selected({ item, onReset }: { item: DemoWedding; onReset: () => void }) {
  const names = coupleNames(item);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="fw-selected" ref={ref} tabIndex={-1} aria-labelledby="fw-selected-title">
      <div className="fw-photo">
        <Cover item={item} priority />
      </div>
      <div className="fw-selected-body">
        <p className="fw-chip">
          <Check size={14} aria-hidden="true" />
          Casamiento elegido
        </p>
        <h2 id="fw-selected-title">{names}</h2>
        <DateLine date={item.date} />
        {item.routes ? (
          <>
            <p className="fw-note">
              Este es el casamiento de ejemplo de Weda. Podés regalarles desde su lista o recorrer
              su sitio.
            </p>
            <div className="fw-actions">
              <Link to={item.routes.gifts} className="fw-btn fw-btn-inline">
                Hacer un regalo
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to={item.routes.site} className="fw-link">
                Ver su sitio
              </Link>
            </div>
          </>
        ) : (
          /* INTEGRACIÓN FUTURA: acá se navega a la lista de regalos y al sitio reales del evento (por ejemplo /evento/$id/regalos) cuando existan esas rutas. */
          <p className="fw-note">
            Este es un casamiento de demostración y todavía no tiene una lista de regalos a la que
            continuar.
          </p>
        )}
        <p className="fw-demo">
          Demostración: no se vinculó ninguna cuenta ni se guardó información.
        </p>
        <button type="button" className="fw-link" onClick={onReset}>
          <RotateCcw size={14} aria-hidden="true" />
          Buscar otro casamiento
        </button>
      </div>
    </div>
  );
}

export function FindWedding() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>({ name: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function run(raw: string) {
    request.current?.abort();
    const check = checkQuery(raw);
    if (!check.ok) {
      setView({ name: "invalid", reason: check.reason });
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setView({ name: "loading" });
    try {
      const items = await searchWeddings(raw, { signal: controller.signal });
      setView(
        items.length
          ? { name: "results", query: raw.trim(), items }
          : { name: "empty", query: raw.trim() },
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setView({ name: "error" });
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(query);
  };
  const reset = () => {
    setQuery("");
    setView({ name: "idle" });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const invalid = view.name === "invalid";
  const busy = view.name === "loading";
  const selected = view.name === "selected";

  return (
    <section className="fw" aria-labelledby="fw-title">
      <div className="fw-head">
        <p className="eyebrow">● Para invitados</p>
        <h1 id="fw-title">Encontrá tu casamiento</h1>
        <p className="fw-lead">Buscá por sus nombres y encontrá el espacio de su gran día.</p>
      </div>

      {!selected && (
        <form className="fw-form" role="search" onSubmit={onSubmit} noValidate>
          <label className="fw-label" htmlFor="fw-query">
            Nombres de la pareja
          </label>
          <div className="fw-field">
            <Search size={18} aria-hidden="true" />
            <input
              id="fw-query"
              ref={inputRef}
              type="search"
              value={query}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="search"
              placeholder="Ej.: Ignacio y Martina"
              aria-invalid={invalid}
              aria-describedby={invalid ? "fw-invalid" : undefined}
              onChange={(e) => {
                setQuery(e.target.value);
                if (invalid) setView({ name: "idle" });
              }}
            />
            <button type="submit" className="fw-btn fw-submit" disabled={busy}>
              {busy ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {view.name === "invalid" && (
            <p id="fw-invalid" className="fw-error" role="alert">
              {INVALID_TEXT[view.reason]}
            </p>
          )}
        </form>
      )}

      <div className="fw-out" aria-live="polite" aria-busy={busy}>
        {view.name === "loading" && (
          <>
            <p className="fw-status">Buscando casamientos…</p>
            <Skeletons />
          </>
        )}

        {view.name === "results" && (
          <>
            <p className="fw-status">
              {view.items.length === 1
                ? "1 casamiento encontrado"
                : `${view.items.length} casamientos encontrados`}{" "}
              para “{view.query}”
            </p>
            <ul className="fw-grid">
              {view.items.map((i) => (
                <ResultCard
                  key={i.id}
                  item={i}
                  onSelect={(item) => setView({ name: "selected", item })}
                />
              ))}
            </ul>
          </>
        )}

        {view.name === "empty" && (
          <div className="fw-message" role="status">
            <h2>No encontramos ese casamiento</h2>
            <p>
              No hay resultados para “{view.query}”. Revisá la ortografía o probá con el nombre de
              la otra persona.
            </p>
            <button type="button" className="fw-btn fw-btn-inline" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Volver a buscar
            </button>
          </div>
        )}

        {view.name === "error" && (
          <div className="fw-message is-error" role="alert">
            <TriangleAlert size={22} aria-hidden="true" />
            <h2>No pudimos completar la búsqueda</h2>
            <p>Algo falló de nuestro lado. Probá de nuevo en un momento.</p>
            <button type="button" className="fw-btn fw-btn-inline" onClick={() => void run(query)}>
              <RotateCcw size={16} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        {view.name === "selected" && <Selected item={view.item} onReset={reset} />}
      </div>

      {view.name === "idle" && (
        <p className="fw-hint">
          Probá con “Ignacio y Martina”, “Camila” o “Mariano”. Es una demostración con casamientos
          ficticios: no se consulta ningún servicio real.
        </p>
      )}

      {!selected && <Gallery onSelect={(item) => setView({ name: "selected", item })} />}
    </section>
  );
}
