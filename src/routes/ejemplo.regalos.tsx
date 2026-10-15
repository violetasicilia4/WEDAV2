import { useRef, useState } from 'react';
import { useSessionState } from '@/lib/demo-session';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowRight, BedDouble, BedSingle, Check, ChefHat, Coffee, Compass, Copy, Dog, House, Lamp,
  Palette, Plane, Sofa, Sprout, Ticket, Trees, Upload, Utensils, Wine, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRsvp } from '@/components/rsvp-dialog';
import { EjemploCover } from '@/components/ejemplo-cover';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { alias, categories, formatARS, gifts, wedding, type Category, type Gift, type IconKey } from '@/lib/demo-wedding';

export const Route = createFileRoute('/ejemplo/regalos')({
  head: () => ({
    meta: [
      { title: 'Lista de regalos • Ignacio & Martina' },
      { name: 'description', content: 'La lista de regalos de un casamiento ficticio: categorías, búsqueda por monto y un flujo de regalo simulado, creado con Weda.' },
      { property: 'og:title', content: 'Lista de regalos • Ignacio & Martina' },
      { property: 'og:description', content: 'La lista de regalos de un casamiento ficticio, creada con Weda.' },
      { property: 'og:image', content: wedding.photo },
    ],
  }),
  component: Gifts,
});

const icons: Record<IconKey, LucideIcon> = {
  utensils: Utensils, bed: BedDouble, chef: ChefHat, plane: Plane, sofa: Sofa, lamp: Lamp, wine: Wine,
  palette: Palette, ticket: Ticket, sprout: Sprout, dog: Dog, trees: Trees, coffee: Coffee, sheets: BedSingle, compass: Compass, home: House,
};

/* Misma tarjeta que la escena "Lista de regalos" de la landing: foto cuadrada, monto sobre la foto,
   nombre y un botón. */
function GiftCard({ gift, chosen, onPick }: { gift: Gift; chosen: boolean; onPick: (g: Gift) => void }) {
  const Icon = icons[gift.icon];
  const done = gift.taken || chosen;
  return (
    <article className={`rg-card${done ? ' is-done' : ''}`}>
      <div className={`rg-photo${gift.fit ? ' is-contain' : ''}${gift.fit === 'white' ? ' is-white' : ''}`} style={gift.fit && gift.image ? ({ '--bg': `url(${gift.image})` } as React.CSSProperties) : undefined}>
        {gift.image
          ? <img src={gift.image} alt="" loading="lazy" style={gift.pos || gift.zoom ? { objectPosition: gift.pos, ...(gift.zoom ? { transform: `scale(${gift.zoom.scale})`, transformOrigin: gift.zoom.origin } : {}) } : undefined} />
          : <span className="rg-icon" aria-hidden="true"><Icon size={34} strokeWidth={1.2} /></span>}
        <span className="rg-price">{formatARS(gift.amount)}</span>
      </div>
      <h3 title={gift.name}>{gift.name}</h3>
      <button type="button" className="rg-btn" disabled={done} onClick={() => onPick(gift)}>
        {done ? <><Check size={14} aria-hidden="true" />{chosen ? 'Elegido por vos' : 'Ya elegido'}</> : 'Regalar'}
      </button>
    </article>
  );
}

/* Pop-up: regalo elegido → cómo pagar → alias → nombre, apellido y comprobante → Enviar (bloqueado hasta completar) → agradecimiento. */
function GiftDialog({ gift, onClose, onSent, returnFocus }: { gift: Gift | null; onClose: () => void; onSent: (g: Gift, giver: { name: string; message: string }) => void; returnFocus: { current: HTMLElement | null } }) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [message, setMessage] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [how, setHow] = useState<'alias' | 'tarjeta'>('alias');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const reset = () => { setName(''); setSurname(''); setMessage(''); setProof(null); setHow('alias'); setCopied(false); setSent(null); };
  // Para poder enviar: nombre, apellido y, si transfiere por alias, el comprobante cargado.
  const missing = [
    name.trim().length < 2 && 'nombre',
    surname.trim().length < 2 && 'apellido',
    how === 'alias' && !proof && 'comprobante',
  ].filter(Boolean) as string[];
  const close = () => { onClose(); window.setTimeout(reset, 200); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(alias); } catch { /* sin portapapeles: el alias igual queda a la vista */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 2200);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (missing.length) return;
    if (gift) onSent(gift, { name: `${name.trim()} ${surname.trim()}`, message: message.trim() });
    setSent(name.trim().split(/\s+/)[0] ?? name.trim());
  };
  return (
    <Dialog open={!!gift} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className="rg-dialog" onCloseAutoFocus={e => { e.preventDefault(); returnFocus.current?.focus(); }}>
        {gift && (sent ? (
          <div className="rg-thanks">
            <span className="rg-check" aria-hidden="true"><Check size={22} strokeWidth={1.8} /></span>
            <DialogTitle>¡Gracias, {sent}!</DialogTitle>
            <DialogDescription>Así se vería la confirmación de tu regalo. Es una demostración: no se realizó ningún cobro ni se envió nada.</DialogDescription>
            <button type="button" className="dm-solid" onClick={close}>Volver a la lista</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="rg-form">
            <header className="rg-head">
              <span className="rg-thumb" aria-hidden="true">{gift.image ? <img src={gift.image} alt="" style={gift.pos ? { objectPosition: gift.pos } : undefined} /> : (() => { const Icon = icons[gift.icon]; return <Icon size={22} strokeWidth={1.3} />; })()}</span>
              <div>
                <p className="rg-kicker">Regalo elegido</p>
                <DialogTitle>{gift.name}</DialogTitle>
                <DialogDescription>{formatARS(gift.amount)}</DialogDescription>
              </div>
            </header>

            <fieldset className="rg-field">
              <legend>¿Cómo querés pagar?</legend>
              <div className="rg-chips">
                {(['alias', 'tarjeta'] as const).map(v => (
                  <label key={v} className={`rg-chip${how === v ? ' on' : ''}`}>
                    <input type="radio" name="rg-how" value={v} checked={how === v} onChange={() => setHow(v)} />
                    <span>{v === 'alias' ? 'Alias' : 'Tarjeta'}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {how === 'alias' ? (
              <>
                <div className="rg-alias">
                  <code>{alias}</code>
                  <button type="button" onClick={copy} aria-label={copied ? 'Alias copiado' : 'Copiar alias'}>
                    {copied ? <><Check size={14} aria-hidden="true" />Copiado</> : <Copy size={15} aria-hidden="true" />}
                  </button>
                </div>
                <p className="rg-help">Transferí {formatARS(gift.amount)} a este alias y después cargá el comprobante.</p>
              </>
            ) : (
              <p className="rg-note">Con tarjeta vas a poder pagar desde el sitio, en cuotas. Para este ejemplo, usá el alias.</p>
            )}

            <div className="rg-two">
              <div className="rg-field">
                <label htmlFor="rg-name">Nombre</label>
                <input id="rg-name" type="text" autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="rg-field">
                <label htmlFor="rg-surname">Apellido</label>
                <input id="rg-surname" type="text" autoComplete="family-name" value={surname} onChange={e => setSurname(e.target.value)} />
              </div>
            </div>

            <div className="rg-field">
              <label htmlFor="rg-message">Mensaje (opcional)</label>
              <textarea id="rg-message" rows={2} value={message} onChange={e => setMessage(e.target.value)} />
            </div>

            {how === 'alias' && (
              <div className="rg-up">
                <p className="rg-up-label">Comprobante de transferencia</p>
                <input id="rg-proof" className="dm-sr" type="file" accept="image/*,application/pdf" onChange={e => setProof(e.target.files?.[0] ?? null)} />
                <label htmlFor="rg-proof" className={`rg-file${proof ? ' has' : ''}`}>
                  {proof ? <Check size={16} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
                  <span>{proof ? proof.name : 'Subir captura o PDF'}</span>
                  {proof && <em>Cambiar</em>}
                </label>
                <p className="rg-sim">Simulación: el archivo no sale de tu navegador.</p>
              </div>
            )}

            <p className="dm-demo-note">Es una demostración: no se realizará ningún cobro real.</p>
            <button type="submit" className="dm-solid rg-send" disabled={missing.length > 0}>Enviar</button>
            {missing.length > 0 && <p className="rg-missing" aria-live="polite">Para enviar falta: {missing.join(', ')}.</p>}
          </form>
        ))}
      </DialogContent>
    </Dialog>
  );
}

function Gifts() {
  const rsvp = useRsvp();
  const [filter, setFilter] = useState<Category | 'Todos'>('Todos');
  const [picked, setPicked] = useState<Gift | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [given, setGiven] = useSessionState<{ id: string; name: string; message: string }[]>('gifts-given', []);
  const chosen = given.map(x => x.id);
  const [range, setRange] = useState<'all' | 'asc' | 'desc' | 'low' | 'mid' | 'high'>('all');
  const [query, setQuery] = useState('');
  const inRange = (g: Gift) => range === 'all' || range === 'asc' || range === 'desc' || (range === 'low' ? g.amount <= 200000 : range === 'mid' ? g.amount > 200000 && g.amount <= 500000 : g.amount > 500000);
  const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const found = (g: Gift) => !query.trim() || norm(g.name).includes(norm(query.trim()));
  const visible = gifts.filter(g => (filter === 'Todos' || g.category === filter) && inRange(g) && found(g));
  if (range === 'asc') visible.sort((a, b) => a.amount - b.amount);
  if (range === 'desc') visible.sort((a, b) => b.amount - a.amount);
  const options: (Category | 'Todos')[] = ['Todos', ...categories];
  return <>
    <EjemploCover variant="gifts" next="#regalos" />

    <section className="ej-block ej-white rg-list" id="regalos"><div className="section-inner">
      <div className="rg-mfilters" role="group" aria-label="Buscar y filtrar regalos">
        <label className="rg-search">
          <span className="dm-sr">Buscar un regalo</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar un regalo" autoComplete="off" />
        </label>
        <label className="rg-sel">
          <span className="dm-sr">Categoría</span>
          <select value={filter} onChange={e => setFilter(e.target.value as Category | 'Todos')}>
            {options.map(o => <option key={o} value={o}>{o === 'Todos' ? 'Categorías' : o}</option>)}
          </select>
        </label>
        <label className="rg-sel">
          <span className="dm-sr">Ordenar o filtrar por monto</span>
          <select value={range} onChange={e => setRange(e.target.value as typeof range)}>
            <option value="all">Cualquier monto</option>
            <option value="asc">Menor a mayor</option>
            <option value="desc">Mayor a menor</option>
            <option value="low">Hasta $ 200.000</option>
            <option value="mid">$ 200.000 a $ 500.000</option>
            <option value="high">Más de $ 500.000</option>
          </select>
        </label>
      </div>
      <div className="rg-filters" role="group" aria-label="Filtrar regalos">
        {options.map(o => (
          <button type="button" key={o} className={o === filter ? 'on' : ''} aria-pressed={o === filter} onClick={() => setFilter(o)}>{o}</button>
        ))}
        <label className="rg-search rg-search-d">
          <span className="dm-sr">Buscar un regalo</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar un regalo" autoComplete="off" />
        </label>
        <label className="rg-range">
          <span className="dm-sr">Ordenar o filtrar por monto</span>
          <select value={range} onChange={e => setRange(e.target.value as typeof range)}>
            <option value="all">Cualquier monto</option>
            <option value="asc">Menor a mayor</option>
            <option value="desc">Mayor a menor</option>
            <option value="low">Hasta $ 200.000</option>
            <option value="mid">$ 200.000 a $ 500.000</option>
            <option value="high">Más de $ 500.000</option>
          </select>
        </label>
      </div>
      {visible.length === 0 && <p className="rg-empty">No encontramos regalos con esos filtros. Probá con otra búsqueda o limpiá los filtros.</p>}
      <div className="rg-grid">
        {visible.map(g => <GiftCard key={g.id} gift={g} chosen={chosen.includes(g.id)} onPick={g => { returnFocus.current = document.activeElement as HTMLElement | null; setPicked(g); }} />)}
      </div>
      <p className="rg-live" aria-live="polite">{visible.length} {visible.length === 1 ? 'regalo' : 'regalos'}{filter === 'Todos' ? '' : ` en ${filter}`}{range === 'all' || range === 'asc' || range === 'desc' ? '' : ' en ese rango de monto'}</p>
      <div className="rg-next">
        <p>¿Ya elegiste? Falta un último paso.</p>
        <Button variant="seed" onClick={rsvp.open}>Confirmar asistencia</Button>
        <Button variant="seedLink" asChild><Link to="/ejemplo"><span>Volver al sitio</span><ArrowRight size={15} /></Link></Button>
      </div>
    </div></section>

    <GiftDialog gift={picked} onClose={() => setPicked(null)} onSent={(g, who) => setGiven(c => [...c.filter(x => x.id !== g.id), { id: g.id, ...who }])} returnFocus={returnFocus} />
  </>;
}
