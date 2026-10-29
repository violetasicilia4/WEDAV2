// Fotos del casamiento fuera de la base. El navegador las manda embebidas (data URL, ya achicadas por readImage); al guardar, el servidor las
// escribe como archivos en WEDA_DATA_DIR/media y en el borrador queda solo la dirección /api/media/<sha256>.<ext>. Así:
//  · la base y el snapshot publicado no cargan cadenas enormes;
//  · otro dispositivo ve las fotos (vienen por URL);
//  · la misma foto no se guarda dos veces (nombre = hash del contenido) y el nombre no se puede adivinar sin tener la foto.
// Pendiente (production-readiness.md): almacenamiento de objetos (S3/R2) y subida directa desde el navegador para no reenviar las fotos en cada guardado.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ApiError } from './errors';

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const NAME = /^[0-9a-f]{64}\.(jpg|png|webp)$/;

/** Tipo real por los primeros bytes (no el que declara el data URL). */
function sniff(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

/** Guarda una foto embebida y devuelve su dirección. Lanza si no es una imagen válida o es demasiado grande. */
function store(dataDir: string, dataUrl: string): string {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw new ApiError(415, 'unsupported_image');
  const bytes = Buffer.from(m[2]!, 'base64');
  if (bytes.length === 0) throw new ApiError(415, 'unsupported_image');
  if (bytes.length > MAX_PHOTO_BYTES) throw new ApiError(413, 'image_too_large');
  const mime = sniff(bytes);
  if (!mime) throw new ApiError(415, 'unsupported_image');
  const name = `${createHash('sha256').update(bytes).digest('hex')}.${EXT[mime]}`;
  const dir = path.join(dataDir, 'media');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  if (!existsSync(file)) writeFileSync(file, bytes, { mode: 0o644 });
  return `/api/media/${name}`;
}

/** Recorre el borrador y reemplaza cada foto embebida (data:image/…) por su dirección. Devuelve un objeto nuevo; no toca el original. */
export function externalizeImages<T>(value: T, dataDir: string): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return v.startsWith('data:image/') ? store(dataDir, v) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

/** Lee una foto guardada (pública: la usan las invitaciones publicadas). null si el nombre no es válido o no existe. */
export function readMedia(dataDir: string, name: string): { bytes: Buffer; mime: string } | null {
  if (!NAME.test(name)) return null;
  const file = path.join(dataDir, 'media', name);
  if (!existsSync(file)) return null;
  return { bytes: readFileSync(file), mime: MIME[name.split('.').pop()!]! };
}
