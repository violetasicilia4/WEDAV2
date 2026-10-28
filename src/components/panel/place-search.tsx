// Campo «Ubicación» con sugerencias de Google Places: se escribe, aparece la lista de lugares reales y al elegir uno el campo queda
// mostrando la dirección corta (calle y altura). Ese lugar es el que abre «Cómo llegar»; el enlace nunca se muestra.
// Patrón combobox accesible: flechas para moverse, Enter para elegir, Escape para volver a lo que estaba.
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, MapPin } from 'lucide-react';
import { placesSession, type PickedPlace, type PlaceSuggestion } from '@/lib/weda/google-places';
import { shortAddress } from '@/lib/weda/logic';

/** El nombre con lo que coincide con lo escrito en negrita (como el autocompletado de Google). */
function Highlight({ text, hits }: { text: string; hits: [number, number][] }) {
  if (!hits.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let at = 0;
  [...hits].sort((a, b) => a[0] - b[0]).forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(<b key={i}>{text.slice(a, b)}</b>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

export function PlaceSearch({ confirmed, onPick }: {
  /** Lugar ya elegido de la lista (nombre, dirección y enlace de Google Maps), o null si todavía no se eligió ninguno. */
  confirmed: PickedPlace | null;
  onPick: (p: PickedPlace) => void;
}) {
  const id = useId();
  const session = useMemo(() => placesSession(), []);
  const shown = confirmed ? (shortAddress(confirmed.address) || confirmed.address || confirmed.name) : '';
  const [q, setQ] = useState<string | null>(null); // null = mostrando el lugar elegido; texto = buscando
  const [list, setList] = useState<PlaceSuggestion[]>([]);
  const [hi, setHi] = useState(-1);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  // Busca con una pausa corta al escribir (no una consulta por letra).
  useEffect(() => {
    const text = (q ?? '').trim();
    if (q === null || text.length < 3) { setList([]); setState('idle'); return; }
    const n = ++seq.current;
    setState('loading');
    const t = window.setTimeout(() => {
      session.suggest(text)
        .then(r => { if (n !== seq.current) return; setList(r); setHi(r.length ? 0 : -1); setState(r.length ? 'idle' : 'empty'); })
        .catch(() => { if (n === seq.current) { setList([]); setState('error'); } });
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, session]);

  // Al aparecer la lista, que se vea entera (en el celular el campo puede estar cerca de la barra de abajo).
  useEffect(() => { if (list.length) listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [list]);

  const pick = async (s: PlaceSuggestion) => {
    setState('loading');
    try {
      onPick(await s.select());
      setQ(null); setList([]); setState('idle');
    } catch { setState('error'); }
  };
  const cancel = () => { setQ(null); setList([]); setState('idle'); };

  const open = list.length > 0;
  const hint =
    state === 'loading' ? 'Buscando…'
    : state === 'error' ? 'No pudimos conectar con Google Maps. Probá de nuevo en un momento.'
    : state === 'empty' ? 'No encontramos ese lugar. Probá con la dirección o el nombre completo.'
    : q !== null && q.trim().length < 3 ? 'Escribí al menos 3 letras.'
    : null;
  return (
    <div className="ps">
      <label htmlFor={`${id}-q`} className="ps-label">Ubicación</label>
      <div className="ps-box">
        <MapPin size={18} aria-hidden="true" />
        <input
          id={`${id}-q`} type="text" value={q ?? shown} autoComplete="off" placeholder="Buscá el salón, la iglesia o la dirección"
          role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={open && hi >= 0 ? `${id}-opt-${hi}` : undefined} aria-describedby={`${id}-help`}
          onFocus={e => { if (q === null && confirmed) e.currentTarget.select(); }}
          onChange={e => setQ(e.target.value)}
          onBlur={() => { if (q !== null && !open) cancel(); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' && open) { e.preventDefault(); setHi(h => (h + 1) % list.length); }
            else if (e.key === 'ArrowUp' && open) { e.preventDefault(); setHi(h => (h - 1 + list.length) % list.length); }
            else if (e.key === 'Enter' && open && hi >= 0) { e.preventDefault(); void pick(list[hi]!); }
            else if (e.key === 'Escape') cancel();
          }}
        />
      </div>
      {open && (
        <div className="ps-pop" ref={listRef}>
          <ul className="ps-list" id={`${id}-list`} role="listbox" aria-label="Lugares encontrados">
            {list.map((s, i) => (
              <li key={s.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === hi} className={i === hi ? 'on' : undefined}
                onMouseEnter={() => setHi(i)} onMouseDown={e => e.preventDefault()} onClick={() => void pick(s)}>
                <MapPin size={18} strokeWidth={1.8} aria-hidden="true" />
                <span className="ps-opt"><span className="ps-main"><Highlight text={s.main} hits={s.hits} /></span>{s.secondary && <span className="ps-sec"> {s.secondary}</span>}</span>
              </li>
            ))}
          </ul>
          {/* Atribución obligatoria al mostrar resultados de Google fuera de un mapa. */}
          <p className="ps-attr" aria-hidden="true">Google Maps</p>
        </div>
      )}
      <p className={`pn-hint${!hint && confirmed ? ' ps-ok' : ''}`} id={`${id}-help`} aria-live="polite">
        {hint ?? (confirmed
          ? <><CircleCheck size={14} strokeWidth={2} aria-hidden="true" />Ubicación confirmada</>
          : null)}
      </p>
    </div>
  );
}
