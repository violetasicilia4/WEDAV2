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
    ...(command === "build" ? [nitro()] : []),
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
