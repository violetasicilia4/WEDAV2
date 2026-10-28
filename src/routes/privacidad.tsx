import { createFileRoute, Link } from '@tanstack/react-router';
import { PUBLICATION_TERM } from '@/lib/weda/plans';
import { pageMeta } from '@/lib/site';

/* Política de privacidad — BORRADOR (2026-10-28). Antes del lanzamiento: completar los datos marcados como «a completar» y hacerla revisar
   por un abogado (Ley 25.326). Hasta entonces la página no se indexa. Checklist completo en docs/datos-personales.md. */
export const Route = createFileRoute('/privacidad')({
  head: () => {
    const { meta } = pageMeta({ title: 'Política de privacidad • Weda', description: 'Qué datos personales trata Weda, para qué y cómo ejercer tus derechos.', path: '/privacidad' });
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Privacy,
});

/** Dato pendiente de la empresa: se ve resaltado para que nadie lo publique sin completar. */
const Todo = ({ children }: { children: string }) => <mark className="legal-todo">[{children} — a completar]</mark>;

function Privacy() {
  return (
    <main className="legal-page" id="main">
      <p className="legal-brand"><Link to="/">Weda</Link></p>
      <h1>Política de privacidad</h1>
      <p className="legal-meta">Última actualización: <Todo>fecha de publicación</Todo></p>

      <h2>Quién es responsable de tus datos</h2>
      <p><Todo>Razón social</Todo>, CUIT <Todo>CUIT</Todo>, con domicilio en <Todo>domicilio legal</Todo> («Weda»), es responsable de las bases de datos descriptas acá. Contacto: <a href="mailto:hola@weda.app">hola@weda.app</a>.</p>

      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li><strong>Parejas que usan Weda:</strong> correo y clave de la cuenta, nombres, fecha y datos del casamiento, fotos, lista de regalos y datos de cobro que cargan (alias, banco). Para prestar el servicio: armar y publicar la página, la lista de regalos y la gestión de invitados.</li>
        <li><strong>Invitados que regalan:</strong> nombre, apellido, correo, mensaje, regalos elegidos, monto y comprobante de la transferencia. Para informar el regalo a la pareja, enviarte la constancia y, si falta, pedirte el comprobante. Los ve la pareja del casamiento. Weda no cobra ni mueve dinero: la transferencia va directo a la cuenta de los novios.</li>
        <li><strong>Invitados que confirman asistencia:</strong> nombre, apellido, correo, si asisten y el menú elegido. Para que la pareja organice el casamiento.</li>
        <li><strong>Novedades de Weda:</strong> solo si tildás la casilla «Quiero recibir novedades y promociones de Weda por correo», usamos tu correo para enviarte novedades y promociones de Weda. No es necesario para regalar ni para confirmar asistencia. Guardamos la fecha y el texto que aceptaste.</li>
      </ul>

      <h2>Con quién se comparten</h2>
      <p>Los datos de cada casamiento los ve la pareja que lo creó. Usamos proveedores para alojar el sitio y enviar correos (<Todo>proveedores de hosting y de correo</Todo>), que tratan los datos solo para prestarnos ese servicio. No vendemos tus datos.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>Los datos del casamiento, mientras la cuenta esté activa; la página publicada queda online {PUBLICATION_TERM}. Los datos de novedades, hasta que te des de baja (guardamos la baja como constancia). <Todo>plazo de conservación luego de cerrar la cuenta</Todo>.</p>

      <h2>Tus derechos</h2>
      <p>Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo a <a href="mailto:hola@weda.app">hola@weda.app</a>. Respondemos el acceso dentro de los 10 días corridos y la rectificación o supresión dentro de los 5 días hábiles, como indica la Ley 25.326. Para dejar de recibir novedades, usá el enlace «darte de baja» de cualquier correo.</p>
      <p>La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las denuncias y reclamos de quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>

      <h2>Seguridad</h2>
      <p>Las claves se guardan cifradas, los comprobantes son privados (solo los ve la pareja) y la comunicación con el sitio es cifrada (HTTPS).</p>

      <p className="legal-meta">Registro de la base: <Todo>número de inscripción en el Registro Nacional de Bases de Datos (AAIP)</Todo>.</p>
    </main>
  );
}
