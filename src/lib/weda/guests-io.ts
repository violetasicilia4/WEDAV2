// Exportar e importar invitados (planilla de Excel). Formato de importación: Nombre, Apellido, Asistencia, Restricción alimentaria.
import { menus } from '@/lib/demo-wedding';
import { guestName, menuName, norm, STATUS_LABEL, validateGuest } from './logic';
import type { AppState, Guest, GuestStatus } from './types';

export const IMPORT_HEADERS = ['Nombre', 'Apellido', 'Asistencia', 'Restricción alimentaria'];
const SOURCE_LABEL = { rsvp: 'Respondió en el sitio', manual: 'Cargado por ustedes' } as const;

/** Todo lo que hay de cada invitado (incluye grupo y origen, que no se importan). */
export function exportRows(s: AppState): string[][] {
  return [
    [...IMPORT_HEADERS, 'Grupo o mesa', 'Origen'],
    ...s.guests.map(g => [g.first, g.last, STATUS_LABEL[g.status], g.status === 'confirmed' ? menuName(g.menu) : '', s.groups.find(x => x.id === g.groupId)?.name ?? '', SOURCE_LABEL[g.source]]),
  ];
}

/** Modelo para completar: títulos y dos filas de ejemplo. */
export const templateRows = (): string[][] => [
  IMPORT_HEADERS,
  ['Ana', 'Pérez', 'Confirmado', 'Vegetariano'],
  ['Luis', 'Gómez', 'Pendiente', ''],
];

const STATUS_WORDS: [GuestStatus, string[]][] = [
  ['confirmed', ['confirmado', 'confirmada', 'confirmo', 'si', 'asiste', 'va', 'viene']],
  ['declined', ['no asiste', 'no', 'no va', 'no viene', 'rechazo', 'declino']],
  ['pending', ['pendiente', 'sin responder', 'no respondio', '']],
];
const parseStatus = (v: string): GuestStatus | null => STATUS_WORDS.find(([, w]) => w.includes(norm(v)))?.[0] ?? null;
const parseMenu = (v: string): string | null => {
  const n = norm(v);
  if (n === '') return '';
  return menus.find(m => norm(m.name) === n || m.id === n || (n.length >= 4 && norm(m.name).startsWith(n)))?.id ?? null;
};

export type NewGuest = { first: string; last: string; status: GuestStatus; menu: string };
/** `duplicates`: filas que ya estaban en la lista o repetidas en la planilla; se saltean (nunca pisan datos existentes). `duplicateNames` dice cuáles. */
export type ImportResult = { ok: NewGuest[]; problems: { row: number; reason: string }[]; duplicates: number; duplicateNames: string[]; missingColumns: string[] };

const HEADER_KEYS: Record<string, 'first' | 'last' | 'status' | 'menu'> = {
  nombre: 'first', apellido: 'last', asistencia: 'status', 'restriccion alimentaria': 'menu', restriccion: 'menu', menu: 'menu',
};

/** Valida las filas de una planilla. No cambia nada: devuelve qué se va a importar y qué filas tienen problemas. */
export function parseGuestRows(rows: string[][], existing: Pick<Guest, 'first' | 'last'>[]): ImportResult {
  const res: ImportResult = { ok: [], problems: [], duplicates: 0, duplicateNames: [], missingColumns: [] };
  const head = rows[0] ?? [];
  const col: Partial<Record<'first' | 'last' | 'status' | 'menu', number>> = {};
  head.forEach((h, i) => { const k = HEADER_KEYS[norm(h)]; if (k && col[k] === undefined) col[k] = i; });
  if (col.first === undefined) res.missingColumns.push('Nombre');
  if (col.last === undefined) res.missingColumns.push('Apellido');
  if (res.missingColumns.length) return res;
  const seen = new Set(existing.map(g => norm(guestName(g))));
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const cell = (k: 'first' | 'last' | 'status' | 'menu') => (col[k] === undefined ? '' : (r[col[k]!] ?? '').trim());
    if (r.every(c => (c ?? '').trim() === '')) return;
    const first = cell('first'), last = cell('last');
    const errs = validateGuest({ first, last });
    if (errs.first || errs.last) { res.problems.push({ row: line, reason: errs.first ?? errs.last ?? 'Falta el nombre.' }); return; }
    const status = parseStatus(cell('status'));
    if (!status) { res.problems.push({ row: line, reason: `No entendemos la asistencia «${cell('status')}». Usá Confirmado, No asiste o Pendiente.` }); return; }
    const menu = parseMenu(cell('menu'));
    if (menu === null) { res.problems.push({ row: line, reason: `No reconocemos la restricción «${cell('menu')}».` }); return; }
    const key = norm(`${first} ${last}`);
    if (seen.has(key)) { res.duplicates++; res.duplicateNames.push(`${first} ${last}`); return; }
    seen.add(key);
    res.ok.push({ first, last, status, menu: status === 'confirmed' ? menu : '' });
  });
  return res;
}
