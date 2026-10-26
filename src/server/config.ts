// Configuración del servidor, leída del entorno. Nada de esto llega al cliente (solo VITE_* se publica). Ver docs/backend-readiness.md.
import path from 'node:path';

const env = (k: string): string | undefined => {
  const v = process.env[k];
  return v && v.trim() !== '' ? v.trim() : undefined;
};

export type ServerConfig = {
  /** Archivo SQLite. «:memory:» sirve para pruebas. */
  dbPath: string;
  /** Carpeta de archivos privados (comprobantes). Nunca se sirve como estática. */
  dataDir: string;
  /** Cookies con atributo Secure (obligatorio en producción con HTTPS). */
  cookieSecure: boolean;
  /** Si es true, publicar exige una orden de compra en estado «paid». Mientras no haya proveedor de pagos queda en false (decisión comercial pendiente). */
  requirePaidOrder: boolean;
  /** Orígenes extra aceptados para escrituras (además del propio host). */
  allowedOrigins: string[];
};

export function loadConfig(): ServerConfig {
  const dataDir = path.resolve(env('WEDA_DATA_DIR') ?? '.data');
  return {
    dbPath: env('WEDA_DB_PATH') ?? path.join(dataDir, 'weda.db'),
    dataDir,
    cookieSecure: env('WEDA_COOKIE_SECURE') ? env('WEDA_COOKIE_SECURE') === 'true' : process.env['NODE_ENV'] === 'production',
    requirePaidOrder: env('WEDA_REQUIRE_PAID_ORDER') === 'true',
    allowedOrigins: (env('WEDA_ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  };
}
