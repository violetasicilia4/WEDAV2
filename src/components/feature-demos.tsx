import { Check } from 'lucide-react';
import { formatARS, gifts, type Gift } from '@/lib/demo-wedding';

/* Escenas animadas en loop para las tarjetas de funcionalidades de la landing.
   Son puro HTML/CSS (sin video): en reduced-motion quedan en su estado final. */

export function GiftDemo() {
  // Muchos regalos que pasan sin parar: dos columnas que suben y bajan en sentido contrario, en bucle.
  // Mezcla de hogar, experiencias y luna de miel, con montos de todo tipo (de $ 55.000 a $ 1.500.000).
  const ids = ['ollas', 'cafetera', 'globo', 'vuelo-interno', 'sabanas', 'lampara', 'boutique', 'vinos', 'toallas', 'vajilla', 'cena-mar', 'patagonia'];
  const pool = ids.map(id => gifts.find(g => g.id === id)).filter((g): g is Gift => Boolean(g?.image));
  const colA = pool.filter((_, i) => i % 2 === 0);
  const colB = pool.filter((_, i) => i % 2 === 1);
  const card = (g: Gift, k: string) => (
    <div className="fd-gm-card" key={k}>
      <span className="fd-gm-photo">
        <img src={g.image} alt="" loading="lazy" style={g.pos ? { objectPosition: g.pos } : undefined} />
        <span className="fd-gm-price">{formatARS(g.amount)}</span>
      </span>
      <b>{g.name}</b>
      <span className="fd-gm-btn">Regalar</span>
    </div>
  );
  return (
    <div className="fd fd-gm" aria-hidden="true">
      <div className="fd-gm-view">
        <div className="fd-gm-col">{[...colA, ...colA].map((g, i) => card(g, `a${i}`))}</div>
        <div className="fd-gm-col is-down">{[...colB, ...colB].map((g, i) => card(g, `b${i}`))}</div>
      </div>
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
            <div className="fd-hero">
              <small>¡Nos casamos!</small>
              <b>Ignacio y Martina</b>
              <i>20 . 03 . 27</i>
            </div>
            <div className="fd-std">
              <small>Save the date</small>
              <b>Sábado 20 de marzo de 2027</b>
              <div className="fd-count"><span><u>155</u>días</span><span><u>04</u>hs</span><span><u>31</u>min</span><span><u>11</u>seg</span></div>
            </div>
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
        <span className="fd-menu-wrap">
          <span className="fd-menu-inner">
            <span className="fd-label">Menú</span>
            <span className="fd-menu"><span>Sin restricciones</span><span>Sin TACC</span><span className="fd-menu-sel">Vegetariano</span><span>Kids</span></span>
          </span>
        </span>
        <span className="fd-submit">Confirmar</span>
      </div>
      <div className="fd-ok">
        <span className="fd-mcheck"><Check size={18} strokeWidth={1.6} /></span>
        <b className="fd-ok-title">¡Gracias, Lucía!</b>
        <span className="fd-ok-text">Te esperamos el 20 de marzo.</span>
      </div>
    </div>
  );
}
