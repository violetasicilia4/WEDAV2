// Planes de Weda: ÚNICA fuente de nombres, precios y funciones por plan. La landing, el panel y la página pública leen de acá.
// Dos planes (decisión de la dueña, 2026-11-03), acumulativos:
//   Regalos     → la lista de regalos
//   Celebración → todo lo de Regalos + el sitio completo con la invitación y la gestión: confirmación de asistencia (RSVP), invitados, mesas
//                 y grupos, música de la fiesta, galería de fotos y mensaje final
// «Celebración Plus» (id `completo`) dejó de ofrecerse: sus funciones pasaron a Celebración. El id sigue siendo válido para no romper datos
// guardados (borradores, órdenes, publicaciones) y se trata como Celebración (`normalizePlanId`).
// Precios de referencia en pesos argentinos, de PAGO ÚNICO y con la página publicada durante UN AÑO (definiciones comerciales de la
// autora: pago único 2026-10-21; un año, 2026-11-03). Se cobra al publicar, y la publicación todavía no está conectada: hoy nada se publica ni vence.
// El plan define QUÉ SE PUBLICA (BR-14, `publishes`) y QUÉ SE OPERA (BR-62, `operates`); ver y editar contenido no dependen del plan
// (D-02, 2026-11-03). El plan se elige al publicar; lo que no publica se conserva como borrador. Las operaciones (invitados, mesas, revisión
// de aportes) las habilita el SERVIDOR con el plan publicado y vigente (`Access`, PAY-01); el plan del borrador nunca cuenta.
// El cambio de Regalos a Celebración después de contratar está bloqueado mientras DP-23 siga pendiente (D-05).
// La música es SOLO configuración y vista previa: no hay conexión real con Spotify ni con ningún servicio.
import type { PlanId } from './types';

export type Feature = 'gifts' | 'site' | 'rsvp' | 'guests' | 'groups' | 'playlist' | 'gallery' | 'message';

/** Ícono de cada punto destacado (el mapa a componentes vive en el panel: acá solo datos). */
export type HighlightIcon = 'gift' | 'card' | 'receipt' | 'link' | 'globe' | 'check' | 'users' | 'music' | 'photos' | 'heart';
export type Highlight = { icon: HighlightIcon; label: string };

export type Plan = {
  id: PlanId;
  name: string;
  /** Frase corta de la tarjeta. */
  tagline: string;
  /** Qué es, como producto, en pocas palabras: la que encabeza cada cuadrado al elegir qué publicar. */
  product: string;
  /** Lo concreto que suma este plan (sin repetir lo heredado), corto y con ícono, para el cuadrado de «Publicar». El detalle completo está en `items`. */
  highlights: Highlight[];
  /** Precio de referencia en ARS, de pago único. Cambiarlo acá lo cambia en toda la aplicación. */
  price: number;
  /** Plan del que hereda todo. */
  inherits: PlanId | null;
  /** Lo que suma este plan (sin repetir lo heredado). Las primeras `HIGHLIGHTS` se ven en la tarjeta; el resto, al desplegar. */
  items: string[];
  features: Feature[];
};

export const CURRENCY = 'ARS';
export const PRICE_UNIT = 'pago único';
/** Cuánto tiempo queda publicada la página con cualquiera de los planes (definición comercial de la autora: 1 año, 2026-11-03; antes 6 meses). */
export const PUBLICATION_TERM = '1 año';
/** La misma duración, en meses (para calcular el vencimiento). */
export const PUBLICATION_MONTHS = 12;
export const HIGHLIGHTS = 3;

export const PLANS: Plan[] = [
  {
    id: 'regalos', name: 'Regalos', tagline: 'Tus invitados regalan desde el celular y la plata va directo a tu cuenta.',
    product: 'La lista de regalos',
    highlights: [
      { icon: 'gift', label: 'Lista de regalos' },
      { icon: 'card', label: 'Alias y tarjeta para recibir' },
      { icon: 'receipt', label: 'Regalos recibidos y quién los hizo' },
      { icon: 'link', label: 'Link para compartir' },
    ],
    price: 95000, inherits: null,
    items: [
      'Lista de regalos personalizada',
      'Regalos simbólicos: elegí de los sets o creá los tuyos',
      'Alias y tarjeta como medios para recibir regalos',
      'Enlace para compartir la lista con tus invitados',
      'Registro de los regalos recibidos y de quién los hizo',
    ],
    features: ['gifts'],
  },
  {
    id: 'invitacion', name: 'Celebración', tagline: 'Tu invitación digital, las confirmaciones y la organización de tus invitados, junto con la lista de regalos.',
    product: 'Sitio completo, invitación y gestión',
    highlights: [
      { icon: 'globe', label: 'Sitio con tu invitación' },
      { icon: 'check', label: 'Confirmación de asistencia' },
      { icon: 'users', label: 'Invitados y mesas' },
      { icon: 'music', label: 'Música, fotos y mensaje final' },
    ],
    price: 140000, inherits: 'regalos',
    items: [
      'Sitio con portada, nombres y fecha',
      'Ceremonia y recepción, con ubicación en Google Maps',
      'Confirmación de asistencia (RSVP) online',
      'Panel para ver las respuestas y organizar a tus invitados',
      'Mesas y grupos',
      'Foto principal',
      'Dress code',
      'Cuenta regresiva',
      'Música de la fiesta: tus invitados suman las canciones',
      'Galería de fotos con hashtag e Instagram',
      'Mensaje final personalizado',
    ],
    features: ['gifts', 'site', 'rsvp', 'guests', 'groups', 'playlist', 'gallery', 'message'],
  },
];

/** «Celebración Plus» (`completo`) se integró a Celebración: los datos guardados con ese id se leen como Celebración. */
export const normalizePlanId = <T extends PlanId | null>(id: T): T => (id === 'completo' ? 'invitacion' : id) as T;

export const planById = (id: PlanId | null): Plan | undefined => { const n = normalizePlanId(id); return PLANS.find(p => p.id === n); };

/** «ARS 140.000». */
export const formatPrice = (n: number) => `${CURRENCY} ${new Intl.NumberFormat('es-AR').format(n)}`;

/** Qué publica el plan (BR-14). Sin plan elegido (null) se muestra todo: es la vista previa de lo que se puede publicar. */
export const publishes = (planId: PlanId | null, feature: Feature): boolean => planId === null || !!planById(planId)?.features.includes(feature);

/** Lugar del plan en la herencia (Regalos 0, Celebración 1): ordena los planes sin depender del precio. */
export const planRank = (id: PlanId | null): number => {
  let n = -1;
  for (let p = planById(id); p; p = p.inherits ? planById(p.inherits) : undefined) n++;
  return n;
};

/** Operaciones de gestión (BR-62): crean o cambian datos reales, a diferencia de ver o editar contenido. */
export type Operation = 'guests' | 'groups' | 'contributions';
const OPERATION_FEATURE: Record<Operation, Feature> = { guests: 'guests', groups: 'groups', contributions: 'gifts' };

/**
 * Acceso operativo que calcula el servidor (PAY-01, F1–F2): `trial` sin publicar; `paid_unpublished` con pago confirmado y sin publicación
 * (no opera, DP-25); `active` publicado con su plan pagado y vigente; `expired` con la publicación vencida.
 */
export type AccessState = 'trial' | 'paid_unpublished' | 'active' | 'expired';
export type Access = { state: AccessState; plan: PlanId | null; expiresAt: string | null };

/** ¿Se puede ejecutar la operación? Solo con el evento activo y un plan que la incluya. Sin acceso conocido (sin cuenta), no. */
export const operates = (access: Access | null | undefined, op: Operation): boolean =>
  !!access && access.state === 'active' && access.plan !== null && publishes(access.plan, OPERATION_FEATURE[op]);

/** Plan más barato que habilita la operación (para explicar qué la desbloquea). */
export const planForOperation = (op: Operation): Plan | undefined => planFor(OPERATION_FEATURE[op]);

/** Plan más barato que incluye la función (para decirle a la pareja dónde la encuentra). */
export const planFor = (feature: Feature): Plan | undefined => PLANS.find(p => p.features.includes(feature));

export const isPlanId = (v: unknown): v is PlanId => v === 'regalos' || v === 'invitacion' || v === 'completo';
