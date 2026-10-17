// Colecciones ("sets") de regalos simbólicos. Salen del catálogo que ya existe en la demo (src/lib/demo-wedding.ts):
// se reutilizan sus cuatro categorías y se suman dos selecciones armadas con regalos del mismo catálogo.
import { categories, gifts, type Category, type Gift } from '@/lib/demo-wedding';

export type GiftSet = { id: string; name: string; description: string; giftIds: string[] };

const byCategory = (c: Category) => gifts.filter(g => g.category === c).map(g => g.id);

export const SETS: GiftSet[] = [
  { id: 'luna-de-miel', name: 'Luna de miel', description: 'Viajes y estadías para el primer viaje juntos.', giftIds: byCategory('Luna de miel') },
  { id: 'hogar', name: 'Hogar', description: 'Cosas de la casa para estrenar juntos.', giftIds: byCategory('Hogar') },
  { id: 'experiencias', name: 'Experiencias', description: 'Planes y momentos para vivir de a dos.', giftIds: byCategory('Experiencias') },
  { id: 'proyectos', name: 'Proyectos futuros', description: 'Aportes para lo que viene después.', giftIds: byCategory('Proyectos futuros') },
  { id: 'primer-hogar', name: 'Para el primer hogar', description: 'Lo básico para la cocina y la casa.', giftIds: ['ollas', 'vajilla', 'cafetera', 'sabanas', 'lampara'] },
  { id: 'escapada', name: 'Escapada de a dos', description: 'Una escapada corta, con noche incluida.', giftIds: ['excursion', 'cena-mar', 'masajes', 'boutique'] },
];

export const catalogGift = (id: string): Gift | undefined => gifts.find(g => g.id === id);
export const setGifts = (set: GiftSet): Gift[] => set.giftIds.map(catalogGift).filter((g): g is Gift => !!g);
export { categories, gifts as catalog };
