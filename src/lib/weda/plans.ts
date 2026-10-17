// Planes de Weda. Los nombres y lo que incluye cada uno salen de la landing (src/routes/index.tsx, `plans`):
//   Regalos  → Lista de regalos
//   Completo → Lista de regalos + Confirmación de asistencia + Sitio de casamiento
//   Premium  → Todo lo del plan Completo + Sitio de casamiento premium
// NO hay precios definidos en el proyecto: no se inventan (se informan al publicar).
// Matriz vigente (frontend, sin backend):
//   Regalos  → gifts
//   Completo → gifts + site + rsvp + guests + groups (secciones estándar ya implementadas)
//   Premium  → todo Completo + playlist ("Música de la fiesta")
// La música es SOLO configuración y vista previa: no hay conexión real con Spotify ni con ningún servicio.
// No hay otras funciones de personalización avanzada implementadas ni documentadas, así que no se declaran.
// Cambiar de plan nunca borra datos: las restricciones se aplican al mostrar (editor, navegación, página pública).
import type { PlanId } from './types';

export type Feature = 'gifts' | 'site' | 'rsvp' | 'guests' | 'groups' | 'playlist';

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  items: string[];
  features: Feature[];
};

export const PLANS: Plan[] = [
  { id: 'regalos', name: 'Regalos', tagline: 'Para empezar con lo esencial.', items: ['Lista de regalos'], features: ['gifts'] },
  {
    id: 'completo', name: 'Completo', tagline: 'Para organizar todo con tus invitados.',
    items: ['Lista de regalos', 'Confirmación de asistencia', 'Sitio de casamiento'],
    features: ['gifts', 'site', 'rsvp', 'guests', 'groups'],
  },
  {
    id: 'premium', name: 'Premium', tagline: 'La experiencia completa de tu casamiento.',
    items: ['Todo lo del plan Completo', 'Sitio de casamiento premium'],
    features: ['gifts', 'site', 'rsvp', 'guests', 'groups', 'playlist'],
  },
];

export const planById = (id: PlanId | null): Plan | undefined => PLANS.find(p => p.id === id);

export const can = (planId: PlanId | null, feature: Feature): boolean => !!planById(planId)?.features.includes(feature);

/** Plan más barato que incluye la función (para decirle a la pareja dónde la encuentra). */
export const planFor = (feature: Feature): Plan | undefined => PLANS.find(p => p.features.includes(feature));

export const isPlanId = (v: unknown): v is PlanId => v === 'regalos' || v === 'completo' || v === 'premium';
