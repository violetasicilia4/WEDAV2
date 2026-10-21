// Recorrido guiado del panel: las cuatro etapas del casamiento, su estado y el siguiente paso recomendado.
// Todo se deriva del AppState real (nadie marca nada a mano) y no bloquea nada: sirve para orientar, no para exigir.
// `tasks`/`readiness` de logic.ts siguen existiendo para el resto del panel; esta es la vista de «recorrido» del Inicio.
import { hasEventDetails } from './logic';
import { can } from './plans';
import type { AppState, SiteEvent } from './types';

export type StageId = 'regalos' | 'sitio' | 'invitados' | 'publicar';
export type StageStatus = 'todo' | 'doing' | 'review' | 'done';


export type Stage = {
  id: StageId;
  /** «Paso 1» … «Paso 4». */
  step: string;
  title: string;
  description: string;
  status: StageStatus;
  /** Qué ya está hecho o qué falta, en una línea y con datos reales. */
  detail: string;
  /** Verbo de la acción principal según el estado: «Empezar», «Continuar», «Editar» o «Revisar». */
  cta: string;
  to: string;
  optional: boolean;
  /** La función no está en el plan elegido: el contenido se conserva como borrador. */
  locked: boolean;
};

export type NextAction = { label: string; to: string; stage: StageId; /** Copy para la tarjeta «Siguiente paso» del Inicio. */ title: string; text: string; cta: string; search?: { tab: 'cobro' } };

/** Un momento está completo con nombre propio y al menos el lugar o la dirección (misma regla que muestra el editor). */
export const eventComplete = (e: SiteEvent) => e.enabled && e.title.trim() !== '' && (e.name.trim() !== '' || e.address.trim() !== '');

export type SectionGap = { id: string; label: string };

/** Secciones prendidas a las que todavía les faltan datos mínimos (prender «Mostrar» no alcanza para estar lista).
 *  El mensaje final no entra: vacío usa un cierre por defecto con los nombres. El editor y el Inicio leen esta misma regla. */
export function sectionGaps(s: AppState): SectionGap[] {
  const out: SectionGap[] = [];
  for (const e of s.site.events) if (e.enabled && !eventComplete(e)) out.push({ id: e.key, label: e.title.trim() || e.name.trim() || `Evento ${s.site.events.indexOf(e) + 1}` });
  if (s.site.dressCode.enabled && s.site.dressCode.title.trim() === '' && s.site.dressCode.text.trim() === '') out.push({ id: 'dress', label: 'Dress code' });
  if (s.site.gallery.enabled && s.site.gallery.photos.length === 0) out.push({ id: 'fotos', label: 'Fotos' });
  if (s.site.playlist.enabled && s.site.playlist.tracks.length === 0) out.push({ id: 'musica', label: 'Música de la fiesta' });
  return out;
}

export const incompleteSections = (s: AppState): string[] => sectionGaps(s).map(g => g.label);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ctaFor = (status: StageStatus): string => (status === 'todo' ? 'Empezar' : status === 'doing' ? 'Continuar' : status === 'review' ? 'Revisar' : 'Editar');

export function giftsStage(s: AppState): Stage {
  const n = s.gifts.items.length;
  const alias = s.gifts.alias.trim() !== '';
  const status: StageStatus = n === 0 ? (alias ? 'doing' : 'todo') : alias ? 'done' : 'review';
  const detail = n === 0 ? (alias ? 'Ya cargaste tu alias. Falta elegir los primeros regalos.' : 'Todavía no elegiste regalos.')
    : `${plural(n, 'regalo elegido', 'regalos elegidos')}${alias ? '' : ' · falta cómo vas a recibirlos (podés hacerlo después)'}`;
  return {
    id: 'regalos', step: 'Paso 1', title: 'Prepará tu lista de regalos', description: 'Elegí los regalos que querés compartir y configurá cómo vas a recibir los aportes.',
    status, detail, cta: ctaFor(status), to: '/panel/regalos', optional: false, locked: !can(s.planId, 'gifts'),
  };
}

export function siteStage(s: AppState): Stage {
  const withData = s.site.events.filter(hasEventDetails);
  const complete = s.site.events.filter(eventComplete);
  const gaps = incompleteSections(s);
  const status: StageStatus = complete.length === 0 ? (withData.length > 0 ? 'doing' : 'todo') : gaps.length > 0 ? 'review' : 'done';
  const detail = status === 'todo' ? 'Todavía no cargaste ningún lugar ni horario.'
    : gaps.length > 0 ? `Falta completar: ${gaps.join(', ')}.`
    : `${plural(complete.length, 'momento listo', 'momentos listos')} en tu sitio.`;
  return {
    id: 'sitio', step: 'Paso 2', title: 'Diseñá tu invitación', description: 'Personalizá el sitio de tu casamiento y elegí qué querés mostrar.',
    status, detail, cta: ctaFor(status), to: '/panel/sitio', optional: false, locked: !can(s.planId, 'site'),
  };
}

export function guestsStage(s: AppState): Stage {
  const n = s.guests.length;
  const pending = s.guests.filter(g => g.status === 'pending').length;
  const confirmed = s.guests.filter(g => g.status === 'confirmed').length;
  const status: StageStatus = n === 0 ? 'todo' : 'done';
  const detail = n === 0 ? 'Todavía no cargaste a nadie. Podés importar una planilla o sumar personas de a una.'
    : `${plural(n, 'invitado', 'invitados')} · ${plural(confirmed, 'confirmó', 'confirmaron')} · ${pending} sin responder`;
  return {
    id: 'invitados', step: 'Gestión', title: 'Organizá a tus invitados', description: 'Cargá tu lista y seguí las confirmaciones de asistencia.',
    status, detail, cta: ctaFor(status), to: '/panel/invitados', optional: false, locked: !can(s.planId, 'guests'),
  };
}

/** «Revisá y publicá» nunca bloquea: es el cierre del recorrido. La publicación real todavía no está conectada. */
export function publishStage(before: Stage[]): Stage {
  // Invitados y mesas son gestión, no se publican: no cuentan para estar lista la página.
  const build = before.filter(x => x.id !== 'invitados');
  const started = build.filter(x => !x.locked && x.status !== 'todo').length;
  const ready = build.filter(x => !x.locked).every(x => x.status === 'review' || x.status === 'done') && started > 0;
  const status: StageStatus = ready ? 'review' : started > 0 ? 'doing' : 'todo';
  const detail = ready ? 'Ya podés ver cómo lo van a ver tus invitados. La publicación todavía no está conectada.'
    : 'Podés mirar cómo queda en cualquier momento. Publicar es lo último y no frena la edición.';
  return {
    id: 'publicar', step: 'Paso 4', title: 'Revisá y publicá', description: 'Mirá cómo quedó, elegí tu plan y compartí tu casamiento.',
    status, detail, cta: ready ? 'Revisar' : 'Ver cómo queda', to: '/panel/vista-previa', optional: true, locked: false,
  };
}

export function stages(s: AppState): Stage[] {
  const first = [giftsStage(s), siteStage(s), guestsStage(s)];
  return [...first, publishStage(first)];
}

const SCORE: Record<StageStatus, number> = { todo: 0, doing: 0.35, review: 0.75, done: 1 };

/** Un único progreso general (0–100) sobre las etapas de armado (regalos y página). Ni la publicación (todavía no se puede completar) ni los invitados (gestión, no se publican) suman. */
export function progress(list: Stage[]): number {
  const build = list.filter(x => x.id !== 'publicar' && x.id !== 'invitados' && !x.locked);
  if (build.length === 0) return 0;
  return Math.round((build.reduce((n, x) => n + SCORE[x.status], 0) / build.length) * 100);
}

export function headline(pct: number): string {
  if (pct === 0) return 'Empecemos a armar tu casamiento.';
  if (pct < 50) return 'Tu invitación está tomando forma.';
  if (pct < 100) return 'Ya falta poco para que quede lista.';
  return 'Todo está preparado para revisar.';
}

/** El paso más útil ahora, según el estado real. Solo recorre la construcción (regalos → página → revisar): cargar invitados es gestión y nunca es «el siguiente paso». Ninguna de estas acciones bloquea a las demás. */
export function nextAction(s: AppState): NextAction {
  const g = giftsStage(s), si = siteStage(s);
  if (!g.locked && s.gifts.items.length === 0) return { label: 'Elegí los primeros regalos', to: '/panel/regalos', stage: 'regalos', title: 'Armá tu lista de regalos', text: 'Elegí un set completo o los regalos uno por uno.', cta: 'Elegir regalos' };
  if (!g.locked && s.gifts.alias.trim() === '') return { label: 'Configurá cómo vas a recibir los aportes', to: '/panel/regalos', search: { tab: 'cobro' }, stage: 'regalos', title: 'Dejá lista tu lista de regalos', text: 'Elegí cómo querés recibir los aportes.', cta: 'Configurar aportes' };
  if (!si.locked && si.status !== 'done') return { label: 'Terminá de personalizar tu invitación', to: '/panel/sitio', stage: 'sitio', title: 'Terminá tu invitación', text: si.detail, cta: 'Editar invitación' };
  return { label: 'Revisá cómo lo verán tus invitados', to: '/panel/vista-previa', stage: 'publicar', title: 'Revisá cómo lo ven tus invitados', text: 'Mirá la invitación completa antes de compartirla.', cta: 'Ver vista previa' };
}
