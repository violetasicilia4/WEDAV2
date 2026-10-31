import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { CoupleForm } from '@/components/panel/couple-form';
import { PasswordForm } from '@/components/panel/password-form';
import { SessionsRow } from '@/components/panel/sessions-row';
import { logout, useRemote } from '@/lib/weda/remote';

export const Route = createFileRoute('/panel/perfil')({ component: Profile });

/* Perfil: (1) los datos del casamiento (nombres, fecha, lugar y foto), que se guardan en la cuenta y se ven en la página,
   la lista de regalos y la vista previa; (2) la cuenta: correo, cambiar la clave (con la clave actual; el servidor cierra las demás
   sesiones) y cerrar sesión. Sin cuenta solo se invita a crearla. */
function Profile() {
  const remote = useRemote();
  const navigate = useNavigate();
  const [pass, setPass] = useState<'closed' | 'open' | 'done'>('closed');

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
              <div className="pf-row">
                <dt>Clave</dt>
                <dd aria-label="Oculta">••••••••</dd>
                {pass !== 'open' && <button type="button" className="pn-btn is-ghost is-small" onClick={() => setPass('open')}>Cambiar</button>}
              </div>
              {/* Cambiar la clave cierra las demás sesiones: se vuelve a consultar el número. */}
              <SessionsRow key={pass === 'done' ? 'after-pass' : 'start'} />
            </dl>
            {pass === 'open' && <PasswordForm onDone={() => setPass('done')} onCancel={() => setPass('closed')} />}
            {pass === 'done' && <p className="pn-note" role="status">Listo: cambiaste tu clave. Cerramos las sesiones abiertas en otros dispositivos; en este seguís adentro.</p>}
            <p className="pn-note">Tu casamiento se guarda en tu cuenta: podés abrirlo desde otro dispositivo. Si no recordás tu clave, <Link to="/clave" className="pn-link">pedí un enlace por correo</Link>. Para cambiar el correo, escribinos a <a className="pn-link" href="mailto:hola@weda.app">hola@weda.app</a>.</p>
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
