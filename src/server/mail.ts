// Correo saliente (Resend, por HTTP, sin dependencias). Sin clave configurada no se envía nada: el intento queda registrado en `mail_log`
// como «skipped», así el resto del flujo funciona igual en desarrollo y en pruebas. Nunca se registra el contenido, solo el tipo y el destinatario.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ServerConfig } from './config';
import { tx, type Db } from './db';
import { newId } from './security';

export type MailKind = 'gift_receipt' | 'receipt_reminder' | 'password_reset' | 'marketing' | 'payout_changed';
export type Mail = { to: string; subject: string; text: string; html: string };

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Arma un correo simple: párrafos y, si hay, un botón y un pie (por ejemplo, el enlace de baja). */
export function layout(o: { title: string; paragraphs: string[]; button?: { label: string; url: string }; footer?: string[] }): Pick<Mail, 'text' | 'html'> {
  const text = [o.title, '', ...o.paragraphs, ...(o.button ? ['', `${o.button.label}: ${o.button.url}`] : []), ...(o.footer?.length ? ['', '—', ...o.footer] : [])].join('\n');
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f3;font-family:Arial,Helvetica,sans-serif;color:#3b3c3a">
<div style="max-width:520px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border-radius:16px;padding:28px">
<p style="margin:0 0 18px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6b6b">Weda</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${esc(o.title)}</h1>
${o.paragraphs.map(p => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${esc(p)}</p>`).join('')}
${o.button ? `<p style="margin:20px 0 4px"><a href="${esc(o.button.url)}" style="display:inline-block;background:#3b3c3a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:15px">${esc(o.button.label)}</a></p>` : ''}
</div>${o.footer?.length ? `<p style="margin:16px 4px 0;font-size:12px;line-height:1.5;color:#6b6b6b">${o.footer.map(esc).join('<br>')}</p>` : ''}</div></body></html>`;
  return { text, html };
}

/** Envía (o registra como «skipped» si no hay proveedor). No lanza: un correo que falla nunca rompe el regalo ni la confirmación. */
export async function sendMail(db: Db, cfg: ServerConfig, kind: MailKind, mail: Mail, ref = ''): Promise<'sent' | 'skipped' | 'failed'> {
  let status: 'sent' | 'skipped' | 'failed' = 'skipped';
  let error = '';
  if (cfg.mail.testOutbox) {
    // Adaptador de prueba (solo lo configuran las pruebas automáticas): guarda el correo en memoria. Nunca sale nada.
    cfg.mail.testOutbox.push({ kind, to: mail.to, subject: mail.subject, text: mail.text });
  } else if (cfg.mail.resendApiKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${cfg.mail.resendApiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: cfg.mail.from, to: [mail.to], reply_to: cfg.mail.replyTo, subject: mail.subject, text: mail.text, html: mail.html }),
      });
      status = r.ok ? 'sent' : 'failed';
      if (!r.ok) error = `http_${r.status}`;
    } catch { status = 'failed'; error = 'network'; }
  }
  try {
    tx(db, () => db.prepare('INSERT INTO mail_log (id,kind,to_email,ref,status,error,created_at) VALUES (?,?,?,?,?,?,?)').run(newId('mail'), kind, mail.to, ref, status, error, new Date().toISOString()));
  } catch (e) { console.error('No se pudo registrar el correo:', e); }
  if (status === 'failed') console.error(`Correo «${kind}» no enviado (${error}).`);
  return status;
}

/* Baja de novedades sin cuenta: el enlace lleva el correo firmado con el secreto del servidor (no se puede fabricar para otro correo). */
const sign = (secret: string, email: string) => createHmac('sha256', secret).update(`baja|${email.toLowerCase()}`).digest('base64url');
export const unsubscribeToken = (secret: string, email: string) => `${Buffer.from(email.toLowerCase()).toString('base64url')}.${sign(secret, email)}`;
export const unsubscribeUrl = (cfg: ServerConfig, email: string) => `${cfg.publicUrl}/api/unsubscribe?t=${unsubscribeToken(cfg.secret, email)}`;
/** Devuelve el correo si la firma es válida; si no, null. */
export function verifyUnsubscribe(secret: string, token: string): string | null {
  const [a, b] = token.split('.');
  if (!a || !b) return null;
  let email = '';
  try { email = Buffer.from(a, 'base64url').toString('utf8'); } catch { return null; }
  const want = Buffer.from(sign(secret, email)), got = Buffer.from(b);
  return want.length === got.length && timingSafeEqual(want, got) ? email : null;
}
