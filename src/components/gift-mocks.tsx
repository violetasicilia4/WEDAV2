import { useId } from 'react';
import { ArrowLeft, Check, Receipt, X } from 'lucide-react';
import { formatARS, gifts } from '@/lib/demo-wedding';
import '@/gift-mocks.css';

/* Maquetas decorativas de la lista de regalos (como las de The Knot: foto inclinada con una pieza de la interfaz encima). Usan regalos y textos
   reales del catálogo y de la página de regalos; no son capturas ni datos de una pareja real. Van en la sección Regalos de la landing y en /lista-de-regalos.
   El sello usa un id de SVG por instancia (useId) para que dos maquetas en la misma página no choquen. */
const g = (id: string) => gifts.find(x => x.id === id)!;

export function NoFeeMock() {
  const ring = `mk-ring-${useId().replace(/:/g, '')}`;
  const trip = g('patagonia');
  return (
    <div className="mk mk-nofee" aria-hidden="true">
      <svg className="mk-badge" viewBox="0 0 120 120"><defs><path id={ring} d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" /></defs>
        <circle cx="60" cy="60" r="58" /><text><textPath href={`#${ring}`} startOffset="0">SIN COMISIÓN · SIN COMISIÓN ·</textPath></text><text className="mk-badge-big" x="60" y="70" textAnchor="middle">0%</text></svg>
      <div className="mk-phone">
        <div className="mk-phone-bar"><ArrowLeft size={16} /><b>Hacer un regalo</b><X size={16} /></div>
        <img src={trip.image} alt="" loading="lazy" />
        <small>{trip.category}</small>
        <strong>{trip.name}</strong>
        <span className="mk-amount">{formatARS(trip.amount)}</span>
      </div>
      <div className="mk-pay">
        <b>¿Cómo querés pagar?</b>
        <span className="mk-opt is-on"><i />Transferencia al alias</span>
        <span className="mk-note">Va directo a la cuenta de los novios</span>
      </div>
    </div>
  );
}

export function BudgetMock() {
  const items = [g('sabanas'), g('cafetera')];
  return (
    <div className="mk mk-budget" aria-hidden="true">
      <img className="mk-photo" src={g('vajilla').image} alt="" loading="lazy" />
      <div className="mk-panel">
        <b>Ordenar o filtrar por monto</b>
        <div className="mk-chips"><span className="is-on">Hasta $ 200.000</span><span>$ 200.000 a $ 500.000</span><span>Más de $ 500.000</span></div>
        <div className="mk-gifts">{items.map(x => <span key={x.id}><img src={x.image} alt="" loading="lazy" /><em>{x.name}</em><strong>{formatARS(x.amount)}</strong></span>)}</div>
        <span className="mk-more">Ver lista de regalos</span>
      </div>
    </div>
  );
}

export function ReceivedMock() {
  // Invitados y regalo de la pareja de ejemplo (src/lib/weda/seed.ts): Lucía Ferreyra regaló el set de vajilla con ese mensaje;
  // «Familia Bianchi» (por Ramiro Bianchi) muestra un regalo de monto más alto.
  const rows = [
    { who: 'Lucía Ferreyra', gift: g('vajilla'), note: '«¡Que sean muy felices!»', ok: true },
    { who: 'Familia Bianchi', gift: g('globo'), ok: false },
    { who: 'Paula Domínguez', gift: g('ollas'), ok: false },
  ];
  return (
    <div className="mk mk-received" aria-hidden="true">
      <img className="mk-photo" src={g('cena-mar').image} alt="" loading="lazy" />
      <div className="mk-list">
        <b>Regalos recibidos</b>
        {rows.map(r => (
          <div className="mk-row" key={r.who}>
            <span className="mk-avatar">{r.who.split(' ').map(w => w[0]).join('')}</span>
            <span className="mk-row-main"><strong>{r.who}</strong><small>{r.gift.name} · {formatARS(r.gift.amount)}</small>{r.note && <em>{r.note}</em>}</span>
            <span className={`mk-state${r.ok ? ' is-ok' : ''}`}>{r.ok ? <><Check size={12} strokeWidth={2.4} /><span>Confirmado</span></> : <><Receipt size={12} strokeWidth={1.8} /><span>Comprobante</span></>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
