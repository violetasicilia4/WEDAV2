// Archivos de Weda en Supabase Storage (OPS-08, D-07): fotos del casamiento en el bucket público `media` y comprobantes de transferencia en el
// bucket privado `receipts`. `Files` es la interfaz que usa el servicio.
// Los comprobantes nunca tienen una dirección pública: el servidor verifica a la pareja dueña y recién ahí los lee y los entrega (ajuste 1 del plan).
import type { SupabaseClient } from '@supabase/supabase-js';

export const MEDIA_NAME = /^[0-9a-f]{64}\.(jpg|png|webp)$/;
export const MEDIA_MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export interface Files {
  /** Guarda una foto (nombre = hash del contenido: guardarla dos veces no duplica). */
  putMedia(name: string, bytes: Buffer, mime: string): Promise<void>;
  /** La dirección pública de una foto (Storage). null si el nombre no es válido. */
  media(name: string): Promise<{ redirect: string } | null>;
  putReceipt(key: string, bytes: Buffer, mime: string): Promise<void>;
  receipt(key: string): Promise<Buffer | null>;
  removeReceipt(key: string): Promise<void>;
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
