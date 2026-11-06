// Archivos de Weda: fotos del casamiento (públicas) y comprobantes de transferencia (privados). Dos implementaciones con la misma forma:
// en disco (WEDA_DATA_DIR, la de siempre) y en Supabase Storage (OPS-08, D-07): bucket público `media` y bucket privado `receipts`.
// Los comprobantes nunca tienen una dirección pública: el servidor verifica a la pareja dueña y recién ahí los lee y los entrega (ajuste 1 del plan).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MEDIA_NAME = /^[0-9a-f]{64}\.(jpg|png|webp)$/;
export const MEDIA_MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export interface Files {
  /** Guarda una foto (nombre = hash del contenido: guardarla dos veces no duplica). */
  putMedia(name: string, bytes: Buffer, mime: string): Promise<void>;
  /** Una foto guardada: sus bytes (disco) o la dirección pública donde está (Storage). null si no existe. */
  media(name: string): Promise<{ bytes: Buffer; mime: string } | { redirect: string } | null>;
  putReceipt(key: string, bytes: Buffer, mime: string): Promise<void>;
  receipt(key: string): Promise<Buffer | null>;
  removeReceipt(key: string): Promise<void>;
}

/** En disco, dentro de WEDA_DATA_DIR (fotos en media/, comprobantes en receipts/ con permisos 600). */
export class DiskFiles implements Files {
  constructor(private dataDir: string) {}
  private dir(kind: 'media' | 'receipts') {
    const d = path.join(this.dataDir, kind);
    mkdirSync(d, { recursive: true });
    return d;
  }
  async putMedia(name: string, bytes: Buffer) {
    const file = path.join(this.dir('media'), name);
    if (!existsSync(file)) writeFileSync(file, bytes, { mode: 0o644 });
  }
  async media(name: string) {
    if (!MEDIA_NAME.test(name)) return null;
    const file = path.join(this.dataDir, 'media', name);
    if (!existsSync(file)) return null;
    return { bytes: readFileSync(file), mime: MEDIA_MIME[name.split('.').pop()!]! };
  }
  async putReceipt(key: string, bytes: Buffer) {
    writeFileSync(path.join(this.dir('receipts'), key), bytes, { mode: 0o600 });
  }
  async receipt(key: string) {
    const file = path.join(this.dataDir, 'receipts', key);
    return existsSync(file) ? readFileSync(file) : null;
  }
  async removeReceipt(key: string) {
    rmSync(path.join(this.dataDir, 'receipts', key), { force: true });
  }
}

/**
 * En Supabase Storage, con la clave de servicio (solo el servidor). `prefix` separa los archivos de cada entorno de pruebas dentro de los buckets.
 * Los buckets se crean solos la primera vez si no existen.
 */
export class SupabaseFiles implements Files {
  private ready: Promise<void> | null = null;
  constructor(private client: SupabaseClient, private prefix = '') {}
  private ensureBuckets() {
    return (this.ready ??= (async () => {
      const { data } = await this.client.storage.listBuckets();
      const have = new Set((data ?? []).map(b => b.name));
      if (!have.has('media')) await this.must(this.client.storage.createBucket('media', { public: true }), 'createBucket media');
      if (!have.has('receipts')) await this.must(this.client.storage.createBucket('receipts', { public: false }), 'createBucket receipts');
    })().catch(e => { this.ready = null; throw e; }));
  }
  private async must<T extends { error: unknown }>(p: PromiseLike<T>, what: string): Promise<T> {
    const r = await p;
    if (r.error) throw new Error(`Storage (${what}): ${(r.error as { message?: string }).message ?? String(r.error)}`);
    return r;
  }
  private key(k: string) { return `${this.prefix}${k}`; }
  async putMedia(name: string, bytes: Buffer, mime: string) {
    await this.ensureBuckets();
    // upsert: la misma foto (mismo hash) se puede volver a subir sin error.
    await this.must(this.client.storage.from('media').upload(this.key(name), bytes, { contentType: mime, upsert: true, cacheControl: '31536000' }), 'upload media');
  }
  async media(name: string) {
    if (!MEDIA_NAME.test(name)) return null;
    return { redirect: this.client.storage.from('media').getPublicUrl(this.key(name)).data.publicUrl };
  }
  async putReceipt(key: string, bytes: Buffer, mime: string) {
    await this.ensureBuckets();
    await this.must(this.client.storage.from('receipts').upload(this.key(key), bytes, { contentType: mime, upsert: false }), 'upload receipt');
  }
  async receipt(key: string) {
    await this.ensureBuckets();
    const { data, error } = await this.client.storage.from('receipts').download(this.key(key));
    if (error || !data) return null;
    // Algunos entornos (las pruebas, con jsdom) dan un Blob sin arrayBuffer(): Response lo lee igual en todos.
    return Buffer.from(await new Response(data).arrayBuffer());
  }
  async removeReceipt(key: string) {
    await this.ensureBuckets();
    await this.client.storage.from('receipts').remove([this.key(key)]);
  }
  /** Nombres guardados bajo el prefijo (lo usan las pruebas). */
  async list(bucket: 'media' | 'receipts'): Promise<string[]> {
    const { data } = await this.client.storage.from(bucket).list(this.prefix.replace(/\/$/, ''), { limit: 1000 });
    return (data ?? []).map(f => f.name);
  }
}
