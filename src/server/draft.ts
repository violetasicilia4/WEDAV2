// Borrador del casamiento (lo que la pareja edita) y snapshot público (lo que ve un invitado). Reutiliza la lógica del frontend
// (saneado de AppState y siteFromState) para que panel, vista previa y sitio publicado salgan del mismo código.
import { norm } from '@/lib/weda/logic';
import { siteFromState, type SiteData } from '@/lib/weda/site-model';
import { sanitize } from '@/lib/weda/store';
import type { AppState, PlanId } from '@/lib/weda/types';
import { invalid } from './errors';

/** AppState sin lo que vive en tablas propias: invitados, aportes recibidos y la publicación (simulada). */
export type DraftState = AppState;

export const normalizeName = (first: string, last: string) => norm(`${first} ${last}`);

/** Valida y sanea el borrador que manda el cliente. Un valor que no es un AppState se rechaza (nunca se reemplaza el borrador por uno vacío). */
export function sanitizeDraft(raw: unknown): DraftState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || (raw as Record<string, unknown>)['version'] !== 2) throw invalid('invalid_draft');
  const s = sanitize(raw);
  return { ...s, guests: [], gifts: { ...s.gifts, given: [] }, publication: null, email: '', seeded: false, slug: undefined };
}

/** Datos públicos del sitio. El plan lo decide el servidor, no el borrador; las rutas usan el slug real. */
export function publicSite(draft: DraftState, planId: PlanId, slug: string): SiteData {
  const site = siteFromState({ ...draft, planId });
  return { ...site, homePath: `/sitio/${slug}`, giftsPath: `/sitio/${slug}/regalos`, exit: { href: '/', label: 'Volver a Weda' } };
}
