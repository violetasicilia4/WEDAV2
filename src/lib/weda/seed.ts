// Escenario de ejemplo: Tomás y Martina. Todo es ficticio (nombres, lugares, direcciones, invitados e importes).
import { emptyState } from './logic';
import type { AppState, Guest, GuestStatus, ListGift } from './types';
import { catalogGift } from './catalog';

const SEED_SITE_PHOTOS = [
  { id: 'f1', src: '/ejemplo-foto-1.webp', alt: 'Tomás y Martina caminando abrazados por un campo' },
  { id: 'f3', src: '/ejemplo-foto-3.webp', alt: 'Tomás besa a Martina en un jardín' },
  { id: 'f4', src: '/ejemplo-foto-4.webp', alt: 'Tomás y Martina abrazados' },
];

const seedGift = (catalogId: string): ListGift => {
  const g = catalogGift(catalogId);
  if (!g) throw new Error(`Regalo de catálogo inexistente: ${catalogId}`);
  return { id: `seed-${g.id}`, catalogId: g.id, name: g.name, text: g.text, amount: g.amount, category: g.category, icon: g.icon, image: g.image, pos: g.pos, fit: g.fit, zoom: g.zoom };
};

const guest = (n: number, first: string, last: string, status: GuestStatus, menu: string, groupId: string | null, source: Guest['source']): Guest =>
  ({ id: `seed-inv-${n}`, first, last, status, menu, groupId, source });

export function seedState(): AppState {
  const e = emptyState();
  return {
    ...e,
    onboarded: true,
    seeded: true,
    couple: { first: 'Tomás', second: 'Martina' },
    date: '2027-04-17',
    photo: { kind: 'upload', src: '/pareja-portada-8.webp', name: 'portada.webp' },
    planId: 'completo',
    preferredPlan: 'completo',
    gifts: {
      cover: null,
      alias: 'tomas.martina',
      acceptCard: true,
      items: [
        ...['ollas', 'vajilla', 'cafetera', 'sabanas', 'lampara'].map(id => ({ ...seedGift(id), fromSet: 'primer-hogar' })),
        ...['excursion', 'cena-mar', 'masajes', 'boutique'].map(id => ({ ...seedGift(id), fromSet: 'escapada' })),
        seedGift('vuelo-interno'),
        seedGift('casa'),
        { id: 'seed-auriculares', name: 'Auriculares para nuestros viajes', text: 'Para escuchar música en el avión.', amount: 180000, category: 'Proyectos futuros', icon: 'compass', custom: true } satisfies ListGift,
      ],
      given: [{ id: 'seed-vajilla', name: 'Lucía Ferreyra', message: '¡Que sean muy felices!', how: 'alias', at: Date.UTC(2026, 9, 12, 15, 30) }],
    },
    groups: [
      { id: 'seed-g1', name: 'Mesa 1 · Familia' },
      { id: 'seed-g2', name: 'Mesa 2 · Amigos' },
      { id: 'seed-g3', name: 'Mesa 3 · Trabajo' },
    ],
    guests: [
      guest(1, 'Lucía', 'Ferreyra', 'confirmed', 'sin-restricciones', 'seed-g1', 'rsvp'),
      guest(2, 'Ramiro', 'Bianchi', 'confirmed', 'vegetariano', 'seed-g1', 'rsvp'),
      guest(3, 'Paula', 'Domínguez', 'confirmed', 'sin-restricciones', 'seed-g1', 'manual'),
      guest(4, 'Joaquín', 'Peralta', 'confirmed', 'sin-tacc', 'seed-g2', 'rsvp'),
      guest(5, 'Camila', 'Soto', 'confirmed', 'sin-restricciones', 'seed-g2', 'rsvp'),
      guest(6, 'Nicolás', 'Aguirre', 'confirmed', 'vegano', 'seed-g2', 'manual'),
      guest(7, 'Julieta', 'Maidana', 'confirmed', 'kids', null, 'rsvp'),
      guest(8, 'Martín', 'Escobar', 'declined', '', null, 'rsvp'),
      guest(9, 'Carolina', 'Vidal', 'declined', '', 'seed-g3', 'manual'),
      guest(10, 'Federico', 'Paz', 'pending', '', 'seed-g3', 'manual'),
      guest(11, 'Agustina', 'Ledesma', 'pending', '', 'seed-g3', 'manual'),
      guest(12, 'Gonzalo', 'Rivas', 'pending', '', null, 'manual'),
      guest(13, 'Sol', 'Benítez', 'pending', '', null, 'manual'),
      guest(14, 'Emilia', 'Quiroga', 'confirmed', 'sin-lactosa', null, 'rsvp'),
    ],
    site: {
      coverText: '¡Nos casamos!',
      events: [
        { key: 'ceremonia', enabled: true, title: 'Ceremonia', name: 'Parroquia San Isidro Labrador', address: 'Libertador 16300, San Isidro, Buenos Aires', time: '17:00', note: 'Pedimos llegar con 20 minutos de anticipación.', mapsUrl: '' },
        { key: 'recepcion', enabled: true, title: 'Recepción', name: 'Jardín de los Olivos', address: 'Camino Real 450, Pilar, Buenos Aires', time: '18:30', note: 'Brindis y música en vivo mientras cae el sol.', mapsUrl: '' },
        { key: 'fiesta', enabled: true, title: 'Fiesta', name: 'Salón Los Álamos', address: 'Camino Real 450, Pilar, Buenos Aires', time: '20:30', note: 'Cena y baile hasta la madrugada.', mapsUrl: '' },
      ],
      countdown: true,
      rsvp: { enabled: true, deadline: '2027-03-17', menus: true },
      dressCode: { enabled: true, title: 'Elegante sport', text: 'Elegante sport. Les pedimos evitar el blanco y el marfil.' },
      gallery: { enabled: true, photos: SEED_SITE_PHOTOS, hashtag: '#TomasYMartina2027', handle: '@tomasymartina' },
      playlist: {
        enabled: true, name: 'Nuestra fiesta · Tomás & Martina',
        tracks: [{ title: 'La Bachata', artist: 'Manuel Turizo' }, { title: 'Mi Gente', artist: 'J Balvin, Willy William' }, { title: 'Zapatillas', artist: 'El Canto del Loco' }],
      },
      message: { enabled: true, title: 'Que vengas ya es un regalo.', text: '' },
    },
  };
}

