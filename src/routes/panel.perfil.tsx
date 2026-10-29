import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { CoupleForm } from '@/components/panel/couple-form';
import { logout, useRemote } from '@/lib/weda/remote';
import { useAppSelector } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/perfil')({ component: Profile });

/* Perfil: (1) los datos del casamiento (nombres, fecha, lugar y foto), que se guardan de verdad en este navegador y se ven en la página,
   la lista de regalos y la vista previa; (2) la cuenta: correo, clave y cerrar sesión. Todavía no hay cuentas reales: el correo se recuerda
   solo en este navegador, la clave NO se guarda (el cambio pide la clave actual, valida la nueva y avisa que no se aplicó) y cerrar sesión lleva a «Ingresá a Weda»
   sin borrar lo cargado. Cuando haya backend, esta pantalla ya tiene los lugares para conectarlo. */
function Profile() {
  const email = useAppSelector(s => s.email);
  const remote = useRemote();
  const navigate = useNavigate();

  return (
    <div className="pn-page pf">
      <header className="pn-page-head is-compact">
        <div>
          <h1>Perfil</h1>
          <p className="pn-sub">Los datos de tu casamiento y los de tu cuenta.</p>
        </div>
      </header>

      <section className="pf-card" aria-labelledby="pf-wed">
        <div className="pf-head">
          <h2 id="pf-wed">Datos del casamiento</h2>
          <p>Se ven en tu página, en la lista de regalos y en la vista previa.</p>
        </div>
        <CoupleForm />
      </section>

      <section className="pf-card" aria-labelledby="pf-acc">
        <div className="pf-head">
          <h2 id="pf-acc">Tu cuenta</h2>
          <p>Con estos datos ingresás a Weda.</p>
        </div>
        {/* Sin cuenta no hay correo ni clave que cambiar: antes se mostraba una clave «••••••••» y un «Cambiar» que siempre fallaba (auditoría 2026-10-28). */}
        {remote.user ? (
          <>
            <dl className="pf-rows">
              <div className="pf-row">
                <dt>Correo electrónico</dt>
                <dd>{remote.user.email}</dd>
              </div>
            </dl>
            <p className="pn-note">Tu casamiento se guarda en tu cuenta: podés abrirlo desde otro dispositivo. Para cambiar la clave, <Link to="/clave" className="pn-link">pedí un enlace por correo</Link>. Para cambiar el correo, escribinos a <a className="pn-link" href="mailto:hola@weda.app">hola@weda.app</a>.</p>
          </>
        ) : (
          <p className="pn-note">Todavía no tenés una cuenta. Creá una para guardar tu casamiento en Weda, abrirlo desde cualquier dispositivo y publicarlo.</p>
        )}
        <div className="pf-out">
          <button type="button" className="pn-btn is-ghost" onClick={() => { void (remote.user ? logout() : Promise.resolve()).then(() => navigate({ to: '/crear/cuenta', search: { modo: 'ingresar' } })); }}><LogOut size={16} aria-hidden="true" />{remote.user ? 'Cerrar sesión' : 'Ingresar con una cuenta'}</button>
          {remote.user && <p className="pn-hint">Al cerrar sesión se borra de este dispositivo la copia de tu casamiento; en tu cuenta sigue guardado.</p>}
        </div>
      </section>

    </div>
  );
}


