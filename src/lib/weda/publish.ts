// Resumen de publicación: qué se publicaría con cada plan y qué queda como borrador. Función pura sobre el AppState y la matriz de planes.
// La publicación y el pago NO están conectados (no hay servidor): esto solo informa, no publica ni cobra nada.
import { sectionGaps } from './journey';
import { hasEventDetails, publicPages, spotifyEmbed } from './logic';
import { can, planFor, type Feature } from './plans';
import type { AppState, PlanId } from './types';

export type PublishState = 'published' | 'empty' | 'draft';
export type PublishItem = { feature: Feature; label: string; state: PublishState; detail: string; /** Plan que la habilita (solo si queda como borrador). */ plan?: string };
export type PublishTodo = { text: string; to: string; cta: string; search?: { tab: 'cobro' } | { editar: 'datos' } };
export type PublishSummary = { items: PublishItem[]; published: PublishItem[]; drafts: PublishItem[]; empty: PublishItem[]; warnings: string[]; /** Pendientes con acceso directo para resolverlos. Ninguno frena nada: la publicación todavía no está conectada y no hay reglas definidas que la bloqueen. */ todo: PublishTodo[] };

/** Funciones que ven los invitados en la versión pública (invitados y mesas son de gestión: no se publican). */
const PUBLIC: { feature: Feature; label: string; content: (s: AppState) => string | null }[] = [
  { feature: 'gifts', label: 'Lista de regalos', content: s => (s.gifts.items.length ? `${s.gifts.items.length} ${s.gifts.items.length === 1 ? 'regalo' : 'regalos'}` : null) },
  { feature: 'site', label: 'Página del casamiento', content: s => (s.site.events.some(hasEventDetails) ? 'portada, momentos y lugares' : null) },
  { feature: 'rsvp', label: 'Confirmación de asistencia', content: s => (s.site.rsvp.enabled ? 'formulario para tus invitados' : null) },
  { feature: 'gallery', label: 'Galería de fotos', content: s => (s.site.gallery.enabled && s.site.gallery.photos.length ? `${s.site.gallery.photos.length} fotos` : null) },
  { feature: 'message', label: 'Mensaje final', content: s => (s.site.message.enabled ? 'mensaje de cierre' : null) },
  { feature: 'playlist', label: 'Playlist de Spotify', content: s => (!s.site.playlist.enabled ? null : spotifyEmbed(s.site.playlist.spotify) ? 'playlist de Spotify' : s.site.playlist.tracks.length ? `${s.site.playlist.tracks.length} temas` : null) },
];

export function publishSummary(s: AppState, planId: PlanId): PublishSummary {
  const items: PublishItem[] = [];
  for (const p of PUBLIC) {
    const content = p.content(s);
    const included = can(planId, p.feature);
    if (included) items.push({ feature: p.feature, label: p.label, state: content ? 'published' : 'empty', detail: content ?? 'Incluida en tu plan, pero todavía sin contenido.' });
    else if (content) items.push({ feature: p.feature, label: p.label, state: 'draft', detail: `Tu contenido se conserva (${content}).`, plan: planFor(p.feature)?.name ?? '' });
  }
  const warnings: string[] = [];
  if (can(planId, 'gifts') && s.gifts.items.length > 0 && s.gifts.alias.trim() === '') warnings.push('Falta configurar cómo vas a recibir los regalos: sin eso no se pueden activar los regalos reales.');
  if (can(planId, 'site') && !s.date) warnings.push('Todavía no definiste la fecha: la portada va a decir «Fecha a confirmar».');
  const todo: PublishTodo[] = [];
  if (can(planId, 'gifts') && s.gifts.items.length === 0) todo.push({ text: 'Elegí al menos un regalo para tu lista.', to: '/panel/regalos', cta: 'Elegir regalos' });
  if (can(planId, 'gifts') && s.gifts.items.length > 0 && s.gifts.alias.trim() === '') todo.push({ text: 'Configurá cómo vas a recibir los regalos (alias).', to: '/panel/regalos', cta: 'Configurar cobro', search: { tab: 'cobro' } });
  if (can(planId, 'site') && !s.date) todo.push({ text: 'Definí la fecha del casamiento.', to: '/panel', cta: 'Definir la fecha', search: { editar: 'datos' } });
  if (can(planId, 'site')) for (const g of sectionGaps(s)) todo.push({ text: `Completá «${g.label}»: está activada pero le faltan datos.`, to: '/panel/sitio', cta: 'Completar' });
  return { items, todo, published: items.filter(i => i.state === 'published'), drafts: items.filter(i => i.state === 'draft'), empty: items.filter(i => i.state === 'empty'), warnings };
}


/** En una frase, qué páginas ve el invitado con cada plan. Sale de la matriz de planes: nada se afirma que `plans.ts` no incluya. */
export function publishedPagesText(planId: PlanId): string {
  const pages = publicPages(planId);
  if (!pages.invitation) return 'solo la lista de regalos.';
  const extras = (['playlist', 'gallery', 'message'] as Feature[]).filter(f => can(planId, f));
  if (extras.length === 0) return 'la invitación (con confirmación de asistencia) y la lista de regalos.';
  return 'el sitio completo: la invitación con música, galería de fotos y mensaje final, y la lista de regalos.';
}
