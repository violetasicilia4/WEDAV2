// API HTTP de Weda (JSON). Se monta en src/server.ts para toda ruta /api/*. Las rutas son finas: parsean, autentican y delegan en Service.
// Seguridad: cookie de sesión httpOnly + SameSite=Lax, escrituras solo con Content-Type JSON/binario y Origin propio, errores sin detalles internos.
import type { ServerConfig } from './config';
import { openDb } from './db';
import { ApiError } from './errors';
import { RateLimiter } from './security';
import { MAX_RECEIPT_BYTES, Service, type Session } from './service';
import { readMedia } from './media';

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
/** Eventos del embudo: límite propio, así la analítica nunca agota el de las confirmaciones y los regalos. */
const eventLimiter = new RateLimiter(120, 10 * 60_000);
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

/** Abre la base al primer uso. Si no se puede (hosting sin disco persistente o sin `node:sqlite`), la API responde 503 y el resto del sitio sigue andando. */
function openService(cfg: ServerConfig): Service {
  try { return getService(cfg); }
  catch (e) { console.error('No se pudo abrir la base de datos:', e); throw new ApiError(503, 'backend_unavailable'); }
}
const a0 = (parts: string[]) => parts[0];

/** Devuelve null si la ruta no es de la API (para que siga el resto del servidor). */
export async function handleApi(req: Request, cfg: ServerConfig, injected?: Service): Promise<Response | null> {
  const url = new URL(req.url);
  // Solo las rutas /api/ tocan la base: el resto del sitio (landing, demo, panel sin cuenta) no depende de ella.
  if (!url.pathname.startsWith('/api/')) return null;
  const parts = url.pathname.slice(5).split('/').filter(Boolean);
  const method = req.method.toUpperCase();
  try {
    if (method !== 'GET' && method !== 'HEAD' && !originOk(req, cfg)) throw new ApiError(403, 'bad_origin');
    if (a0(parts) === 'health') return json(200, { ok: true });
    // Fotos guardadas (media.ts). Públicas: las usan las invitaciones publicadas. El nombre es el hash del contenido: no cambia nunca.
    if (a0(parts) === 'media' && parts[1] && method === 'GET') {
      const m = readMedia(cfg.dataDir, parts[1]);
      if (!m) throw new ApiError(404, 'not_found');
      return new Response(new Uint8Array(m.bytes), { status: 200, headers: { 'content-type': m.mime, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
    }
    // Baja de novedades desde el enlace del correo (sin sesión). Responde una página simple, no JSON.
    if (a0(parts) === 'unsubscribe' && method === 'GET') {
      const ok = (injected ?? openService(cfg)).unsubscribe(url.searchParams.get('t') ?? '');
      const msg = ok ? 'Listo: no vas a recibir más novedades de Weda.' : 'Este enlace no es válido. Escribinos a hola@weda.app y te damos de baja.';
      return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Novedades de Weda</title></head><body style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#3b3c3a;background:#f5f5f3"><main style="max-width:480px;margin:15vh auto;padding:28px;background:#fff;border-radius:16px"><h1 style="font-size:22px;margin:0 0 12px">Novedades de Weda</h1><p style="font-size:16px;line-height:1.5;margin:0">${msg}</p></main></body></html>`, { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
    }
    const svc = injected ?? openService(cfg);
    const session = (): Session => svc.requireSession(svc.sessionFromToken(cookieOf(req, COOKIE)));
    const [a, b, c, d] = parts;


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
      if (b === 'forgot' && method === 'POST') {
        const body = await readJson(req);
        return json(200, await svc.requestPasswordReset(body['email'], clientIp(req)));
      }
      if (b === 'reset' && method === 'POST') {
        const body = await readJson(req);
        return json(200, await svc.resetPassword(body['token'], body['password']));
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
      if (b === 'payout' && !c && method === 'POST') { const body = await readJson(req); return json(200, await svc.changePayout(session(), body)); }
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
      if (b && c === 'remind' && method === 'POST') return json(200, await svc.remindReceipt(session().userId, b));
      if (b && c === 'receipt' && method === 'GET') {
        const r = svc.readReceipt(session().userId, b);
        return new Response(new Uint8Array(r.bytes), { status: 200, headers: { 'content-type': r.mime, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "sandbox; default-src 'none'", 'content-disposition': 'inline' } });
      }
    }

    /* ---- órdenes de plan (dueño). No hay ruta para marcar «paid»: solo el proveedor, por webhook (pendiente). */
    if (a === 'orders') {
      if (!b && method === 'GET') return json(200, { orders: svc.listOrders(session().userId) });
      if (!b && method === 'POST') { const body = await readJson(req); return json(201, svc.createOrder(session().userId, body['planId'])); }
      if (b && !c && method === 'GET') return json(200, svc.orderStatus(session().userId, b));
    }
    if (a === 'payments' && !b && method === 'GET') return json(200, svc.paymentInfo(session().userId));
    // Eventos del embudo que manda el navegador (solo los de CLIENT_EVENTS; límite por IP).
    if (a === 'events' && method === 'POST') {
      if (!eventLimiter.take(clientIp(req))) throw new ApiError(429, 'too_many_requests');
      const body = await readJson(req);
      return json(200, svc.recordClientEvent(body['name'], body['props']));
    }
    if (a === 'checkout' && method === 'POST') { const body = await readJson(req); return json(201, svc.startCheckout(session().userId, body['planId'])); }
    // Solo con WEDA_PAYMENTS_PROVIDER=test (si no, 404): lo que hace el «proveedor» de prueba al aprobar, rechazar o cancelar.
    if (a === 'test-payments' && b && method === 'POST') { const body = await readJson(req); return json(200, svc.completeTestPayment(session().userId, b, body['outcome'])); }
    if (a === 'webhooks' && b === 'payments') {
      if (!c) return json(501, { error: 'payments_not_configured' });
      if (method !== 'POST') throw new ApiError(405, 'method_not_allowed');
      const raw = await req.text();
      if (raw.length > 100_000) throw new ApiError(413, 'payload_too_large');
      return json(200, svc.handlePaymentNotification(c, raw, req.headers));
    }

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
        return json(200, svc.submitRsvp(b, body['people'], body['contact']));
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
