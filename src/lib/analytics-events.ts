// Embudo mínimo (docs/auditoria-ux-conversion/conversion-and-friction.md). Nombres compartidos por el navegador y el servidor.
// Regla: lo que prueba que algo pasó de verdad (pago confirmado, publicación, confirmación, regalo) lo registra SOLO el servidor.
export const SERVER_EVENTS = ['signup_completed', 'publication_completed', 'payment_confirmed', 'rsvp_submitted', 'gift_submitted', 'public_invitation_opened'] as const;
export const CLIENT_EVENTS = ['landing_viewed', 'signup_started', 'event_created', 'gift_list_started', 'gift_list_completed', 'microsite_completed', 'plan_selected', 'checkout_started'] as const;
export type ServerEvent = typeof SERVER_EVENTS[number];
export type ClientEvent = typeof CLIENT_EVENTS[number];
/** Únicas propiedades admitidas: nada que identifique a una persona (sin correos, nombres, IP ni tokens). */
export const ALLOWED_PROPS = ['plan_id', 'device', 'is_upgrade', 'is_republish', 'attending'] as const;
export type EventProps = Partial<Record<typeof ALLOWED_PROPS[number], string | number | boolean>>;
