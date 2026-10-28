import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSessionState } from '@/lib/demo-session';
import { useSite, useSiteActions } from '@/lib/weda/site-model';
import { isEmail } from '@/lib/weda/logic';
import { MARKETING_CONSENT_TEXT } from '@/lib/weda/consent';

type Person = { name: string; first: string; last: string; attending: boolean; menu: string };
type Errors = {
  name?: string | undefined; surname?: string | undefined; contact?: string | undefined;
  attending?: string | undefined; menu?: string | undefined;
};

type RsvpApi = {
  open: () => void;
  /** Cantidad de personas cuya confirmación ya se "envió" en esta sesión de la demo. */
  sentCount: number;
};
const RsvpContext = createContext<RsvpApi>({ open: () => {}, sentCount: 0 });
export const useRsvp = () => useContext(RsvpContext);

/** Contacto: un correo con forma de correo (decisión de la dueña, 2026-10-28: el contacto de los invitados es el mail). */
const isValidContact = (value: string): boolean => isEmail(value.trim());

/**
 * Formulario de confirmación en pop-up: una persona por vez, con su menú.
 * En /ejemplo y sin servidor es una SIMULACIÓN (nada sale del navegador; sessionStorage). En un sitio publicado, `recordRsvp` llama al servidor:
 * si falla, no se marca como enviada y se puede reintentar.
 */
export function RsvpProvider({ children }: { children: ReactNode }) {
  const site = useSite();
  const { recordRsvp } = useSiteActions();
  const menus = site.rsvp.menus ?? [];
  const hasMenus = site.rsvp.menus !== null;
  const [isOpen, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [attending, setAttending] = useState<'yes' | 'no' | ''>('');
  const [menu, setMenu] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [people, setPeople] = useSessionState<Person[]>('rsvp-people', []);
  const [sentList, setSentList] = useSessionState<Person[]>('rsvp-sent', []);
  const [contact, setContact] = useSessionState<string>('rsvp-contact', '');
  const [optIn, setOptIn] = useState(false);
  // form: cargando a una persona · review: personas cargadas, listas para enviar · sent: confirmación enviada
  const [view, setView] = useState<'form' | 'review' | 'sent'>('form');
  const form = useRef<HTMLFormElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  // Evita que un doble clic en «Enviar» cargue dos veces la misma respuesta (el segundo clic todavía ve la lista anterior).
  const sending = useRef(false);

  const resetForm = () => { setName(''); setSurname(''); setAttending(''); setMenu(''); setErrors({}); };
  const open = () => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    sending.current = false;
    setView(people.length > 0 ? 'review' : sentList.length > 0 ? 'sent' : 'form');
    setOpen(true);
  };
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    // Un doble clic no debe duplicar la respuesta: la segunda vez ya no quedan personas por enviar.
    if (people.length === 0 || sending.current) return;
    sending.current = true;
    setSendError(null); setBusy(true);
    try {
      await recordRsvp(people.map(p => ({ first: p.first || p.name.split(' ')[0] || p.name, last: p.last || p.name.split(' ').slice(1).join(' '), attending: p.attending, menu: p.menu })), { email: contact.trim().toLowerCase(), marketingOptIn: optIn });
    } catch (e) {
      // No se simula el envío: las personas siguen cargadas para reintentar.
      sending.current = false; setBusy(false);
      setSendError(e instanceof Error && e.message ? e.message : 'No pudimos enviar tu confirmación. Revisá tu conexión y probá de nuevo.');
      return;
    }
    setBusy(false);
    setSentList(prev => [...prev, ...people]);
    setPeople([]);
    setView('sent');
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = 'Escribí tu nombre.';
    if (surname.trim().length < 2) e.surname = 'Escribí tu apellido.';
    if (!isValidContact(contact)) e.contact = 'Escribí un correo válido.';
    if (!attending) e.attending = 'Contanos si vas a venir.';
    if (attending === 'yes' && hasMenus && !menu) e.menu = 'Elegí una opción para esta persona.';
    return e;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const id = e.name ? 'rsvp-name' : e.surname ? 'rsvp-surname' : e.contact ? 'rsvp-contact' : e.attending ? 'rsvp-att-yes' : 'rsvp-menu-sin-restricciones';
      form.current?.querySelector<HTMLElement>(`#${id}`)?.focus();
      return;
    }
    sending.current = false;
    setPeople(p => [...p, { name: `${name.trim()} ${surname.trim()}`, first: name.trim(), last: surname.trim(), attending: attending === 'yes', menu: attending === 'yes' && hasMenus ? menu : '' }]);
    resetForm();
    setView('review');
  };

  const menuName = (id: string) => menus.find(m => m.id === id)?.name ?? '';
  const sentNow = sentList.length;

  return (
    <RsvpContext.Provider value={{ open, sentCount: sentNow }}>
      {children}
      <Dialog open={isOpen} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="dm-rsvp" onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }} onCloseAutoFocus={e => { e.preventDefault(); lastFocus.current?.focus(); }}>
          {view === 'sent' ? (
            <div className="dm-rsvp-done">
              <span className="dm-rsvp-mark" aria-hidden="true"><Check size={24} strokeWidth={1.6} /></span>
              <DialogTitle>{sentList.length === 1 ? `¡Gracias, ${sentList[0]!.name.split(/\s+/)[0]}!` : `¡Gracias! Cargaste ${sentList.length} confirmaciones.`}</DialogTitle>
              <DialogDescription>
                Gracias por avisarnos.
              </DialogDescription>
              <ul className="dm-rsvp-people" aria-label="Confirmaciones de esta sesión">
                {sentList.map((p, n) => (
                  <li key={`${p.name}-${n}`}><strong>{p.name}</strong><span>{p.attending ? (menuName(p.menu) || 'Asiste') : 'No asiste'}</span></li>
                ))}
              </ul>
              <div className="dm-rsvp-actions">
                <button type="button" className="dm-solid" onClick={() => setOpen(false)}>Cerrar</button>
                <button type="button" className="dm-ghost" onClick={() => { resetForm(); setView('form'); }}>Cargar otra persona</button>
              </div>
            </div>
          ) : view === 'review' && people.length > 0 ? (
            <div className="dm-rsvp-done">
              <DialogTitle>{people.length === 1 ? 'Revisá tu confirmación' : `Revisá las ${people.length} confirmaciones`}</DialogTitle>
              <DialogDescription>
                Todavía no se enviaron. Si venís con alguien, sumalo ahora; después tocá <strong>Enviar</strong>.
              </DialogDescription>
              <ul className="dm-rsvp-people" aria-label="Personas cargadas">
                {people.map((p, n) => (
                  <li key={`${p.name}-${n}`}><strong>{p.name}</strong><span>{p.attending ? (menuName(p.menu) || 'Asiste') : 'No asiste'}</span></li>
                ))}
              </ul>
              {/* Novedades de Weda: casilla aparte y destildada (consentimiento expreso; no es necesaria para confirmar). */}
              <label className="dm-rsvp-optin"><input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} /><span>{MARKETING_CONSENT_TEXT} <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a></span></label>
              <div className="dm-rsvp-actions">
                <>
                  {sendError && <p className="dm-error" role="alert">{sendError}</p>}
                  <button type="button" className="dm-solid" disabled={busy} aria-busy={busy} onClick={() => { void send(); }}>{busy ? 'Enviando…' : sendError ? 'Reintentar' : people.length === 1 ? 'Enviar confirmación' : `Enviar las ${people.length} confirmaciones`}</button>
                </>
                <button type="button" className="dm-ghost" onClick={() => setView('form')}>Cargar otra persona</button>
              </div>
            </div>
          ) : (
            <form ref={form} onSubmit={onSubmit} noValidate className="dm-rsvp-form">
              <header>
                <DialogTitle>Confirmá tu asistencia</DialogTitle>
                <DialogDescription>Cargá a cada persona y enviá todo junto. {site.rsvp.deadline ? `Respondé antes del ${site.rsvp.deadline}.` : ''}</DialogDescription>
              </header>

              <div className="dm-rsvp-two">
                <div className={`dm-rsvp-field${errors.name ? ' has-error' : ''}`}>
                  <label htmlFor="rsvp-name">Nombre</label>
                  <input id="rsvp-name" type="text" autoComplete="given-name" value={name}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors(x => ({ ...x, name: undefined })); }}
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? 'rsvp-name-err' : undefined} />
                  {errors.name && <p className="dm-error" id="rsvp-name-err" role="alert">{errors.name}</p>}
                </div>
                <div className={`dm-rsvp-field${errors.surname ? ' has-error' : ''}`}>
                  <label htmlFor="rsvp-surname">Apellido</label>
                  <input id="rsvp-surname" type="text" autoComplete="family-name" value={surname}
                    onChange={e => { setSurname(e.target.value); if (errors.surname) setErrors(x => ({ ...x, surname: undefined })); }}
                    aria-invalid={!!errors.surname} aria-describedby={errors.surname ? 'rsvp-surname-err' : undefined} />
                  {errors.surname && <p className="dm-error" id="rsvp-surname-err" role="alert">{errors.surname}</p>}
                </div>
              </div>

              <div className={`dm-rsvp-field${errors.contact ? ' has-error' : ''}`}>
                <label htmlFor="rsvp-contact">Correo electrónico</label>
                <input id="rsvp-contact" type="email" inputMode="email" autoComplete="email" value={contact}
                  onChange={e => { setContact(e.target.value); if (errors.contact) setErrors(x => ({ ...x, contact: undefined })); }}
                  aria-invalid={!!errors.contact} aria-describedby={errors.contact ? 'rsvp-contact-err' : undefined} />
                {errors.contact && <p className="dm-error" id="rsvp-contact-err" role="alert">{errors.contact}</p>}
              </div>

              <fieldset className={`dm-rsvp-field${errors.attending ? ' has-error' : ''}`}>
                <legend>¿Vas a venir?</legend>
                <div className="dm-rsvp-pair">
                  {([['yes', 'Sí, ahí estoy'], ['no', 'No puedo ir']] as const).map(([v, l]) => (
                    <label key={v} className={`dm-rsvp-opt${attending === v ? ' on' : ''}`}>
                      <input type="radio" id={`rsvp-att-${v}`} name="attending" value={v} checked={attending === v}
                        onChange={() => { setAttending(v); setErrors(x => ({ ...x, attending: undefined })); }} />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
                {errors.attending && <p className="dm-error" role="alert">{errors.attending}</p>}
              </fieldset>

              {attending === 'yes' && hasMenus && (
                <fieldset className={`dm-rsvp-field${errors.menu ? ' has-error' : ''}`}>
                  <legend>Restricción alimenticia</legend>
                  <div className="dm-rsvp-menus">
                    {menus.map(m => (
                      <label key={m.id} className={`dm-rsvp-menu${menu === m.id ? ' on' : ''}`}>
                        <input type="radio" id={`rsvp-menu-${m.id}`} name="menu" value={m.id} checked={menu === m.id}
                          onChange={() => { setMenu(m.id); setErrors(x => ({ ...x, menu: undefined })); }} />
                        <span><strong>{m.name}</strong></span>
                      </label>
                    ))}
                  </div>
                  {errors.menu && <p className="dm-error" role="alert">{errors.menu}</p>}
                </fieldset>
              )}

              <div className="dm-rsvp-actions">
                <button type="submit" className="dm-solid">Confirmar</button>
                {people.length > 0 && <button type="button" className="dm-ghost" onClick={() => setView('review')}>Volver a revisar ({people.length})</button>}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </RsvpContext.Provider>
  );
}
