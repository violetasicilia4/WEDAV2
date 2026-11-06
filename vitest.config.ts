import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Las pruebas de servidor corren contra el proyecto de DESARROLLO de Supabase si .env.local (o el entorno) tiene SUPABASE_URL,
// SUPABASE_SECRET_KEY y SUPABASE_DB_URL; si no, contra SQLite local (src/test/server/helpers.ts). WEDA_TEST_DB=sqlite fuerza lo local.
for (const [k, v] of Object.entries(loadEnv("test", process.cwd(), "SUPABASE_"))) process.env[k] ??= v;
const remote = !!process.env["SUPABASE_DB_URL"] && process.env["WEDA_TEST_DB"] !== "sqlite";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Contra Supabase cada prueba va por red (São Paulo): más tiempo de espera.
    // y de a un archivo por vez: el plan free de Supabase tiene pocas conexiones.
    ...(remote ? { testTimeout: 60_000, hookTimeout: 120_000, fileParallelism: false } : {}),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
