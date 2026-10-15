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

/* Pareja con foto circular, nombres y «Regalá»: se usa igual para la lista completa y para los resultados de la búsqueda. */
function CoupleCard({ item, onSelect }: { item: DemoWedding; onSelect: (i: DemoWedding) => void }) {
  const names = coupleNames(item);
  return (
    <li className="fw-couple">
      {/* La foto lleva al mismo lugar que «Regalá». */}
      <button
        type="button"
        className="fw-couple-photo"
        onClick={() => onSelect(item)}
        aria-label={`Ver el casamiento de ${names}`}
      >
        <Cover item={item} />
      </button>
      <span className="fw-couple-names">{names}</span>
      <button
        type="button"
        className="fw-btn fw-couple-btn"
        onClick={() => onSelect(item)}
        aria-label={`Regalá a ${names}`}
      >
        Regalá
      </button>
    </li>
  );
}

function CoupleGrid({
  items,
  label,
  onSelect,
}: {
  items: readonly DemoWedding[];
  label: string;
  onSelect: (i: DemoWedding) => void;
}) {
  return (
    <ul className="fw-couples" aria-label={label}>
      {items.map((i) => (
        <CoupleCard key={i.id} item={i} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function Skeletons() {
  return (
    <ul className="fw-couples" aria-hidden="true">
      {[0, 1, 2].map((n) => (
        <li key={n} className="fw-couple fw-skeleton">
          <span className="fw-couple-photo" />
          <i />
          <i className="btn" />
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
  const select = (item: DemoWedding) => setView({ name: "selected", item });
  const reset = () => {
    setQuery("");
    setView({ name: "idle" });
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  /* El botón «Buscar» de la portada lleva al buscador. */
  const goSearch = () => {
    const el = document.getElementById("fw-search");
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
  };

  const invalid = view.name === "invalid";
  const busy = view.name === "loading";
  const selected = view.name === "selected";

  return (
    <>
      <section className="fw-hero" aria-labelledby="fw-title">
        <img className="fw-hero-img" src="/pareja-portada-8.webp" alt="" aria-hidden="true" />
        <div className="fw-hero-copy">
          <h1 id="fw-title">Encontrá tu casamiento</h1>
          <button type="button" className="fw-hero-btn" onClick={goSearch}>
            Buscar
          </button>
        </div>
      </section>

      <section className="fw-body" id="fw-search" aria-label="Buscar un casamiento">
        {!selected && (
          <form className="fw-form" role="search" onSubmit={onSubmit} noValidate>
            <label className="fw-label" htmlFor="fw-query">
              Nombres de la pareja
            </label>
            <div className="fw-field">
              <input
                id="fw-query"
                ref={inputRef}
                type="search"
                value={query}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="search"
                placeholder="Buscar"
                aria-invalid={invalid}
                aria-describedby={invalid ? "fw-invalid" : undefined}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (invalid) setView({ name: "idle" });
                }}
              />
              <button type="submit" className="fw-submit" disabled={busy} aria-label="Buscar">
                <Search size={20} aria-hidden="true" />
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
          {view.name === "idle" && (
            <CoupleGrid
              items={demoWeddings}
              label="Casamientos de demostración"
              onSelect={select}
            />
          )}

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
              <CoupleGrid items={view.items} label="Resultados de la búsqueda" onSelect={select} />
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
              <button
                type="button"
                className="fw-btn fw-btn-inline"
                onClick={() => void run(query)}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Reintentar
              </button>
            </div>
          )}

          {view.name === "selected" && <Selected item={view.item} onReset={reset} />}
        </div>
      </section>
    </>
  );
}
