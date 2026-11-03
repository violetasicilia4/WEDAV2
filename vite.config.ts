import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    // Solo en desarrollo: otros proyectos usaron el puerto 8080 y el navegador puede mostrar una copia guardada de ellos (también del HTML) en vez de Weda.
    {
      name: "weda-dev-no-store",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
      },
    },
    tsConfigPaths(),
    tanstackStart({
      // Entrada de servidor propia (src/server.ts): envuelve los errores de SSR.
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    // Nitro solo hace falta al compilar para producción.
    ...(command === "build"
      ? [nitro({
          // Los JS/CSS ya vienen con hash; se sirven comprimidos (gzip y brotli) y con caché larga.
          compressPublicAssets: { gzip: true, brotli: true },
          routeRules: {
            // Cabeceras de seguridad para todo el sitio (auditoría F-09). La CSP permite solo lo que el sitio usa de afuera: Google Maps/Places
            // (búsqueda de lugares en el panel) y los reproductores de Spotify (playlist del sitio). 'unsafe-inline' en scripts hace falta por los
            // scripts de hidratación que TanStack Start escribe en el HTML. `frame-ancestors 'self'` impide que otro sitio enmarque Weda
            // (el registro usa un iframe propio de «/»).
            "/**": {
              headers: {
                "x-content-type-options": "nosniff",
                "referrer-policy": "strict-origin-when-cross-origin",
                "x-frame-options": "SAMEORIGIN",
                "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
                "content-security-policy": [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com",
                  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                  "font-src 'self' https://fonts.gstatic.com",
                  "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com https://*.googleusercontent.com https://*.ggpht.com",
                  "media-src 'self' blob:",
                  "connect-src 'self' https://maps.googleapis.com https://places.googleapis.com",
                  "frame-src 'self' https://open.spotify.com",
                  "frame-ancestors 'self'",
                  "base-uri 'self'",
                  "form-action 'self'",
                  "object-src 'none'",
                ].join("; "),
              },
            },
            "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
            // Fuentes y fotos de parejas no cambian de nombre al cambiar de contenido: caché larga pero revalidable.
            "/fonts/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
            "/parejas/**": { headers: { "cache-control": "public, max-age=604800, stale-while-revalidate=86400" } },
          },
        })]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        // Los íconos y `cn` en un solo archivo: si cada ícono va en su propio archivo, los que importa un componente (menú, «X»…) no se
        // precargan con la página y se descubren tarde, demorando la hidratación en celulares lentos (auditoría F-04).
        manualChunks(id: string) {
          if (id.includes("/node_modules/lucide-react/") || id.endsWith("/src/lib/utils.ts")) return "ui-core";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  server: {
    host: "::",
    port: 8080,
    // Otros proyectos usaron este puerto: sin esto el navegador puede mostrar una copia guardada de ellos en vez de Weda.
    headers: { "Cache-Control": "no-store" },
  },
}));
