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
  /** Encuadre de la portada (object-position) para las miniaturas cuadradas. */
  coverPosition?: string | undefined;
  /** Fecha del evento (AAAA-MM-DD), o null si todavía no está disponible. */
  date: string | null;
  /** Estado del evento de demostración. */
  status: "demo";
  /** Rutas reales del proyecto a las que se puede continuar. Solo existen para el casamiento de ejemplo. */
  routes?: { gifts: "/ejemplo/regalos"; site: "/ejemplo" };
};

const photo = (name: string, alt: string, position?: string) => ({
  cover: name,
  coverAlt: alt,
  coverPosition: position,
});

// PLACEHOLDERS: solo hay ocho fotografías de pareja en el proyecto, así que varias parejas ficticias comparten archivo
// (con encuadres distintos). Reemplazar por la portada propia de cada evento cuando existan.
const ph = {
  ignacio: (names: string) =>
    photo("/pareja-portada-9.webp", `${names} sonriendo juntos frente al mar`),
  campo: (names: string, pos?: string) =>
    photo("/ejemplo-foto-1.webp", `${names} caminando abrazados por un campo`, pos),
  mar: (names: string, pos?: string) =>
    photo("/ejemplo-foto-2.webp", `${names} sentados frente al mar`, pos),
  jardin: (names: string, pos?: string) =>
    photo("/ejemplo-foto-3.webp", `${names} en un jardín`, pos),
  anillo: (names: string, pos?: string) =>
    photo("/ejemplo-foto-4.webp", `${names} abrazados, ella muestra su anillo`, pos),
  playa: (names: string, pos?: string) =>
    photo("/pareja-portada.jpg", `${names} abrazados frente al mar`, pos),
  retrato: (names: string, pos?: string) =>
    photo("/pareja-portada-8.webp", `${names} riéndose juntos`, pos),
  duo: (names: string, pos?: string) =>
    photo("/pareja-portada-2.webp", `${names} posando juntos`, pos),
};

const wedding = (
  a: string,
  b: string,
  cover: ReturnType<typeof photo>,
  date: string | null,
): DemoWedding => ({
  id: `demo-${slug(a)}-${slug(b)}`,
  partnerA: a,
  partnerB: b,
  ...cover,
  date,
  status: "demo",
});

function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

const n = (a: string, b: string) => `${a} y ${b}`;

export const demoWeddings: DemoWedding[] = [
  {
    ...wedding("Ignacio", "Martina", ph.ignacio(n("Ignacio", "Martina")), "2027-03-20"),
    routes: { gifts: "/ejemplo/regalos", site: "/ejemplo" },
  },
  wedding("Camila", "Lucas", ph.campo(n("Camila", "Lucas")), "2026-11-14"),
  wedding("Valentina", "Mariano", ph.mar(n("Valentina", "Mariano")), null),
  wedding("Julieta", "Franco", ph.jardin(n("Julieta", "Franco")), "2027-05-08"),
  wedding("Sofía", "Tomás", ph.anillo(n("Sofía", "Tomás")), "2026-12-05"),
  wedding("Lucía", "Agustín", ph.playa(n("Lucía", "Agustín"), "center 30%"), "2027-02-13"),
  wedding("Carolina", "Nicolás", ph.retrato(n("Carolina", "Nicolás"), "center 20%"), "2026-10-31"),
  wedding("Florencia", "Matías", ph.duo(n("Florencia", "Matías"), "center 25%"), null),
  wedding("Paula", "Santiago", ph.campo(n("Paula", "Santiago"), "30% 40%"), "2027-04-17"),
  wedding("Agustina", "Joaquín", ph.mar(n("Agustina", "Joaquín"), "70% 45%"), "2027-01-23"),
  wedding("Micaela", "Federico", ph.jardin(n("Micaela", "Federico"), "40% 30%"), "2026-11-28"),
  wedding("Rocío", "Gonzalo", ph.anillo(n("Rocío", "Gonzalo"), "60% 25%"), "2027-06-12"),
  wedding("Candela", "Ezequiel", ph.playa(n("Candela", "Ezequiel"), "60% 40%"), null),
  wedding("Belén", "Facundo", ph.retrato(n("Belén", "Facundo"), "40% 35%"), "2027-03-06"),
  wedding(
    "Antonella",
    "Maximiliano",
    ph.duo(n("Antonella", "Maximiliano"), "55% 30%"),
    "2026-12-19",
  ),
  wedding("Daniela", "Sebastián", ph.campo(n("Daniela", "Sebastián"), "70% 40%"), "2027-05-22"),
  wedding("Mariana", "Pablo", ph.mar(n("Mariana", "Pablo"), "30% 50%"), "2027-02-27"),
  wedding("Natalia", "Diego", ph.jardin(n("Natalia", "Diego"), "65% 35%"), "2026-11-07"),
  wedding("Victoria", "Ramiro", ph.anillo(n("Victoria", "Ramiro"), "35% 30%"), "2027-04-03"),
  wedding("Milagros", "Bruno", ph.playa(n("Milagros", "Bruno"), "40% 45%"), "2027-07-10"),
  wedding("Abril", "Thiago", ph.retrato(n("Abril", "Thiago"), "65% 30%"), null),
  wedding("Constanza", "Leandro", ph.duo(n("Constanza", "Leandro"), "40% 35%"), "2026-12-12"),
  wedding("Pilar", "Andrés", ph.campo(n("Pilar", "Andrés"), "50% 60%"), "2027-03-27"),
  wedding("Renata", "Emilio", ph.mar(n("Renata", "Emilio"), "50% 30%"), "2027-05-01"),
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
