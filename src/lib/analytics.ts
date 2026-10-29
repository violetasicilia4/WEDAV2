// Analítica del navegador. APAGADA salvo VITE_ANALYTICS=on: sin eso, track() no hace nada (no se afirma que haya datos).
// Con VITE_ANALYTICS=on, los eventos van al propio servidor (/api/events), que los guarda en su base sin datos personales.
// Los eventos que prueban que algo pasó (pago, publicación, confirmación, regalo) NO salen de acá: los registra el servidor.
import { CLIENT_EVENTS, type ClientEvent, type EventProps } from './analytics-events';

const ON = (import.meta.env['VITE_ANALYTICS'] as string | undefined) === 'on';

export function track(name: ClientEvent, props: EventProps = {}): void {
  if (!ON || typeof window === 'undefined' || !(CLIENT_EVENTS as readonly string[]).includes(name)) return;
  const device = window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop';
  const body = JSON.stringify({ name, props: { device, ...props } });
  try {
    if (!navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }))) void fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
  } catch { /* la analítica nunca rompe la app */ }
}

/** Un evento por navegador (por ejemplo «empezó la lista»): se recuerda en localStorage para no repetirlo en cada visita. */
export function trackOnce(name: ClientEvent, props: EventProps = {}): void {
  if (!ON) return;
  try {
    const key = `weda-ev:${name}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch { /* sin almacenamiento: se manda igual */ }
  track(name, props);
}
