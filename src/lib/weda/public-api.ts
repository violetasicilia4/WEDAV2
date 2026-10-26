// Acciones de un invitado sobre un sitio publicado: confirmar asistencia y avisar un regalo (con su comprobante). Sin sesión.
// Cada función falla con un Error cuyo mensaje es un texto para la persona; nunca se simula un envío exitoso.
import { api, ApiFailure } from './remote';
import type { GiftSubmission, RsvpEntry } from './site-model';
import type { Gift } from '@/lib/demo-wedding';

const TEXT: Record<string, string> = {
  network: 'No hay conexión con Weda. Revisá tu internet y probá de nuevo: no se envió nada.',
  too_many_requests: 'Hiciste demasiados envíos seguidos. Esperá unos minutos y probá de nuevo.',
  site_unpublished: 'Esta página dejó de estar publicada.',
  site_not_found: 'No encontramos esta página.',
  rsvp_disabled: 'Los novios no habilitaron la confirmación de asistencia.',
  gift_taken: 'Alguien ya eligió uno de estos regalos. Actualizá la página para ver los que quedan.',
  file_too_large: 'El comprobante pesa más de 5 MB. Probá con una captura más liviana.',
  unsupported_file_type: 'El comprobante tiene que ser una imagen (JPG, PNG o WebP) o un PDF.',
  card_not_available: 'El pago con tarjeta todavía no está disponible. Elegí «Alias».',
  invalid_name: 'Revisá el nombre y el apellido.',
};
const messageFor = (e: unknown) => (e instanceof ApiFailure ? TEXT[e.code] : undefined) ?? 'No pudimos completar el envío. Probá de nuevo en un rato.';

export async function sendRsvp(slug: string, people: RsvpEntry[]): Promise<void> {
  try { await api('POST', `/api/public/${encodeURIComponent(slug)}/rsvp`, { people }); }
  catch (e) { throw new Error(messageFor(e)); }
}

/** Registra el aporte y sube el comprobante. Si falla a mitad de camino, reintentar con la misma `attempt` completa lo que falta sin duplicar el aporte. */
export async function sendGift(slug: string, gifts: Gift[], giver: { name: string; message: string; how: 'alias' | 'tarjeta' }, extra: GiftSubmission): Promise<void> {
  try {
    const r = await api<{ id: string }>('POST', `/api/public/${encodeURIComponent(slug)}/contributions`, {
      idempotencyKey: extra.attempt.key, manageToken: extra.attempt.token, giftIds: gifts.map(g => g.id), giverName: giver.name, message: giver.message, how: giver.how,
    });
    if (extra.proof) {
      let res: Response;
      try {
        res = await fetch(`/api/public/contributions/${encodeURIComponent(r.id)}/receipt`, { method: 'PUT', headers: { 'x-manage-token': extra.attempt.token }, body: extra.proof });
      } catch { throw new ApiFailure(0, 'network'); }
      if (!res.ok) { let code = 'error'; try { code = (await res.json()).error ?? code; } catch { /* sin cuerpo */ } throw new ApiFailure(res.status, code); }
    }
  } catch (e) { throw new Error(messageFor(e)); }
}
