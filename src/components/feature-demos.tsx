import { Check, Copy } from 'lucide-react';

/* Escenas animadas en loop para las tarjetas de funcionalidades de la landing.
   Son puro HTML/CSS (sin video): en reduced-motion quedan en su estado final. */

export function GiftDemo() {
  // Dos cuadrados por fila, quietos y a la vista; se elige la excursión y sigue el flujo de pago.
  const items: { name: string; src: string; pos?: string; chosen?: boolean }[] = [
    { name: 'Pasaje luna de miel', src: '/lm-avion.png', pos: '50% 45%' },
    { name: 'Excursión en barco', src: '/regalo-excursion.jpg', pos: '50% 60%', chosen: true },
    { name: 'Cata en Mendoza', src: '/regalo-cata-mendoza.webp', pos: '50% 52%' },
    { name: 'Lámpara de living', src: '/lista-de-regalos-lampara.jpg' },
    { name: 'Juego de ollas', src: '/lista-de-regalos-olla.jpg' },
    { name: 'Cafetera barista', src: '/regalo-cafetera-barista.png', pos: '50% 55%' },
  ];
  return (
    <div className="fd fd-gift fd-gift-flow" aria-hidden="true">
      <div className="fd-list-viewport">
        <div className="fd-grid2">
          {items.map(it => (
            <div className={`fd-sq${it.chosen ? ' fd-chosen' : ''}`} key={it.name}>
              <span className="fd-sq-photo">
                <img src={it.src} alt="" loading="lazy" style={it.pos ? { objectPosition: it.pos } : undefined} />
                {it.chosen && <span className="fd-price">$ 250.000</span>}
              </span>
              {it.chosen && <span className="fd-ring" />}
              <b>{it.name}</b>
              <span className="fd-btn"><span className="fd-btn-a">Regalar</span><span className="fd-btn-b"><Check size={11} strokeWidth={2} />Elegido</span></span>
            </div>
          ))}
        </div>
      </div>
      <div className="fd-scrim" />
      <div className="fd-modal fd-modal2">
        <div className="fd-mform">
          <span className="fd-mhead">
            <span className="fd-mthumb"><img src="/regalo-excursion.jpg" alt="" /></span>
            <span className="fd-mhead-text"><span className="fd-modal-kicker">Regalo elegido</span><b className="fd-modal-title">Excursión en barco</b><span className="fd-modal-amount">$ 250.000</span></span>
          </span>
          <span className="fd-modal-label">¿Cómo querés pagar?</span>
          <span className="fd-mchips"><span className="fd-mchip fd-mchip-alias">Alias</span><span className="fd-mchip">Tarjeta</span></span>
          <span className="fd-alias fd-alias-row"><span>ignacio.martina</span><span className="fd-copyic"><Copy className="fd-copy-a" size={13} strokeWidth={1.6} /><span className="fd-copy-b"><Check size={13} strokeWidth={2} />Copiado</span></span></span>
          <span className="fd-mhelp">Transferí $ 250.000 a este alias.</span>
          <span className="fd-mtwo">
            <span className="fd-mfield"><span className="fd-modal-label">Nombre</span><span className="fd-minput"><span className="fd-typed-n">Lucía</span></span></span>
            <span className="fd-mfield"><span className="fd-modal-label">Apellido</span><span className="fd-minput"><span className="fd-typed-s">Fernández</span></span></span>
          </span>
          <span className="fd-msend">Enviar</span>
        </div>
        <div className="fd-mthanks">
          <span className="fd-mcheck"><Check size={20} strokeWidth={1.8} /></span>
          <b>¡Gracias, Lucía!</b>
          <span>Ignacio y Martina agradecen tu regalo.</span>
        </div>
      </div>
      <div className="fd-reset" />
    </div>
  );
}

export function SiteDemo() {
  return (
    <div className="fd fd-site" aria-hidden="true">
      <div className="fd-frame">
        <div className="fd-chrome"><i /><i /><i /></div>
        <div className="fd-viewport">
          <div className="fd-page">
            <div className="fd-hero"><b>Ignacio &amp; Martina</b><i>20 · 03 · 2027</i></div>
            <div className="fd-times">
              <div><b>17:00</b><span>Ceremonia</span></div>
              <div><b>18:30</b><span>Recepción</span></div>
              <div><b>20:30</b><span>Fiesta</span></div>
            </div>
            <div className="fd-pill">Ver en Google Maps</div>
            <div className="fd-tiles"><i /><i /><i /></div>
            <div className="fd-line" /><div className="fd-line short" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RsvpDemo() {
  return (
    <div className="fd fd-rsvp" aria-hidden="true">
      <div className="fd-form">
        <span className="fd-label">Nombre y apellido</span>
        <span className="fd-input"><span className="fd-typed">Lucía Fernández</span></span>
        <span className="fd-label">¿Vas a venir?</span>
        <span className="fd-pair"><span className="fd-chip fd-chip-yes">Sí, ahí estoy</span><span className="fd-chip">No puedo ir</span></span>
        <span className="fd-label">Menú</span>
        <span className="fd-menu"><span>Clásico</span><span className="fd-menu-sel">Vegetariano</span></span>
        <span className="fd-submit">Confirmar</span>
      </div>
      <div className="fd-ok">
        <span className="fd-mcheck"><Check size={20} strokeWidth={1.8} /></span>
        <b>¡Gracias, Lucía!</b>
        <span>Te esperamos el 20 de marzo.</span>
      </div>
    </div>
  );
}
