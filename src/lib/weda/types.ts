// Modelos del producto Weda (frontend). Todo el estado de la aplicación vive en un solo objeto, AppState,
// para que la lista de regalos, los invitados, el editor y la vista previa compartan el mismo origen de datos.
// El día que exista una API, este es el contrato que se persiste en el servidor.
import type { Category, EventKey, IconKey, Gift } from '@/lib/demo-wedding';

export type PlanId = 'regalos' | 'invitacion' | 'completo';

/** Foto elegida por la pareja: subida desde su dispositivo, una imagen genérica de Weda o ninguna. */
export type PhotoChoice =
  | { kind: 'upload'; src: string; name: string }
  | { kind: 'weda'; id: string }
  | { kind: 'none' };

/** Nombres de la pareja. Los apellidos son opcionales: se piden al empezar y por ahora no se muestran en ningún lado. */
export type Couple = { first: string; second: string; firstLast?: string; secondLast?: string };

/** Regalo simbólico dentro de la lista de la pareja. `fromSet` recuerda de qué colección vino (si vino de una). */
export type ListGift = {
  id: string;
  /** Id del catálogo de Weda; ausente en los regalos propios. */
  catalogId?: string | undefined;
  fromSet?: string | undefined;
  name: string;
  text: string;
  amount: number;
  category: Category;
  icon: IconKey;
  image?: string | undefined;
  pos?: string | undefined;
  fit?: Gift['fit'] | undefined;
  zoom?: Gift['zoom'] | undefined;
  custom?: boolean | undefined;
};

/** Regalo recibido: `name` es quien regala. El resto se guarda al enviarlo para que el panel lo muestre aunque después se quite de la lista. */
export type GivenGift = { id: string; name: string; message: string; giftName?: string | undefined; amount?: number | undefined; how?: 'alias' | 'tarjeta' | undefined; at?: number | undefined };

export type GuestStatus = 'confirmed' | 'declined' | 'pending';
export type GuestSource = 'rsvp' | 'manual';

export type Guest = {
  id: string;
  first: string;
  last: string;
  status: GuestStatus;
  /** Restricción alimentaria (misma lista que usa el formulario público). Vacío = sin dato. */
  menu: string;
  groupId: string | null;
  source: GuestSource;
};

/** Mesa o grupo. `capacity` (lugares) y `note` (descripción) son opcionales. */
export type Group = { id: string; name: string; capacity?: number; note?: string };

export type SiteEvent = {
  key: EventKey;
  enabled: boolean;
  /** Nombre que la pareja le da al momento («Ceremonia», «After beach»…). Vacío = «Evento 1», «Evento 2»… */
  title: string;
  name: string;
  address: string;
  /** "HH:MM" */
  time: string;
  note: string;
  /** Enlace propio a Google Maps; si está vacío se genera uno a partir de la dirección. */
  mapsUrl: string;
};

export type SitePhoto = { id: string; src: string; alt: string };

export type SiteConfig = {
  coverText: string;
  events: SiteEvent[];
  countdown: boolean;
  rsvp: { enabled: boolean; /** AAAA-MM-DD o vacío */ deadline: string; menus: boolean };
  dressCode: { enabled: boolean; title: string; text: string };
  gallery: { enabled: boolean; photos: SitePhoto[]; hashtag: string; handle: string };
  playlist: { enabled: boolean; name: string; tracks: { title: string; artist: string }[] };
  message: { enabled: boolean; title: string; text: string };
};

/** Un pago SIMULADO (no hay cobro real): publicar un plan, o pagar la diferencia al mejorar de plan. */
export type Payment = { kind: 'publish' | 'upgrade'; planId: PlanId; amount: number; /** ISO 8601 */ at: string };
/** Publicación simulada: el sitio se «publica» solo en este navegador. Se puede dar de baja (`live: false`) sin perder el pago. */
export type Publication = { planId: PlanId; live: boolean; /** ISO 8601 */ publishedAt: string; /** ISO 8601: un año después de publicar. */ expiresAt: string; payments: Payment[] };

export type AppState = {
  version: 2;
  /** true cuando la pareja terminó el onboarding. */
  onboarded: boolean;
  /** Correo de la cuenta, tal como se escribió al ingresar. Solo se guarda en este navegador; la clave nunca se guarda. */
  email: string;
  couple: Couple;
  /** AAAA-MM-DD, o null si todavía no tienen fecha. */
  date: string | null;
  photo: PhotoChoice;
  /** Plan al que apunta la pareja antes de elegirlo (viene de los botones de la landing). */
  preferredPlan: PlanId | null;
  planId: PlanId | null;
  /** `acceptCard`: preferencia de la pareja; en esta etapa no hay cobro real con tarjeta. */
  gifts: { cover: string | null; alias: string; bank: string; cbu: string; acceptCard: boolean; items: ListGift[]; given: GivenGift[] };
  guests: Guest[];
  groups: Group[];
  site: SiteConfig;
  /** true si los datos vienen del escenario de ejemplo (Tomás y Martina). */
  seeded: boolean;
  /** Publicación (simulada) con su historial de pagos, o null si todavía no se publicó. */
  publication: Publication | null;
};
