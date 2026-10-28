// Calendario de la demo: arma un archivo .ics (RFC 5545) con los eventos del casamiento ficticio.
// Solo usa datos existentes: si un evento no tiene un horario válido, se omite en lugar de inventarlo.
import type { WeddingEvent } from './demo-wedding';

const pad = (n: number) => String(n).padStart(2, '0');

/** "17:00 hs" → { h: 17, m: 0 }; devuelve null si no hay un horario válido. */
export function parseTime(text: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? { h, m: min } : null;
}

/** "-03:00" → -180 (minutos respecto de UTC). */
export function offsetMinutes(offset: string): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) throw new Error(`Zona horaria inválida: ${offset}`);
  const total = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -total : total;
}

/** Fecha local (AAAA-MM-DD), hora local y zona → sello UTC "AAAAMMDDTHHMMSSZ". */
export function toUtcStamp(date: string, time: { h: number; m: number }, offset: string): string {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(y, mo - 1, d, time.h, time.m) - offsetMinutes(offset) * 60_000);
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

const escapeText = (t: string) => t.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, m => `\\${m}`);

/** Pliega las líneas a 75 caracteres, como pide el estándar. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) { parts.push(' ' + rest.slice(0, 74)); rest = rest.slice(74); }
  return parts.join('\r\n');
}

export type IcsInput = {
  events: WeddingEvent[];
  /** Fecha local del casamiento, AAAA-MM-DD. */
  date: string;
  /** Zona horaria como desfase fijo, por ejemplo "-03:00". */
  offset: string;
  title: string;
  /** Instante de generación (para DTSTAMP); se inyecta para que sea determinista en tests. */
  now?: Date;
};

export function buildIcs({ events, date, offset, title, now = new Date() }: IcsInput): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weda//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const ev of events) {
    const t = parseTime(ev.time);
    if (!t) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.key}-${date}@weda.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toUtcStamp(date, t, offset)}`,
      `SUMMARY:${escapeText(`${ev.label} · ${title}`)}`,
      `LOCATION:${escapeText(`${ev.name}, ${ev.address}`)}`,
      `DESCRIPTION:${escapeText(ev.note)}`,
      `URL:${ev.maps}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Dispara la descarga del .ics en el navegador. */
export function downloadIcs(ics: string, filename = 'casamiento-ignacio-y-martina.ics') {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
