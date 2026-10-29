import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { buildRobots, buildSitemap } from "./lib/site";
import { handleApi } from "./server/api";
import { loadConfig } from "./server/config";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// robots.txt y sitemap.xml se generan acá para poder incluir la URL absoluta del sitio (VITE_SITE_URL) cuando exista.
// Sin dominio configurado no hay sitemap (un sitemap exige URLs absolutas y no se inventa un dominio): responde 404.
function staticSeoResponse(pathname: string): Response | null {
  if (pathname === "/robots.txt") {
    return new Response(buildRobots(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  if (pathname === "/sitemap.xml") {
    const xml = buildSitemap();
    if (xml) return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  return null;
}

// La demo (/ejemplo, /crear, /panel y /sitio) no debe aparecer en buscadores. Además de <meta name="robots">, se envía la
// directiva por cabecera HTTP. robots.txt NO bloquea estas rutas: si las bloqueara, los buscadores no verían el noindex.
function withRobotsHeader(request: Request, response: Response): Response {
  const { pathname } = new URL(request.url);
  const isPrivateDemo = ["/ejemplo", "/crear", "/panel", "/sitio"].some(p => pathname === p || pathname.startsWith(`${p}/`));
  // Una ruta inexistente (404) tampoco se indexa.
  if (!isPrivateDemo && response.status !== 404) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

let config: ReturnType<typeof loadConfig> | undefined;
let configFailed = false;
// Si falta una variable obligatoria (por ejemplo WEDA_SECRET en producción), solo la API deja de andar: las páginas siguen sirviéndose.
const apiConfig = () => {
  if (configFailed) return null;
  try { return (config ??= loadConfig()); } catch (error) { configFailed = true; console.error(error); return null; }
};

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // API propia (cuentas, casamiento, publicación, RSVP, aportes): src/server/api.ts. Las respuestas nunca se indexan.
      const cfg = apiConfig();
      if (cfg) {
        const api = await handleApi(request, cfg);
        if (api) return api;
      } else if (new URL(request.url).pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "backend_unavailable" }), { status: 503, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
      }
      const seo = staticSeoResponse(new URL(request.url).pathname);
      if (seo) return seo;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withRobotsHeader(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
