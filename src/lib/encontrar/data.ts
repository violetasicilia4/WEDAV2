// Eventos FICTICIOS de demostración para "Encontrá tu casamiento".
// Ninguno de estos nombres, fechas ni fotos corresponde a personas reales: viven solo en el frontend.
// INTEGRACIÓN FUTURA: en producción este arreglo desaparece; `searchWeddings` (ver ./search.ts) pasa a consultar
// un servicio que decide qué eventos puede encontrar cada persona y qué datos puede ver (ver docs/encontrar-tu-casamiento.md).

export type DemoWedding = {
  /** Identificador único del evento. */
  id: string;
  /** Nombre de una persona de la pareja. */
  partnerA: string;
  /** Nombre de la otra persona. */
  partnerB: string;
  /** Fotografía de portada propia del evento: se usa igual en todas las pantallas. */
  cover: string;
  /** Texto alternativo de la portada. */
  coverAlt: string;
  /** Fecha del evento (AAAA-MM-DD), o null si todavía no está disponible. */
  date: string | null;
  /** Estado del evento de demostración. */
  status: "demo";
  /** Ruta real del proyecto a la que se puede continuar. Solo existe para el casamiento de ejemplo. */
  route?: "/ejemplo";
};

export const demoWeddings: DemoWedding[] = [
  {
    id: "demo-ignacio-martina",
    partnerA: "Ignacio",
    partnerB: "Martina",
    cover: "/pareja-portada-9.webp",
    coverAlt: "Ignacio y Martina sonriendo juntos frente al mar",
    date: "2027-03-20",
    status: "demo",
    route: "/ejemplo",
  },
  {
    id: "demo-camila-lucas",
    partnerA: "Camila",
    partnerB: "Lucas",
    cover: "/ejemplo-foto-1.webp",
    coverAlt: "Camila y Lucas caminando abrazados por un campo",
    date: "2026-11-14",
    status: "demo",
  },
  {
    id: "demo-valentina-mariano",
    partnerA: "Valentina",
    partnerB: "Mariano",
    cover: "/ejemplo-foto-2.webp",
    coverAlt: "Valentina y Mariano sentados frente al mar",
    date: null,
    status: "demo",
  },
  {
    id: "demo-julieta-franco",
    partnerA: "Julieta",
    partnerB: "Franco",
    cover: "/ejemplo-foto-3.webp",
    coverAlt: "Julieta y Franco en un jardín",
    date: "2027-05-08",
    status: "demo",
  },
  {
    id: "demo-sofia-tomas",
    partnerA: "Sofía",
    partnerB: "Tomás",
    cover: "/ejemplo-foto-4.webp",
    coverAlt: "Sofía y Tomás abrazados, ella muestra su anillo",
    date: "2026-12-05",
    status: "demo",
  },
];

export const coupleNames = (w: Pick<DemoWedding, "partnerA" | "partnerB">) =>
  `${w.partnerA} & ${w.partnerB}`;

const longDate = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "20 de marzo de 2027", o null cuando el evento no tiene fecha disponible. */
export function formatWeddingDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : longDate.format(d);
}
