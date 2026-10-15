// Estado de la demo que dura mientras dure la sesión del navegador (sessionStorage).
// No es persistencia real: no hay cuenta ni servidor, y se pierde al cerrar la pestaña.
import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'weda-demo:';

export function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeSession<T>(key: string, value: T) {
  try { window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* sin almacenamiento: la demo sigue en memoria */ }
}

/** Igual que useState, pero recupera y guarda el valor en sessionStorage. Es seguro con SSR: hidrata después de montar. */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);
  useEffect(() => {
    setValue(readSession(key, initial));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      if (hydrated.current) writeSession(key, resolved);
      return resolved;
    });
  }, [key]);
  return [value, set] as const;
}
