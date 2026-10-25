/** Generador pseudoaleatorio con semilla (mulberry32): el mismo número siempre produce la misma secuencia, así cualquier fallo se reproduce. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const pick = <T,>(xs: readonly T[]): T => xs[int(0, xs.length - 1)]!;
  const chance = (p: number) => next() < p;
  return { next, int, pick, chance };
}
export type Rng = ReturnType<typeof rng>;

export const SEED = Number(process.env['WEDA_SEED'] ?? 2026);
export const COUNT = Number(process.env['WEDA_EXPLORE_N'] ?? 40);

const FIRST = ['Lucía', 'Tomás', 'Martina', 'Joaquín', 'Ñusta', 'Zoë', 'Ángel', 'Inés', 'Agustín', 'Valentina', 'O\'Brien', 'Jean-Luc', 'María José'];
const LAST = ['Pérez', 'Gómez', 'Fernández', 'Álvarez', 'de la Vega', 'Núñez', 'Sosa', 'Benítez', 'Quiroga', 'D\'Angelo', 'Ibáñez'];
const WEIRD = ['<b>x</b>', '<script>alert(1)</script>', '😀🎉', 'A'.repeat(80), '   ', '', '‮RTL', "'; DROP TABLE;--", 'Ünï©ødé', '\n\n'];
const CATEGORIES = ['Luna de miel', 'Hogar', 'Experiencias', 'Proyectos futuros'] as const;
const ICONS = ['utensils', 'bed', 'chef', 'plane', 'sofa', 'lamp', 'wine', 'palette', 'ticket', 'sprout', 'dog', 'trees', 'coffee', 'sheets', 'compass', 'home'] as const;
const PLANS = [null, 'regalos', 'invitacion', 'completo'] as const;
const MENUS = ['', 'sin-restricciones', 'vegetariano', 'vegano', 'sin-tacc', 'sin-lactosa', 'kids'];
const STATUSES = ['confirmed', 'declined', 'pending'] as const;

const isoDay = (offset: number) => new Date(Date.UTC(2026, 9, 23) + offset * 86400000).toISOString().slice(0, 10);

/** Un estado completo y válido de la app, con datos sintéticos variados. `onboarded` casi siempre verdadero para llegar a las pantallas del panel. */
export function randomState(r: Rng, i: number) {
  const nGifts = r.pick([0, 0, 1, 3, 8, 15, 40]);
  const nGuests = r.pick([0, 0, 1, 5, 14, 60, 200]);
  const nGroups = r.pick([0, 1, 3, 8]);
  const groups = Array.from({ length: nGroups }, (_, k) => ({ id: `g${i}-${k}`, name: r.chance(0.2) ? r.pick(WEIRD).slice(0, 30) || `Mesa ${k + 1}` : `Mesa ${k + 1} · ${r.pick(LAST)}`, ...(r.chance(0.6) ? { capacity: r.int(1, 14) } : {}), ...(r.chance(0.3) ? { note: r.pick(LAST) } : {}) }));
  const first = r.pick(FIRST), second = r.pick(FIRST);
  const planId = r.pick(PLANS);
  const hasEvents = r.chance(0.7);
  const ev = (key: string, on: boolean) => ({ key, enabled: on, title: r.chance(0.6) ? r.pick(['Ceremonia', 'Recepción', 'Fiesta', 'Civil', 'Brunch']) : '', name: r.chance(0.7) ? `${r.pick(LAST)} ${r.pick(['Salón', 'Jardín', 'Quinta', 'Estancia'])}` : '', address: r.chance(0.5) ? `Calle ${r.int(1, 9999)}, ${r.pick(['Pilar', 'Tigre', 'Mendoza', 'Córdoba'])}` : '', time: r.chance(0.7) ? `${String(r.int(8, 23)).padStart(2, '0')}:${r.pick(['00', '30'])}` : '', note: r.chance(0.2) ? r.pick(WEIRD) : '', mapsUrl: '' });
  const publication = planId && r.chance(0.5) ? { planId, live: r.chance(0.8), publishedAt: '2026-10-01T10:00:00.000Z', expiresAt: '2027-10-01T10:00:00.000Z', payments: [{ kind: 'publish', planId, amount: 95000, at: '2026-10-01T10:00:00.000Z' }] } : null;
  return {
    version: 2,
    onboarded: !r.chance(0.04),
    email: 'explore@example.com',
    couple: { first, second, ...(r.chance(0.3) ? { firstLast: r.pick(LAST) } : {}), ...(r.chance(0.3) ? { secondLast: r.pick(LAST) } : {}) },
    date: r.pick([null, null, isoDay(r.int(1, 900)), isoDay(r.int(-400, -1))]),
    photo: r.pick([{ kind: 'none' }, { kind: 'weda', id: 'x' }, { kind: 'none' }]),
    preferredPlan: r.pick(PLANS),
    planId,
    gifts: {
      cover: null,
      alias: r.chance(0.5) ? `${first.toLowerCase().replace(/[^a-z]/g, '')}.${second.toLowerCase().replace(/[^a-z]/g, '')}` : '',
      bank: r.chance(0.3) ? 'Banco de ejemplo' : '', cbu: '', acceptCard: r.chance(0.5),
      items: Array.from({ length: nGifts }, (_, k) => ({ id: `gift${i}-${k}`, name: r.chance(0.1) ? r.pick(WEIRD) || `Regalo ${k}` : `Regalo ${k} ${r.pick(['de cocina', 'para dos', 'de viaje'])}`, text: r.chance(0.5) ? 'Un detalle para empezar juntos.' : '', amount: r.pick([1000, 15000, 90000, 250000, 1500000, 99999999]), category: r.pick(CATEGORIES), icon: r.pick(ICONS), custom: true })),
      given: Array.from({ length: r.pick([0, 0, 1, 4, 30]) }, (_, k) => ({ id: `gv${i}-${k}`, name: `${r.pick(FIRST)} ${r.pick(LAST)}`, message: r.chance(0.5) ? '¡Felicitaciones!' : '', how: r.pick(['alias', 'tarjeta']), amount: r.pick([15000, 90000]), at: Date.UTC(2026, 9, r.int(1, 20)) })),
    },
    guests: Array.from({ length: nGuests }, (_, k) => ({ id: `inv${i}-${k}`, first: r.pick(FIRST), last: r.pick(LAST), status: r.pick(STATUSES), menu: r.pick(MENUS), groupId: groups.length && r.chance(0.6) ? r.pick(groups).id : null, source: r.pick(['rsvp', 'manual']) })),
    groups,
    site: {
      coverText: r.chance(0.7) ? r.pick(['¡Nos casamos!', 'Nos casamos', '', r.pick(WEIRD)]) : '',
      events: [ev('ceremonia', hasEvents), ev('recepcion', r.chance(0.4)), ev('fiesta', r.chance(0.5))],
      countdown: r.chance(0.7),
      rsvp: { enabled: r.chance(0.8), deadline: r.chance(0.5) ? isoDay(r.int(1, 300)) : '', menus: r.chance(0.7) },
      dressCode: { enabled: r.chance(0.5), title: r.chance(0.5) ? 'Elegante sport' : '', text: r.chance(0.5) ? 'Evitar el blanco.' : '' },
      gallery: { enabled: r.chance(0.4), photos: r.chance(0.5) ? [{ id: 'p1', src: '/ejemplo-foto-1.webp', alt: 'Foto' }] : [], hashtag: r.chance(0.5) ? '#Nosotros' : '', handle: r.chance(0.5) ? '@nosotros' : '' },
      playlist: { enabled: r.chance(0.4), name: r.chance(0.5) ? 'Nuestra fiesta' : '', tracks: r.chance(0.5) ? [{ title: 'La Bachata', artist: 'Manuel Turizo' }] : [] },
      message: { enabled: r.chance(0.5), title: r.chance(0.6) ? 'Que vengas ya es un regalo.' : '', text: r.chance(0.2) ? r.pick(WEIRD) : '' },
    },
    seeded: false,
    publication,
  };
}
