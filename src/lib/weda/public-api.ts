// Acciones de un invitado sobre un sitio publicado: confirmar asistencia y avisar un regalo (con su comprobante). Sin sesión.
// Cada función falla con un Error cuyo mensaje es un texto para la persona; nunca se simula un envío exitoso.
import { api, ApiFailure } from './remote';
import type { GiftSubmission, Giver, GuestContact, RsvpEntry } from './site-model';
import type { Gift } from '@/lib/demo-wedding';

const TEXT: Record<string, string> = {
  network: 'No hay conexión con Weda. Revisá tu internet y probá de nuevo: no se envió nada.',
  too_many_requests: 'Hiciste demasiados envíos seguidos. Esperá unos minutos y probá de nuevo.',
  site_unpublished: 'Esta página dejó de estar publicada.',
  site_expired: 'Esta invitación ya no está disponible: terminó el tiempo de publicación.',
  site_not_found: 'No encontramos esta página.',
  rsvp_disabled: 'Los novios no habilitaron la confirmación de asistencia.',
  file_too_large: 'El comprobante pesa más de 5 MB. Probá con una captura más liviana.',
  unsupported_file_type: 'El comprobante tiene que ser una imagen (JPG, PNG o WebP) o un PDF.',
  card_not_available: 'El pago con tarjeta todavía no está disponible. Elegí «Alias».',
  invalid_name: 'Revisá el nombre y el apellido.',
  invalid_giver_email: 'Revisá tu correo electrónico.',
  receipt_required: 'Adjuntá el comprobante de la transferencia para enviar tu regalo.',
};
const messageFor = (e: unknown) => (e instanceof ApiFailure ? TEXT[e.code] : undefined) ?? 'No pudimos completar el envío. Probá de nuevo en un rato.';

export async function sendRsvp(slug: string, people: RsvpEntry[], contact?: GuestContact): Promise<void> {
  try { await api('POST', `/api/public/${encodeURIComponent(slug)}/rsvp`, { people, contact }); }
  catch (e) { throw new Error(messageFor(e)); }
}

/** Archivo → base64 (por partes, para no pasar el límite de argumentos con archivos de varios MB). */
async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Registra el aporte CON su comprobante en un solo envío: sin comprobante el servidor no lo acepta (no existen regalos sin comprobante).
 *  Reintentar con la misma `attempt` no duplica el aporte. */
export async function sendGift(slug: string, gifts: Gift[], giver: Giver, extra: GiftSubmission): Promise<void> {
  try {
    if (!extra.proof) throw new ApiFailure(400, 'receipt_required');
    if (extra.proof.size > 5 * 1024 * 1024) throw new ApiFailure(413, 'file_too_large');
    const receipt = { data: await toBase64(extra.proof) };
    await api('POST', `/api/public/${encodeURIComponent(slug)}/contributions`, {
      idempotencyKey: extra.attempt.key, manageToken: extra.attempt.token, giftIds: gifts.map(g => g.id), giverName: giver.name, giverEmail: giver.email, marketingOptIn: giver.marketingOptIn, message: giver.message, how: giver.how, receipt,
    });
  } catch (e) { throw new Error(messageFor(e)); }
}
