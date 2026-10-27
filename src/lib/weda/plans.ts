// Planes de Weda: ÚNICA fuente de nombres, precios y funciones por plan. La landing, el panel y la página pública leen de acá.
// Los planes son acumulativos: cada uno incluye lo del anterior y suma funciones.
//   Regalos    → lista de regalos
//   Celebración → + micrositio, confirmación de asistencia (RSVP), invitados y mesas
//   Celebración Plus → + música de la fiesta, galería de fotos con hashtag y mensaje final
// Precios de referencia en pesos argentinos, de PAGO ÚNICO y con la página publicada durante UN AÑO (definiciones comerciales de la
// autora, 2026-10-21). Se cobra al publicar, y la publicación todavía no está conectada: hoy nada se publica ni vence.
// Mientras no se elige plan (planId null) la pareja prueba todo: el plan se elige al publicar. Cambiar de plan nunca borra datos:
// lo que el plan no incluye se conserva como borrador y solo se oculta al mostrar (editor, navegación, página pública).
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
/** Cuánto tiempo queda publicada la página con cualquiera de los planes (definición comercial de la autora, 2026-10-21). */
export const PUBLICATION_TERM = '1 año';
export const HIGHLIGHTS = 3;

export const PLANS: Plan[] = [
  {
    id: 'regalos', name: 'Regalos', tagline: 'Tu lista de regalos, lista para compartir.',
    product: 'Solo la lista de regalos',
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
    id: 'invitacion', name: 'Celebración', tagline: 'Tu invitación digital, con todo lo esencial para tus invitados.',
    product: 'Sitio básico, RSVP y regalos',
    highlights: [
      { icon: 'globe', label: 'Página con los datos de la fiesta' },
      { icon: 'check', label: 'Confirmación de asistencia' },
      { icon: 'users', label: 'Invitados, mesas y grupos' },
    ],
    price: 140000, inherits: 'regalos',
    items: [
      'Sitio con portada, nombres y fecha',
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
    id: 'completo', name: 'Celebración Plus', tagline: 'Cada detalle de su historia, en una experiencia para compartir.',
    product: 'Sitio plus, RSVP y regalos',
    highlights: [
      { icon: 'music', label: 'Música de la fiesta' },
      { icon: 'photos', label: 'Galería de fotos' },
      { icon: 'heart', label: 'Mensaje final' },
    ],
    price: 150000, inherits: 'invitacion',
    items: [
      'Música de la fiesta: tus invitados suman las canciones',
      'Galería de fotos con hashtag e Instagram',
      'Mensaje final personalizado',
    ],
    features: ['gifts', 'site', 'rsvp', 'guests', 'groups', 'playlist', 'gallery', 'message'],
  },
];

export const planById = (id: PlanId | null): Plan | undefined => PLANS.find(p => p.id === id);

/** «ARS 140.000». */
export const formatPrice = (n: number) => `${CURRENCY} ${new Intl.NumberFormat('es-AR').format(n)}`;

/** Sin plan elegido (prueba gratuita) todo está disponible: el plan se elige al publicar. */
export const can = (planId: PlanId | null, feature: Feature): boolean => planId === null || !!planById(planId)?.features.includes(feature);

/** Plan más barato que incluye la función (para decirle a la pareja dónde la encuentra). */
export const planFor = (feature: Feature): Plan | undefined => PLANS.find(p => p.features.includes(feature));

export const isPlanId = (v: unknown): v is PlanId => v === 'regalos' || v === 'invitacion' || v === 'completo';
