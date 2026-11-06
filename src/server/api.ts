// API HTTP de Weda (JSON). Se monta en src/server.ts para toda ruta /api/*. Las rutas son finas: parsean, autentican y delegan en Service.
// Seguridad: cookie de sesión httpOnly + SameSite=Lax, escrituras solo con Content-Type JSON/binario y Origin propio, errores sin detalles internos.
import type { ServerConfig } from './config';
import { ApiError } from './errors';
import { RateLimiter } from './security';
import { MAX_RECEIPT_BYTES, Service, type Session } from './service';
import type { Authenticated } from './accounts';

const COOKIE = 'weda_session';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

let shared: Promise<Service> | undefined;
/** Servicio único del proceso (la base se abre al primer uso). Si falla, el próximo pedido lo vuelve a intentar. */
export function getService(cfg: ServerConfig): Promise<Service> {
  return (shared ??= openStore(cfg).catch((e: unknown) => { shared = undefined; throw e; }));
}

/** Supabase (OPS-08): PostgreSQL (con sus migraciones), Supabase Auth y Supabase Storage. Sin configuración, la API responde 503. */
async function openStore(cfg: ServerConfig): Promise<Service> {
  if (!cfg.supabase) throw new Error('Supabase no está configurado: faltan SUPABASE_SECRET_KEY y SUPABASE_DB_URL (ver .env.example).');
  const { url, secretKey, dbUrl } = cfg.supabase;
  const [{ connectPg, migratePg, PgDb }, { createClient }, { SupabaseFiles }, { SupabaseAccounts }] = await Promise.all([import('./pg'), import('@supabase/supabase-js'), import('./storage'), import('./accounts')]);
  const sql = connectPg(dbUrl);
  await migratePg(sql);
  const db = new PgDb(sql);
  const storage = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return new Service(db, cfg, new SupabaseFiles(storage), new SupabaseAccounts(url, secretKey, db));
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

/** Abre la base al primer uso. Si no se puede (sin Supabase configurado o sin conexión), la API responde 503 y el resto del sitio sigue andando. */
async function openService(cfg: ServerConfig): Promise<Service> {
  try { return await getService(cfg); }
  catch (e) { console.error('No se pudo abrir la base de datos:', e); throw new ApiError(503, 'backend_unavailable'); }
}
const a0 = (parts: string[]) => parts[0];

/** Devuelve null si la ruta no es de la API (para que siga el resto del servidor). */
export async function handleApi(req: Request, cfg: ServerConfig, injected?: Service): Promise<Response | null> {
  // Si durante el pedido se renovó la sesión (Supabase Auth: venció el token de acceso), la respuesta reescribe la cookie con el token nuevo.
  const auth: AuthState = { renewed: null };
  const res = await route(req, cfg, injected, auth);
  if (res && auth.renewed) res.headers.append('set-cookie', setCookie(cfg, auth.renewed));
  return res;
}

type AuthState = { renewed: string | null };

async function route(req: Request, cfg: ServerConfig, injected: Service | undefined, auth: AuthState): Promise<Response | null> {
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
      const m = await (injected ?? (await openService(cfg))).files.media(parts[1]);
      if (!m) throw new ApiError(404, 'not_found');
      // La foto tiene su propia dirección pública en Supabase Storage: se redirige ahí (la dirección /api/media/… de los borradores no cambia).
      return new Response(null, { status: 302, headers: { location: m.redirect, 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    // Baja de novedades desde el enlace del correo (sin sesión). Responde una página simple, no JSON.
    if (a0(parts) === 'unsubscribe' && method === 'GET') {
      const ok = await (injected ?? (await openService(cfg))).unsubscribe(url.searchParams.get('t') ?? '');
      const msg = ok ? 'Listo: no vas a recibir más novedades de Weda.' : 'Este enlace no es válido. Escribinos a hola@weda.app y te damos de baja.';
      return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Novedades de Weda</title></head><body style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#3b3c3a;background:#f5f5f3"><main style="max-width:480px;margin:15vh auto;padding:28px;background:#fff;border-radius:16px"><h1 style="font-size:22px;margin:0 0 12px">Novedades de Weda</h1><p style="font-size:16px;line-height:1.5;margin:0">${msg}</p></main></body></html>`, { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
    }
    const svc = injected ?? (await openService(cfg));
    // Se autentica una sola vez por pedido: el token de renovación de Supabase sirve una sola vez, así que nunca se renueva dos veces.
    let authenticated: Promise<Authenticated | null> | null = null;
    const authenticate = () => (authenticated ??= svc.authenticate(cookieOf(req, COOKIE)).then(a => { if (a?.renewed) auth.renewed = a.token; return a; }));
    const session = async (): Promise<Session> => { const x = await authenticate(); return svc.requireSession(x && { userId: x.userId, email: x.email }); };
    /** El token vigente de la cookie (el renovado, si cambió en este pedido). */
    const currentToken = async () => (await authenticate())?.token ?? cookieOf(req, COOKIE);
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
      if (b === 'password' && method === 'POST') {
        const body = await readJson(req);
        const r = await svc.changePassword(await currentToken(), body['currentPassword'], body['newPassword']);
        // Si la sesión siguió con un token nuevo (Supabase), la cookie se reescribe; la respuesta no lo expone.
        if (r.token && r.token !== cookieOf(req, COOKIE)) auth.renewed = r.token;
        return json(200, { ok: true });
      }
      if (b === 'sessions' && !c && method === 'GET') return json(200, (await svc.otherSessions(await currentToken())));
      if (b === 'sessions' && c === 'close-others' && method === 'POST') return json(200, (await svc.closeOtherSessions(await currentToken())));
      if (b === 'logout' && method === 'POST') {
        (await svc.logout(await currentToken()));
        auth.renewed = null; // al salir la cookie se borra, aunque la sesión se haya renovado en este mismo pedido
        return json(200, { ok: true }, { 'set-cookie': setCookie(cfg, null) });
      }
    }
    if (a === 'me' && method === 'GET') {
      const s = await authenticate();
      return json(200, { user: s ? { email: s.email } : null });
    }

    /* ---- casamiento y publicación (dueño) */
    if (a === 'wedding') {
      if (!b && method === 'GET') return json(200, (await svc.getWedding((await session()).userId)));
      if (!b && method === 'PUT') {
        const body = await readJson(req);
        const g = (body['guests'] ?? undefined) as { upsert?: unknown; remove?: unknown } | undefined;
        return json(200, (await svc.saveWedding((await session()).userId, { baseRevision: body['baseRevision'], draft: body['draft'], ...(g ? { guests: g } : {}) })));
      }
      if (b === 'payout' && !c && method === 'POST') { const body = await readJson(req); return json(200, await svc.changePayout(await session(), body)); }
      if (b === 'publish' && method === 'POST') return json(200, (await svc.publish((await session()).userId)));
      if (b === 'unpublish' && method === 'POST') { (await svc.unpublish((await session()).userId)); return json(200, { ok: true }); }
    }

    /* ---- aportes (dueño) */
    if (a === 'contributions') {
      if (!b && method === 'GET') return json(200, { contributions: (await svc.listContributions((await session()).userId)) });
      if (b && !c && method === 'PATCH') {
        const body = await readJson(req);
        return json(200, (await svc.setContributionStatus((await session()).userId, b, body['status'], body['note'])));
      }
      if (b && c === 'remind' && method === 'POST') return json(200, await svc.remindReceipt((await session()).userId, b));
      if (b && c === 'receipt' && method === 'GET') {
        const r = (await svc.readReceipt((await session()).userId, b));
        return new Response(new Uint8Array(r.bytes), { status: 200, headers: { 'content-type': r.mime, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "sandbox; default-src 'none'", 'content-disposition': 'inline' } });
      }
    }

    /* ---- órdenes de plan (dueño). No hay ruta para marcar «paid»: solo el proveedor, por webhook (pendiente). */
    if (a === 'orders') {
      if (!b && method === 'GET') return json(200, { orders: (await svc.listOrders((await session()).userId)) });
      if (!b && method === 'POST') { const body = await readJson(req); return json(201, (await svc.createOrder((await session()).userId, body['planId']))); }
      if (b && !c && method === 'GET') return json(200, (await svc.orderStatus((await session()).userId, b)));
    }
    if (a === 'payments' && !b && method === 'GET') return json(200, (await svc.paymentInfo((await session()).userId)));
    // Eventos del embudo que manda el navegador (solo los de CLIENT_EVENTS; límite por IP).
    if (a === 'events' && method === 'POST') {
      if (!eventLimiter.take(clientIp(req))) throw new ApiError(429, 'too_many_requests');
      const body = await readJson(req);
      return json(200, (await svc.recordClientEvent(body['name'], body['props'])));
    }
    if (a === 'checkout' && method === 'POST') { const body = await readJson(req); return json(201, (await svc.startCheckout((await session()).userId, body['planId']))); }
    // Solo con WEDA_PAYMENTS_PROVIDER=test (si no, 404): lo que hace el «proveedor» de prueba al aprobar, rechazar o cancelar.
    if (a === 'test-payments' && b && method === 'POST') { const body = await readJson(req); return json(200, (await svc.completeTestPayment((await session()).userId, b, body['outcome']))); }
    if (a === 'webhooks' && b === 'payments') {
      if (!c) return json(501, { error: 'payments_not_configured' });
      if (method !== 'POST') throw new ApiError(405, 'method_not_allowed');
      const raw = await req.text();
      if (raw.length > 100_000) throw new ApiError(413, 'payload_too_large');
      return json(200, (await svc.handlePaymentNotification(c, raw, req.headers)));
    }

    /* ---- público (sin sesión) */
    if (a === 'public') {
      if (b === 'contributions' && c) {
        const token = req.headers.get('x-manage-token') ?? undefined;
        if (!d && method === 'GET') return json(200, (await svc.guestContributionStatus(c, token)));
        if (d === 'receipt' && method === 'PUT') {
          if (!publicWriteLimiter.take(`rcp|${clientIp(req)}`)) throw new ApiError(429, 'too_many_requests');
          const declared = Number(req.headers.get('content-length') ?? '0');
          if (declared > MAX_RECEIPT_BYTES) throw new ApiError(413, 'file_too_large');
          const buf = Buffer.from(await req.arrayBuffer());
          return json(200, (await svc.attachReceipt(c, token, buf)));
        }
      }
      if (b && !c && method === 'GET') return json(200, (await svc.getPublicSite(b)), { 'cache-control': 'no-store' });
      if (b && c === 'rsvp' && method === 'POST') {
        if (!publicWriteLimiter.take(`rsvp|${clientIp(req)}|${b}`)) throw new ApiError(429, 'too_many_requests');
        const body = await readJson(req);
        return json(200, (await svc.submitRsvp(b, body['people'], body['contact'])));
      }
      if (b && c === 'contributions' && method === 'POST') {
        if (!publicWriteLimiter.take(`apo|${clientIp(req)}|${b}`)) throw new ApiError(429, 'too_many_requests');
        const r = (await svc.submitContribution(b, await readJson(req)));
        return json(r.replay ? 200 : 201, r);
      }
    }
    throw new ApiError(404, 'not_found');
  } catch (e) {
    return fail(e);
  }
}
