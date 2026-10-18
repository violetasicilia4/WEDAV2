// Planes de Weda: ÚNICA fuente de nombres, precios y funciones por plan. La landing, el panel y la página pública leen de acá.
// Los planes son acumulativos: cada uno incluye lo del anterior y suma funciones.
//   Regalos    → lista de regalos
//   Invitación → + micrositio, confirmación de asistencia (RSVP), invitados y mesas
//   Completo   → + música de la fiesta, galería de fotos con hashtag y mensaje final
// Precios de referencia en pesos argentinos POR EVENTO (definición comercial). No se afirma pago único, ausencia de suscripción
// ni duración de la publicación: esas condiciones no están definidas. Se cobra al publicar, y la publicación todavía no está conectada.
// Mientras no se elige plan (planId null) la pareja prueba todo: el plan se elige al publicar. Cambiar de plan nunca borra datos:
// lo que el plan no incluye se conserva como borrador y solo se oculta al mostrar (editor, navegación, página pública).
// La música es SOLO configuración y vista previa: no hay conexión real con Spotify ni con ningún servicio.
import type { PlanId } from './types';

export type Feature = 'gifts' | 'site' | 'rsvp' | 'guests' | 'groups' | 'playlist' | 'gallery' | 'message';

export type Plan = {
  id: PlanId;
  name: string;
  /** Frase corta de la tarjeta. */
  tagline: string;
  /** Para quién es, en una línea. */
  summary: string;
  /** Precio de referencia en ARS, por evento. Cambiarlo acá lo cambia en toda la aplicación. */
  price: number;
  /** Plan del que hereda todo. */
  inherits: PlanId | null;
  /** Lo que suma este plan (sin repetir lo heredado). Las primeras `HIGHLIGHTS` se ven en la tarjeta; el resto, al desplegar. */
  items: string[];
  features: Feature[];
};

export const CURRENCY = 'ARS';
export const PRICE_UNIT = 'por evento';
export const HIGHLIGHTS = 4;

export const PLANS: Plan[] = [
  {
    id: 'regalos', name: 'Regalos', tagline: 'Tu lista de regalos, lista para compartir.',
    summary: 'Para quienes quieren una lista de regalos para sus invitados.',
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
    id: 'invitacion', name: 'Invitación', tagline: 'Tu invitación digital, con todo lo esencial para tus invitados.',
    summary: 'Para quienes quieren invitación digital, regalos y confirmaciones en un solo lugar.',
    price: 180000, inherits: 'regalos',
    items: [
      'Micrositio con portada, nombres y fecha',
      'Ceremonia y recepción, con ubicación en Google Maps',
      'Confirmación de asistencia (RSVP) online',
      'Panel para ver las respuestas y organizar a tus invitados',
      'Foto principal',
      'Dress code',
      'Mesas y grupos',
      'Cuenta regresiva',
    ],
    features: ['gifts', 'site', 'rsvp', 'guests', 'groups'],
  },
  {
    id: 'completo', name: 'Completo', tagline: 'Cada detalle de su historia, en una experiencia para compartir.',
    summary: 'Para quienes quieren un micrositio más completo y personal.',
    price: 320000, inherits: 'invitacion',
    items: [
      'Música de la fiesta: tus invitados suman las canciones',
      'Galería de fotos con hashtag e Instagram',
      'Mensaje final personalizado',
    ],
    features: ['gifts', 'site', 'rsvp', 'guests', 'groups', 'playlist', 'gallery', 'message'],
  },
];

export const planById = (id: PlanId | null): Plan | undefined => PLANS.find(p => p.id === id);

/** «ARS 180.000». */
export const formatPrice = (n: number) => `${CURRENCY} ${new Intl.NumberFormat('es-AR').format(n)}`;

/** Sin plan elegido (prueba gratuita) todo está disponible: el plan se elige al publicar. */
export const can = (planId: PlanId | null, feature: Feature): boolean => planId === null || !!planById(planId)?.features.includes(feature);

/** Plan más barato que incluye la función (para decirle a la pareja dónde la encuentra). */
export const planFor = (feature: Feature): Plan | undefined => PLANS.find(p => p.features.includes(feature));

export const isPlanId = (v: unknown): v is PlanId => v === 'regalos' || v === 'invitacion' || v === 'completo';
