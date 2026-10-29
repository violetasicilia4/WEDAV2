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
  /** Correo saliente. Sin `resendApiKey` no se envía nada: cada intento queda en `mail_log` como «skipped» (ver docs/datos-personales.md). */
  mail: { resendApiKey?: string | undefined; from: string; replyTo: string; /** SOLO PRUEBAS: si existe, los correos se guardan acá completos en vez de enviarse (adaptador de prueba). */ testOutbox?: { kind: string; to: string; subject: string; text: string }[] | undefined };
  /** Dirección pública del sitio, para armar los enlaces de los correos (comprobante, baja). */
  publicUrl: string;
  /** Secreto del servidor para firmar los enlaces de baja de novedades. En producción es obligatorio y largo. */
  secret: string;
  /** Proveedor de pagos. 'none': no se cobra (publicar no exige pago salvo `requirePaidOrder`). 'test': adaptador de PRUEBA, nunca cobra
   *  (página /pago-de-prueba); jamás en producción real. Un proveedor real (por ejemplo Mercado Pago) todavía no está integrado: ver
   *  docs/auditoria-ux-conversion/payment-integration.md. */
  payments: { provider: 'none' | 'test'; webhookSecret: string };
};

const fail = (k: string): never => { throw new Error(`Falta la variable de entorno ${k} (obligatoria en producción).`); };

export function loadConfig(): ServerConfig {
  const dataDir = path.resolve(env('WEDA_DATA_DIR') ?? '.data');
  return {
    dbPath: env('WEDA_DB_PATH') ?? path.join(dataDir, 'weda.db'),
    dataDir,
    cookieSecure: env('WEDA_COOKIE_SECURE') ? env('WEDA_COOKIE_SECURE') === 'true' : process.env['NODE_ENV'] === 'production',
    // Con un proveedor de pagos configurado, publicar SIEMPRE exige un pago confirmado por el servidor.
    requirePaidOrder: env('WEDA_REQUIRE_PAID_ORDER') === 'true' || env('WEDA_PAYMENTS_PROVIDER') === 'test',
    allowedOrigins: (env('WEDA_ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean),
    mail: { resendApiKey: env('RESEND_API_KEY'), from: env('WEDA_MAIL_FROM') ?? 'Weda <hola@weda.app>', replyTo: env('WEDA_MAIL_REPLY_TO') ?? 'hola@weda.app' },
    publicUrl: (env('WEDA_PUBLIC_URL') ?? env('VITE_SITE_URL') ?? 'http://localhost:8090').replace(/\/+$/, ''),
    secret: env('WEDA_SECRET') ?? (process.env['NODE_ENV'] === 'production' ? fail('WEDA_SECRET') : 'secreto-solo-para-desarrollo'),
    payments: {
      provider: env('WEDA_PAYMENTS_PROVIDER') === 'test' ? 'test' : 'none',
      webhookSecret: env('WEDA_PAYMENTS_WEBHOOK_SECRET') ?? env('WEDA_SECRET') ?? 'secreto-solo-para-desarrollo',
    },
  };
}
