// Lógica de búsqueda de "Encontrá tu casamiento", separada de los componentes visuales.
// Hoy opera solo sobre los eventos ficticios de ./data.ts. Para conectarla a un servicio real basta con reemplazar
// el cuerpo de `searchWeddings` por una llamada a la API: los componentes solo dependen de su firma.
import { demoWeddings, type DemoWedding } from "./data";

/** Palabras que unen los nombres ("Ignacio y Martina", "Martina & Ignacio") y no se buscan. */
const CONNECTORS = new Set(["y", "e", "and", "con"]);
const MIN_CHARS = 2;

/** Minúsculas, sin tildes, sin signos y con espacios simples. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

export function queryTokens(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((t) => t && !CONNECTORS.has(t));
}

export type QueryCheck = { ok: true; tokens: string[] } | { ok: false; reason: "empty" | "short" };

export function checkQuery(query: string): QueryCheck {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return { ok: false, reason: "empty" };
  if (tokens.join("").length < MIN_CHARS) return { ok: false, reason: "short" };
  return { ok: true, tokens };
}

/**
 * Coincidencia pura y síncrona: cada palabra buscada tiene que ser el comienzo de algún nombre de la pareja.
 * El orden no importa ("Martina Ignacio" = "Ignacio y Martina") y se ignoran mayúsculas, tildes y espacios de más.
 */
export function matchWeddings(
  tokens: string[],
  weddings: readonly DemoWedding[] = demoWeddings,
): DemoWedding[] {
  if (tokens.length === 0) return [];
  return weddings.filter((w) => {
    const names = normalize(`${w.partnerA} ${w.partnerB}`).split(" ");
    return tokens.every((t) => names.some((n) => n.startsWith(t)));
  });
}

export class SearchError extends Error {
  constructor(message = "No pudimos completar la búsqueda.") {
    super(message);
    this.name = "SearchError";
  }
}

/** Gancho de demostración: buscar la palabra "error" simula una falla del servicio. */
export const SIMULATED_ERROR_TOKEN = "error";
const SIMULATED_LATENCY_MS = 650;

export type SearchOptions = { signal?: AbortSignal; latencyMs?: number };

/**
 * Punto de integración con el backend. Hoy: datos ficticios locales con latencia simulada, sin ninguna llamada de red.
 * Mañana: llamar a un servicio que controle qué eventos puede encontrar cada persona y qué información puede mostrar.
 */
export async function searchWeddings(
  query: string,
  { signal, latencyMs = SIMULATED_LATENCY_MS }: SearchOptions = {},
): Promise<DemoWedding[]> {
  const check = checkQuery(query);
  if (!check.ok) return [];
  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, latencyMs);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Búsqueda cancelada", "AbortError"));
      },
      { once: true },
    );
  });
  if (check.tokens.includes(SIMULATED_ERROR_TOKEN)) throw new SearchError();
  return matchWeddings(check.tokens);
}
