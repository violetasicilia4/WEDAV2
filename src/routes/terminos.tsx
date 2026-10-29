import { createFileRoute, Link } from '@tanstack/react-router';
import { formatPrice, PLANS, PUBLICATION_TERM } from '@/lib/weda/plans';
import { pageMeta } from '@/lib/site';

/* Términos de uso — BORRADOR (2026-10-29). No fue revisado por un abogado. Antes del lanzamiento: completar lo marcado «a completar», cerrar las
   decisiones comerciales marcadas «decisión pendiente» y hacerlo revisar. Hasta entonces la página no se indexa. Ver docs/auditoria-ux-conversion/production-readiness.md. */
export const Route = createFileRoute('/terminos')({
  head: () => {
    const { meta } = pageMeta({ title: 'Términos de uso • Weda', description: 'Las condiciones para usar Weda.', path: '/terminos' });
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Terms,
});

const Todo = ({ children }: { children: string }) => <mark className="legal-todo">[{children} — a completar]</mark>;
const Decide = ({ children }: { children: string }) => <mark className="legal-todo">[decisión pendiente: {children}]</mark>;

function Terms() {
  return (
    <main className="legal-page" id="main">
      <p className="legal-brand"><Link to="/">Weda</Link></p>
      <h1>Términos de uso</h1>
      <p className="legal-meta">Última actualización: <Todo>fecha de publicación</Todo></p>

      <h2>1. Qué es Weda</h2>
      <p>Weda, de <Todo>razón social</Todo> (CUIT <Todo>CUIT</Todo>), es una herramienta para que una pareja arme la página de su casamiento, su lista de regalos y la confirmación de asistencia de sus invitados, y la comparta con un link. Weda no organiza el casamiento ni participa de los pagos entre invitados y la pareja.</p>

      <h2>2. Cuenta</h2>
      <p>Para guardar y publicar tu casamiento necesitás una cuenta con correo y clave. Sos responsable de los datos que cargás y de mantener tu clave en reserva. Si la olvidás, podés <Link to="/clave">pedir un enlace para cambiarla</Link>.</p>

      <h2>3. Planes, precio y pago</h2>
      <p>Armar tu casamiento en Weda es gratis. Pagás una sola vez, al publicar, según el plan que elijas: {PLANS.map(p => `${p.name} ${formatPrice(p.price)}`).join(', ')}. Los precios incluyen <Decide>impuestos incluidos o no</Decide>. Podés pasar a un plan más completo pagando la diferencia; no se puede pasar a uno más económico.</p>
      <p>Cancelaciones y reembolsos: <Decide>si se puede pedir la devolución, en qué plazo y en qué casos</Decide>. Bajar la página no genera devolución.</p>

      <h2>4. Publicación y duración</h2>
      <p>La página queda publicada {PUBLICATION_TERM} desde que la publicás. Después deja de estar disponible para tus invitados. Podés bajarla antes cuando quieras. Lo que cambies en el panel se ve en tu página cuando tocás «Publicar los cambios». Qué pasa con tus datos al vencer: <Decide>plazo de conservación y si se puede extender la publicación</Decide>.</p>

      <h2>5. Tus fotos y textos</h2>
      <p>Lo que subís (fotos, nombres, textos) sigue siendo tuyo. Nos das permiso para guardarlo y mostrarlo en tu página, solo para prestarte el servicio. Tenés que tener derecho a usar las fotos que subís (por ejemplo, el permiso de quien aparece o del fotógrafo). Podemos quitar contenido ilegal o que afecte derechos de terceros.</p>

      <h2>6. Regalos</h2>
      <p>Los invitados transfieren directo a la cuenta que cargó la pareja y adjuntan el comprobante. Weda no recibe, retiene ni mueve ese dinero y no cobra comisión. Weda no verifica que la transferencia se haya hecho: la pareja la confirma con su banco y el comprobante.</p>

      <h2>7. Invitados y sus datos</h2>
      <p>La pareja decide a quién comparte el link. Los datos que dejan los invitados al confirmar o regalar los ve la pareja de ese casamiento. Cómo los tratamos está en la <Link to="/privacidad">política de privacidad</Link>.</p>

      <h2>8. Uso aceptable</h2>
      <p>No se puede usar Weda para engañar a terceros, pedir dinero con fines distintos a un casamiento, publicar contenido ilegal ni intentar acceder a cuentas ajenas.</p>

      <h2>9. Responsabilidad</h2>
      <p><Todo>alcance y límites de responsabilidad (revisión legal)</Todo>. Hacemos lo posible para que el servicio funcione siempre, pero puede haber interrupciones.</p>

      <h2>10. Cambios y contacto</h2>
      <p>Si cambiamos estos términos, avisamos por correo a las cuentas activas. Consultas: <a href="mailto:hola@weda.app">hola@weda.app</a>. Ley aplicable y jurisdicción: <Todo>ley y tribunales</Todo>.</p>
    </main>
  );
}
