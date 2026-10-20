import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
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
            "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
            // Fuentes y fotos de parejas no cambian de nombre al cambiar de contenido: caché larga pero revalidable.
            "/fonts/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
            "/parejas/**": { headers: { "cache-control": "public, max-age=604800, stale-while-revalidate=86400" } },
          },
        })]
      : []),
  ],
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  server: {
    host: "::",
    port: 8080,
  },
}));
