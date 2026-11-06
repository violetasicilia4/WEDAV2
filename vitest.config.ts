import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Las pruebas de servidor corren contra el proyecto de DESARROLLO de Supabase (SUPABASE_SECRET_KEY y SUPABASE_DB_URL en .env.local o en el
// entorno; ver src/test/server/helpers.ts). Sin esa configuración se saltean y se avisa: las de interfaz corren igual.
for (const [k, v] of Object.entries(loadEnv("test", process.cwd(), "SUPABASE_"))) process.env[k] ??= v;
const remote = !!process.env["SUPABASE_DB_URL"] && !!process.env["SUPABASE_SECRET_KEY"];
if (!remote) console.warn("\n⚠ Sin Supabase configurado: se saltean las pruebas de servidor (src/test/server y la integración del formulario de clave).\n");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", ...(remote ? [] : ["src/test/server/**"])],
    // Contra Supabase cada prueba va por red (São Paulo): más tiempo de espera, y de a un archivo por vez (el plan free tiene pocas conexiones).
    // Las de interfaz montan páginas enteras: 15 s de margen para que no fallen solo porque la compu está ocupada.
    ...(remote ? { testTimeout: 60_000, hookTimeout: 120_000, fileParallelism: false } : { testTimeout: 15_000 }),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
