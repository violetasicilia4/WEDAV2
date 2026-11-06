// Fotos del casamiento fuera de la base. El navegador las manda embebidas (data URL, ya achicadas por readImage); al guardar, el servidor las
// guarda como archivos (storage.ts: en disco o en Supabase Storage) y en el borrador queda solo la dirección /api/media/<sha256>.<ext>. Así:
//  · la base y el snapshot publicado no cargan cadenas enormes;
//  · otro dispositivo ve las fotos (vienen por URL);
//  · la misma foto no se guarda dos veces (nombre = hash del contenido) y el nombre no se puede adivinar sin tener la foto.
// Pendiente: subida directa desde el navegador, para no reenviar las fotos en cada guardado.
import { createHash } from 'node:crypto';
import { ApiError } from './errors';

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

/** Tipo real por los primeros bytes (no el que declara el data URL). */
function sniff(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export type MediaUpload = { name: string; bytes: Buffer; mime: string };

/** Valida una foto embebida y devuelve su nombre y contenido. Lanza si no es una imagen válida o es demasiado grande. */
function parse(dataUrl: string): MediaUpload {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw new ApiError(415, 'unsupported_image');
  const bytes = Buffer.from(m[2]!, 'base64');
  if (bytes.length === 0) throw new ApiError(415, 'unsupported_image');
  if (bytes.length > MAX_PHOTO_BYTES) throw new ApiError(413, 'image_too_large');
  const mime = sniff(bytes);
  if (!mime) throw new ApiError(415, 'unsupported_image');
  return { name: `${createHash('sha256').update(bytes).digest('hex')}.${EXT[mime]}`, bytes, mime };
}

/** Recorre el borrador y reemplaza cada foto embebida (data:image/…) por su dirección. Devuelve un objeto nuevo y las fotos a guardar; no toca el original. */
export function externalizeImages<T>(value: T): { value: T; uploads: MediaUpload[] } {
  const uploads = new Map<string, MediaUpload>();
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      if (!v.startsWith('data:image/')) return v;
      const u = parse(v);
      uploads.set(u.name, u);
      return `/api/media/${u.name}`;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(value) as T, uploads: [...uploads.values()] };
}
