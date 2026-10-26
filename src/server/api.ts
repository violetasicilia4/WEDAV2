// API HTTP de Weda (JSON). Se monta en src/server.ts para toda ruta /api/*. Las rutas son finas: parsean, autentican y delegan en Service.
// Seguridad: cookie de sesión httpOnly + SameSite=Lax, escrituras solo con Content-Type JSON/binario y Origin propio, errores sin detalles internos.
import type { ServerConfig } from './config';
import { openDb } from './db';
import { ApiError } from './errors';
import { RateLimiter } from './security';
import { MAX_RECEIPT_BYTES, Service, type Session } from './service';

const COOKIE = 'weda_session';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

let shared: Service | undefined;
/** Servicio único del proceso (la base se abre al primer uso). */
export function getService(cfg: ServerConfig): Service {
  return (shared ??= new Service(openDb(cfg.dbPath), cfg));
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
const fail = (e: unknown): Response => {
  if (e instanceof ApiError) return json(e.status, { error: e.code, ...(e.message && e.message !== e.code ? { detail: e.message } : {}) });
  console.error(e);
  return json(500, { error: 'internal_error' });
};

function cookieOf(req: Request, name: string): string | undefined {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

const setCookie = (cfg: ServerConfig, token: string | null) =>
  `${COOKIE}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? 30 * 86400 : 0}${cfg.cookieSecure ? '; Secure' : ''}`;

/** Defensa CSRF adicional a SameSite: si el navegador manda Origin, tiene que ser el propio host (o uno permitido). */
function originOk(req: Request, cfg: ServerConfig): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // clientes que no son navegadores
  try {
    const o = new URL(origin);
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
    return o.host === host || cfg.allowedOrigins.includes(o.origin);
  } catch { return false; }
}

const publicWriteLimiter = new RateLimiter(30, 10 * 60_000);
/** IP para los límites de uso. Detrás de un proxy de confianza usa X-Forwarded-For; si el servidor está expuesto directo, ese encabezado lo puede falsear quien llama (ver docs/backend-readiness.md). */
const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'local';

async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) throw new ApiError(415, 'json_required');
  const text = await req.text();
  if (text.length > 7 * 1024 * 1024) throw new ApiError(413, 'payload_too_large');
  try {
    const v = JSON.parse(text);
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw 0;
    return v as Record<string, unknown>;
  } catch { throw new ApiError(400, 'invalid_json'); }
}

/** Devuelve null si la ruta no es de la API (para que siga el resto del servidor). */
export async function handleApi(req: Request, cfg: ServerConfig, svc: Service = getService(cfg)): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith('/api/')) return null;
  const parts = url.pathname.slice(5).split('/').filter(Boolean);
  const method = req.method.toUpperCase();
  try {
    if (method !== 'GET' && method !== 'HEAD' && !originOk(req, cfg)) throw new ApiError(403, 'bad_origin');
    const session = (): Session => svc.requireSession(svc.sessionFromToken(cookieOf(req, COOKIE)));
    const [a, b, c, d] = parts;

    if (a === 'health' && method === 'GET') return json(200, { ok: true });

    /* ---- cuenta */
    if (a === 'auth') {
      if (b === 'register' && method === 'POST') {
        const body = await readJson(req);
        const r = await svc.register(body['email'], body['password']);
        return json(201, { user: { email: r.user.email } }, { 'set-cookie': setCookie(cfg, r.token) });
      }
      if (b === 'login' && method === 'POST') {
        const body = await readJson(req);
        const r = await svc.login(body['email'], body['password'], clientIp(req));
        return json(200, { user: { email: r.user.email } }, { 'set-cookie': setCookie(cfg, r.token) });
      }
      if (b === 'logout' && method === 'POST') {
        svc.logout(cookieOf(req, COOKIE));
        return json(200, { ok: true }, { 'set-cookie': setCookie(cfg, null) });
      }
    }
    if (a === 'me' && method === 'GET') {
      const s = svc.sessionFromToken(cookieOf(req, COOKIE));
      return json(200, { user: s ? { email: s.email } : null });
    }

    /* ---- casamiento y publicación (dueño) */
    if (a === 'wedding') {
      if (!b && method === 'GET') return json(200, svc.getWedding(session().userId));
      if (!b && method === 'PUT') {
        const body = await readJson(req);
        const g = (body['guests'] ?? undefined) as { upsert?: unknown; remove?: unknown } | undefined;
        return json(200, svc.saveWedding(session().userId, { baseRevision: body['baseRevision'], draft: body['draft'], ...(g ? { guests: g } : {}) }));
      }
      if (b === 'publish' && method === 'POST') return json(200, svc.publish(session().userId));
      if (b === 'unpublish' && method === 'POST') { svc.unpublish(session().userId); return json(200, { ok: true }); }
    }

    /* ---- aportes (dueño) */
    if (a === 'contributions') {
      if (!b && method === 'GET') return json(200, { contributions: svc.listContributions(session().userId) });
      if (b && !c && method === 'PATCH') {
        const body = await readJson(req);
        return json(200, svc.setContributionStatus(session().userId, b, body['status'], body['note']));
      }
      if (b && c === 'receipt' && method === 'GET') {
        const r = svc.readReceipt(session().userId, b);
        return new Response(new Uint8Array(r.bytes), { status: 200, headers: { 'content-type': r.mime, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "sandbox; default-src 'none'", 'content-disposition': 'inline' } });
      }
    }

    /* ---- órdenes de plan (dueño). No hay ruta para marcar «paid»: solo el proveedor, por webhook (pendiente). */
    if (a === 'orders') {
      if (!b && method === 'GET') return json(200, { orders: svc.listOrders(session().userId) });
      if (!b && method === 'POST') { const body = await readJson(req); return json(201, svc.createOrder(session().userId, body['planId'])); }
    }
    if (a === 'webhooks' && b === 'payments') return json(501, { error: 'payments_not_configured' });

    /* ---- público (sin sesión) */
    if (a === 'public') {
      if (b === 'contributions' && c) {
        const token = req.headers.get('x-manage-token') ?? undefined;
        if (!d && method === 'GET') return json(200, svc.guestContributionStatus(c, token));
        if (d === 'receipt' && method === 'PUT') {
          if (!publicWriteLimiter.take(`rcp|${clientIp(req)}`)) throw new ApiError(429, 'too_many_requests');
          const declared = Number(req.headers.get('content-length') ?? '0');
          if (declared > MAX_RECEIPT_BYTES) throw new ApiError(413, 'file_too_large');
          const buf = Buffer.from(await req.arrayBuffer());
          return json(200, svc.attachReceipt(c, token, buf));
        }
      }
      if (b && !c && method === 'GET') return json(200, svc.getPublicSite(b), { 'cache-control': 'no-store' });
      if (b && c === 'rsvp' && method === 'POST') {
        if (!publicWriteLimiter.take(`rsvp|${clientIp(req)}|${b}`)) throw new ApiError(429, 'too_many_requests');
        const body = await readJson(req);
        return json(200, svc.submitRsvp(b, body['people']));
      }
      if (b && c === 'contributions' && method === 'POST') {
        if (!publicWriteLimiter.take(`apo|${clientIp(req)}|${b}`)) throw new ApiError(429, 'too_many_requests');
        const r = svc.submitContribution(b, await readJson(req));
        return json(r.replay ? 200 : 201, r);
      }
    }
    throw new ApiError(404, 'not_found');
  } catch (e) {
    return fail(e);
  }
}
