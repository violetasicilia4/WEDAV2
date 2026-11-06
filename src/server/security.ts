import { createHash, randomBytes } from 'node:crypto';

export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const newId = (prefix: string) => `${prefix}_${randomBytes(12).toString('base64url')}`;

/** Limitador por clave en memoria (una sola instancia). Con varias instancias hay que moverlo a la base o a un proxy. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}
  /** true si todavía se permite; registra el intento. */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter(t => now - t < this.windowMs);
    if (recent.length >= this.max) { this.hits.set(key, recent); return false; }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (v.every(t => now - t >= this.windowMs)) this.hits.delete(k);
    return true;
  }
  reset(key: string) { this.hits.delete(key); }
}
