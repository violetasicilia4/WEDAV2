// Fila «Sesiones» de «Tu cuenta»: cuántas sesiones hay abiertas en otros dispositivos o navegadores y el botón para cerrarlas.
// Esta sesión sigue abierta. El número sale del servidor; no se muestran ids ni datos de los dispositivos (no se guardan).
import { useEffect, useState } from 'react';
import { closeOtherSessions, errorText, otherSessions } from '@/lib/weda/remote';

const others = (n: number) => (n === 0 ? 'Solo en este dispositivo' : n === 1 ? 'Abierta también en 1 lugar más' : `Abierta también en ${n} lugares más`);

export function SessionsRow() {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    void otherSessions().then(r => { if (!alive) return; if (r.ok) setCount(r.others); else setError(errorText(r.code)); });
    return () => { alive = false; };
  }, []);

  const close = async () => {
    setBusy(true); setError(undefined);
    const r = await closeOtherSessions();
    setBusy(false);
    if (r.ok) { setCount(0); setClosed(true); } else setError(errorText(r.code));
  };

  // Va dentro del <dl> de «Tu cuenta»: los avisos van dentro del <dd> (un <p> suelto no es válido ahí).
  return (
    <div className="pf-row">
      <dt>Sesiones</dt>
      <dd className={count === null ? 'is-empty' : undefined}>
        <span role="status">{closed ? 'Listo: cerramos las demás. Acá seguís adentro.' : count === null ? (error ? 'No pudimos consultarlas' : 'Consultando…') : others(count)}</span>
        {error && <span className="pn-error" role="alert"> {error}</span>}
      </dd>
      {!!count && <button type="button" className="pn-btn is-ghost is-small" onClick={() => void close()} disabled={busy} aria-busy={busy}>{busy ? 'Un momento…' : 'Cerrar las demás'}</button>}
    </div>
  );
}
