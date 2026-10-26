import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

const scrypt = (pw: string, salt: Buffer, keylen: number, N: number) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, keylen, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))));

const N = 16384;

/** scrypt con sal aleatoria. Formato: scrypt$N$sal$hash (base64url). */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, N);
  return `scrypt$${N}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !n || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(pw, Buffer.from(salt, 'base64url'), expected.length, Number(n));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

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
