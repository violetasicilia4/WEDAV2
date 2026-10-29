// Pagos: lo que el resto del servidor necesita de un proveedor, sin atarse a uno. Hoy hay UN solo adaptador: «test», que NO cobra y existe
// para las pruebas automáticas y para probar el recorrido completo en local. Un proveedor real (por ejemplo Mercado Pago Checkout Pro) se agrega
// como otro adaptador con estas mismas dos operaciones: ver docs/auditoria-ux-conversion/payment-integration.md.
//
// Reglas que no dependen del proveedor (en service.ts): el monto lo calcula el servidor; solo una notificación verificada marca una orden
// como pagada; cada notificación se procesa una sola vez (payment_events); la vuelta del navegador al panel NO es prueba de pago.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ServerConfig } from './config';

export type Outcome = 'paid' | 'failed' | 'cancelled';
/** Notificación ya verificada: qué evento es (para no procesarlo dos veces), qué orden y cómo terminó. */
export type VerifiedNotification = { eventId: string; orderId: string; outcome: Outcome; providerRef: string };

export type PaymentProvider = {
  name: string;
  /** Dónde mandar al navegador para pagar esta orden. */
  checkoutUrl(order: { id: string; amount: number }, cfg: ServerConfig): string;
  /** Verifica la autenticidad de la notificación (firma) y la traduce. Lanza si no es válida. */
  verify(rawBody: string, headers: Headers, cfg: ServerConfig): VerifiedNotification;
};

const sign = (secret: string, body: string) => createHmac('sha256', secret).update(body).digest('hex');

/** Adaptador de PRUEBA. Nunca cobra. La página /pago-de-prueba lo dice en grande y solo existe con WEDA_PAYMENTS_PROVIDER=test. */
export const testProvider: PaymentProvider = {
  name: 'test',
  checkoutUrl: order => `/pago-de-prueba?orden=${encodeURIComponent(order.id)}`,
  verify(rawBody, headers, cfg) {
    const got = headers.get('x-weda-signature') ?? '';
    const want = sign(cfg.payments.webhookSecret, rawBody);
    if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) throw new Error('bad_signature');
    const b = JSON.parse(rawBody) as Record<string, unknown>;
    const outcome = b['outcome'];
    if (typeof b['eventId'] !== 'string' || typeof b['orderId'] !== 'string' || (outcome !== 'paid' && outcome !== 'failed' && outcome !== 'cancelled')) throw new Error('bad_payload');
    return { eventId: b['eventId'], orderId: b['orderId'], outcome, providerRef: `test-${b['orderId']}` };
  },
};

/** Arma una notificación firmada del adaptador de prueba (la usan la página de prueba, vía el servidor, y las pruebas automáticas). */
export function signedTestNotification(cfg: ServerConfig, n: { eventId: string; orderId: string; outcome: Outcome }) {
  const body = JSON.stringify(n);
  return { body, signature: sign(cfg.payments.webhookSecret, body) };
}

export const providerFor = (cfg: ServerConfig): PaymentProvider | null => (cfg.payments.provider === 'test' ? testProvider : null);
