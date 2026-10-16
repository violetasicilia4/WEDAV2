// Casamientos que se pueden encontrar desde la pantalla de invitados.
// Es una demostración: las cuatro parejas abren la lista de regalos de ejemplo; el listado real saldrá de los eventos creados con Weda.
export type Couple = { id: string; names: string; photo: string; to: '/ejemplo/regalos' };

export const couples: Couple[] = [
  { id: 'ignacio-martina', names: 'Ignacio & Martina', photo: '/parejas/ignacio-martina.jpg', to: '/ejemplo/regalos' },
  { id: 'camila-lucas', names: 'Camila & Lucas', photo: '/parejas/camila-lucas.jpg', to: '/ejemplo/regalos' },
  { id: 'valentina-mariano', names: 'Valentina & Mariano', photo: '/parejas/valentina-mariano.jpg', to: '/ejemplo/regalos' },
  { id: 'julieta-franco', names: 'Julieta & Franco', photo: '/parejas/julieta-franco.jpg', to: '/ejemplo/regalos' },
];

/** Normaliza para buscar sin importar mayúsculas, acentos ni el "&" / "y" entre los nombres. */
export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' y ').replace(/\s+/g, ' ').trim();

export function findCouples(query: string): Couple[] {
  const q = normalize(query);
  if (!q) return couples;
  const words = q.split(' ').filter(w => w !== 'y');
  return couples.filter(c => {
    const hay = normalize(c.names);
    return words.every(w => hay.includes(w));
  });
}
