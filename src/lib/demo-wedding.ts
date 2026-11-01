// Casamiento FICTICIO que se usa como demo de Weda. Ninguno de estos datos es real:
// nombres, lugares, direcciones e importes están inventados para mostrar la experiencia.

export const wedding = {
  couple: 'Ignacio & Martina',
  initials: 'M & J',
  dateLabel: 'Sábado 20 de marzo de 2027',
  dateShort: '20 de marzo de 2027',
  city: 'Cañuelas, Buenos Aires',
  photo: '/pareja-portada-ejemplo.webp',
};

export type EventKey = 'ceremonia' | 'recepcion' | 'fiesta' | 'civil' | 'brunch';

export type WeddingEvent = {
  key: EventKey;
  /** Ícono elegido (id de `EventIconId`); sin él se usa el de fábrica del momento. */
  icon?: string;
  label: string;
  time: string;
  name: string;
  address: string;
  note: string;
  maps: string;
};

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const address = 'Camino de los Aromos 1450, Cañuelas, Buenos Aires';
const church = 'Del Carmen 545, Cañuelas, Buenos Aires';

export const events: WeddingEvent[] = [
  { key: 'ceremonia', label: 'Ceremonia', time: '17:00 hs', name: 'Parroquia Nuestra Señora del Carmen', address: church, note: 'Pedimos llegar con 20 minutos de anticipación.', maps: maps('Parroquia Nuestra Señora del Carmen, ' + church) },
  { key: 'recepcion', label: 'Recepción', time: '18:30 hs', name: 'Galería del Casco de La Margarita', address, note: 'Brindis, música en vivo y mesa de quesos mientras cae el sol.', maps: maps(address) },
  { key: 'fiesta', label: 'Fiesta', time: '20:30 hs', name: 'Salón del Casco de La Margarita', address, note: 'Cena, baile y desayuno de despedida. El cierre es a las 4 de la mañana.', maps: maps(address) },
];

/** Fecha del evento (hora de Argentina, UTC-3). */
export const weddingStart = '2027-03-20T17:00:00-03:00';
/** Fecha local (AAAA-MM-DD) y zona horaria fija, derivadas de weddingStart: se usan para el calendario. */
export const eventDate = weddingStart.slice(0, 10);
export const eventOffset = weddingStart.slice(-6);
/** Fecha límite para confirmar asistencia, tal como figura en el formulario. */
export const rsvpDeadline = '20 de enero';

/** Enlaces de Google Maps derivados de una dirección real del evento (no se inventan lugares). */
export const calendar = {
  title: 'Casamiento de Ignacio & Martina',
  start: '20270320T200000Z',
  end: '20270321T070000Z',
  location: `Parroquia Nuestra Señora del Carmen, ${church}`,
};

export const dressCode = {
  title: 'Elegante sport',
  text: 'Elegante sport. Les pedimos evitar el blanco y el marfil.',
  palette: [
    { name: 'Arena', color: '#d9cdb8' },
    { name: 'Oliva', color: '#b6b46e' },
    { name: 'Pizarra', color: '#707d87' },
    { name: 'Bosque', color: '#2b4045' },
  ],
};

export const social = { hashtag: '#IgnacioYMartina2027', handle: '@ignacioymartina.casamiento' };

export const greetings = [
  { who: 'Abuela Nené', text: 'Los quiero ver bailando el vals. Que sean muy felices.' },
  { who: 'Cami y Tomás', text: 'Ya tenemos el vestido y el traje listos. ¡Nos vemos en la pista!' },
];

/** Fotos del micrositio (mosaico). */
export const gallery = [
  { src: '/ejemplo-foto-1.webp', alt: 'Ignacio y Martina caminando abrazados por un campo', pos: 'center 40%' },
  { src: '/ejemplo-foto-2.webp', alt: 'Ignacio y Martina sentados frente al mar', pos: 'center 45%' },
  { src: '/ejemplo-foto-3.webp', alt: 'Ignacio besa a Martina en un jardín', pos: 'center 40%' },
  { src: '/ejemplo-foto-4.webp', alt: 'Ignacio y Martina abrazados, ella muestra su anillo', pos: 'center 35%' },
  { src: '/pareja-portada.jpg?v=3', alt: 'Ignacio y Martina abrazados frente al mar', pos: 'center 30%' },
];

export const playlist = {
  name: 'Nuestra fiesta · Ignacio & Martina',
  tracks: [
    { title: 'La Bachata', artist: 'Manuel Turizo' },
    { title: 'Chandelier', artist: 'Sia' },
    { title: 'Mi Gente', artist: 'J Balvin, Willy William' },
    { title: 'Gimme! Gimme! Gimme!', artist: 'ABBA' },
    { title: 'Zapatillas', artist: 'El Canto del Loco' },
    { title: 'Tusa', artist: 'Karol G, Nicki Minaj' },
  ],
};

export const menus = [
  { id: 'sin-restricciones', name: 'Sin restricciones' },
  { id: 'vegetariano', name: 'Vegetariano' },
  { id: 'vegano', name: 'Vegano' },
  { id: 'sin-tacc', name: 'Sin TACC (celíaco)' },
  { id: 'sin-lactosa', name: 'Intolerancia a la lactosa' },
  { id: 'kids', name: 'Menú kids' },
] as const;

export const alias = 'ignacio.martina';

export type Category = 'Luna de miel' | 'Hogar' | 'Experiencias' | 'Proyectos futuros';
export const categories: Category[] = ['Luna de miel', 'Hogar', 'Experiencias', 'Proyectos futuros'];

export type IconKey =
  | 'utensils' | 'bed' | 'chef' | 'plane' | 'sofa' | 'lamp' | 'wine'
  | 'palette' | 'ticket' | 'sprout' | 'dog' | 'trees' | 'coffee' | 'sheets' | 'compass' | 'home';

export type Destination = 'Europa' | 'África' | 'Estados Unidos' | 'Asia' | 'Sudamérica';

export type Gift = {
  id: string;
  name: string;
  text: string;
  amount: number;
  category: Category;
  /** Solo luna de miel: lugar al que corresponde. 'Cualquiera' = sirve para cualquier destino. */
  destination?: Destination | 'Cualquiera' | undefined;
  image?: string | undefined;
  /** Encuadre de la foto dentro del cuadrado (object-position). */
  pos?: string | undefined;
  /** Acercamiento leve de la foto: escala y punto fijo (transform-origin), para centrarla con precisión. */
  zoom?: { scale: number; origin: string } | undefined;
  /** 'contain': se ve la foto entera, con su propio fondo difuminado a los costados. */
  fit?: 'contain' | 'white' | undefined;
  icon: IconKey;
};

/** Catálogo curado de la demo: 26 regalos repartidos entre cuatro categorías (8 · 6 · 8 · 4). */
export const gifts: Gift[] = [
  { id: 'excursion', name: 'Excursión en barco', text: 'Un día de navegación y snorkel en aguas turquesa.', amount: 250000, category: 'Experiencias', destination: 'Cualquiera', icon: 'compass', image: '/regalo-excursion.jpg' },
  { id: 'cena-mar', name: 'Cena frente al mar', text: 'Una mesa al atardecer en la costa de Puglia, solo para los dos.', amount: 180000, category: 'Experiencias', destination: 'Europa', icon: 'utensils', image: '/regalo-cena-mar.webp', pos: 'center 68%' },
  { id: 'masajes', name: 'Spa para dos', text: 'Un día de spa y una sesión de masajes para arrancar el viaje en calma.', amount: 300000, category: 'Experiencias', destination: 'Cualquiera', icon: 'sprout', image: '/lm-masajes.webp' },
  { id: 'vinos', name: 'Cata en Mendoza', text: 'Una tarde de cata de vinos en una bodega del Valle de Uco.', amount: 95000, category: 'Experiencias', icon: 'wine', image: '/regalo-cata-mendoza.webp', pos: 'center 52%' },
  { id: 'globo', name: 'Paseo en globo', text: 'Un amanecer en el aire, solo para los dos.', amount: 360000, category: 'Experiencias', destination: 'Cualquiera', icon: 'compass', image: '/lm-globo.webp?v=2', pos: 'center 55%' },
  { id: 'sup', name: 'Alquiler tabla SUP', text: 'Una mañana de remo suave sobre agua transparente, para los dos.', amount: 190000, category: 'Experiencias', destination: 'Cualquiera', icon: 'compass', image: '/lm-sup.webp' },
  { id: 'vuelo-interno', name: 'Pasaje luna de miel', text: 'Entre todos nos acercan los pasajes. Cada aporte suma.', amount: 1500000, category: 'Luna de miel', destination: 'Cualquiera', icon: 'plane', image: '/lm-avion.jpg', pos: 'center 45%' },
  { id: 'boutique', name: 'Noche en hotel boutique', text: 'Un hotel chico y con encanto, para una noche especial.', amount: 380000, category: 'Luna de miel', destination: 'Cualquiera', icon: 'bed', image: '/lm-boutique.webp?v=2', pos: 'center 45%' },
  { id: 'isla', name: 'Estadía en una isla', text: 'Unos días de playa, mar y desconexión.', amount: 305000, category: 'Luna de miel', destination: 'Cualquiera', icon: 'bed', image: '/lm-isla.webp' },
  { id: 'santorini', name: 'Día en Santorini', text: 'Un día para recorrer la isla, sus pueblos blancos y sus atardeceres.', amount: 305000, category: 'Luna de miel', destination: 'Europa', icon: 'compass', image: '/lm-santorini.webp' },
  { id: 'patagonia', name: 'Viaje a la Patagonia', text: 'Lagos, montañas y glaciares en un solo viaje.', amount: 345000, category: 'Luna de miel', destination: 'Sudamérica', icon: 'trees', image: '/lm-patagonia.webp' },
  { id: 'japon', name: 'Estadía en Japón', text: 'Unos días entre ciudades, templos y buena comida.', amount: 305000, category: 'Luna de miel', destination: 'Asia', icon: 'bed', image: '/lm-japon.webp' },
  { id: 'marruecos', name: 'Viaje a Marruecos', text: 'Medinas, té de menta y noches en el desierto.', amount: 345000, category: 'Luna de miel', destination: 'África', icon: 'bed', image: '/lm-marruecos.webp' },
  { id: 'nueva-york', name: 'Viaje a Nueva York', text: 'Una escapada a la ciudad que nunca duerme.', amount: 300000, category: 'Luna de miel', destination: 'Estados Unidos', icon: 'bed', image: '/lm-nueva-york.webp' },
  { id: 'ollas', name: 'Juego de ollas', text: 'Tres piezas esmaltadas para las primeras cenas en casa.', amount: 120000, category: 'Hogar', icon: 'chef', image: '/lista-de-regalos-olla.jpg' },
  { id: 'vajilla', name: 'Set de vajilla', text: 'Platos y bowls en blanco mate para la mesa de todos los días.', amount: 130000, category: 'Hogar', icon: 'utensils', image: '/regalo-vajilla.jpg', pos: 'center 55%' },
  { id: 'cafetera', name: 'Cafetera Nespresso', text: 'Para los cafés de todas las mañanas en casa.', amount: 150000, category: 'Hogar', icon: 'coffee', image: '/regalo-cafetera.webp', pos: 'center 55%' },
  { id: 'sabanas', name: 'Juego de sábanas', text: 'Sábanas de lino y algodón para estrenar la cama de casa.', amount: 90000, category: 'Hogar', icon: 'sheets', image: '/regalo-sabanas.webp', pos: 'center 50%' },
  { id: 'horno', name: 'Horno de empotrar', text: 'Un horno de vidrio negro para la cocina nueva, de esos que dan ganas de invitar gente.', amount: 650000, category: 'Hogar', icon: 'chef', image: '/regalo-horno.webp', pos: 'center 55%' },
  { id: 'lampara', name: 'Lámpara de living', text: 'Luz cálida para las noches de lectura.', amount: 75000, category: 'Hogar', icon: 'lamp', image: '/lista-de-regalos-lampara.jpg' },
  { id: 'cava', name: 'Cava de vinos', text: 'Una cava para guardar las botellas de los brindis que vienen.', amount: 280000, category: 'Hogar', icon: 'wine', image: '/regalo-cava-vinos.webp', pos: 'center 62%' },
  { id: 'heladera', name: 'Heladera dos puertas', text: 'Una heladera grande, de acero y de dos puertas, para la cocina de casa.', amount: 1400000, category: 'Hogar', icon: 'chef', image: '/regalo-heladera-2.webp', pos: 'center 36%', zoom: { scale: 1.06, origin: '18% 50%' } },
  { id: 'casa', name: 'Fondo para la casa', text: 'Para terminar de armar nuestro primer hogar, de a poco.', amount: 500000, category: 'Proyectos futuros', icon: 'home', image: '/regalo-casa.jpg' },
  { id: 'remodelacion', name: 'Remodelar la casa', text: 'Para las obras de la casa: paredes, instalaciones y terminaciones.', amount: 550000, category: 'Proyectos futuros', icon: 'home', image: '/regalo-remodelacion.webp', pos: 'center 40%' },
  { id: 'parrilla', name: 'Parrilla', text: 'Para los asados con amigos, los domingos en casa.', amount: 320000, category: 'Proyectos futuros', icon: 'home', image: '/regalo-parrilla-2.jpg', fit: 'white' },
  { id: 'fogonero', name: 'Fogonero de jardín', text: 'Para las noches de fuego y charla bajo las estrellas.', amount: 140000, category: 'Proyectos futuros', icon: 'trees', image: '/regalo-fogonero.webp', pos: 'center 50%' },
];

export const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
