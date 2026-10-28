// Lista de regalos pública. Es la MISMA página para /ejemplo/regalos y para la lista de cada pareja: todo viene de useSite().
import { isEmail } from '@/lib/weda/logic';
import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight, BedDouble, BedSingle, Check, ChefHat, Coffee, Compass, Copy, Dog, House, Lamp,
  Palette, Plane, Sofa, Sprout, Ticket, Trees, Upload, Utensils, Wine, X, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRsvp } from '@/components/rsvp-dialog';
import { SiteCover } from './site-cover';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatARS, type Category, type Gift, type IconKey } from '@/lib/demo-wedding';
import { useSite, useSiteActions, type GiftSubmission, type Giver } from '@/lib/weda/site-model';
import { MARKETING_CONSENT_TEXT } from '@/lib/weda/consent';

const icons: Record<IconKey, LucideIcon> = {
  utensils: Utensils, bed: BedDouble, chef: ChefHat, plane: Plane, sofa: Sofa, lamp: Lamp, wine: Wine,
  palette: Palette, ticket: Ticket, sprout: Sprout, dog: Dog, trees: Trees, coffee: Coffee, sheets: BedSingle, compass: Compass, home: House,
};

/* Misma tarjeta que la escena "Lista de regalos" de la landing: foto cuadrada, monto sobre la foto,
   nombre y un botón. */
function GiftCard({ gift, chosen, inCart, onPick }: { gift: Gift; chosen: boolean; inCart: boolean; onPick: (g: Gift) => void }) {
  const Icon = icons[gift.icon];
  const done = gift.taken || chosen;
  return (
    <article className={`rg-card${done ? ' is-done' : ''}${inCart ? ' in-cart' : ''}`}>
      <div className={`rg-photo${gift.fit ? ' is-contain' : ''}${gift.fit === 'white' ? ' is-white' : ''}`} style={gift.fit && gift.image ? ({ '--bg': `url(${gift.image})` } as React.CSSProperties) : undefined}>
        {gift.image
          ? <img src={gift.image} alt="" loading="lazy" style={gift.pos || gift.zoom ? { objectPosition: gift.pos, ...(gift.zoom ? { transform: `scale(${gift.zoom.scale})`, transformOrigin: gift.zoom.origin } : {}) } : undefined} />
          : <span className="rg-icon" aria-hidden="true"><Icon size={34} strokeWidth={1.2} /></span>}
        <span className="rg-price">{formatARS(gift.amount)}</span>
      </div>
      <h3 title={gift.name}>{gift.name}</h3>
      <button type="button" className="rg-btn" disabled={done} onClick={() => onPick(gift)}>
        {done ? <><Check size={14} aria-hidden="true" />{chosen ? 'Elegido por vos' : 'Ya elegido'}</> : inCart ? <><Check size={14} aria-hidden="true" />En tu regalo</> : 'Regalar'}
      </button>
    </article>
  );
}

function Thumb({ gift }: { gift: Gift }) {
  const Icon = icons[gift.icon];
  return <span className="rg-thumb" aria-hidden="true">{gift.image ? <img src={gift.image} alt="" style={gift.pos ? { objectPosition: gift.pos } : undefined} /> : <Icon size={22} strokeWidth={1.3} />}</span>;
}

/* Pop-up de varios regalos: tu regalo (lista, quitar, total) → cómo pagar → alias → nombre, apellido y comprobante → Enviar → agradecimiento.
   «Agregar otro regalo» vuelve a la lista sin perder lo elegido. */
type DialogView = 'cart' | 'pay';
function GiftDialog({ open, gifts: items, onClose, onRemove, onSent, returnFocus }: { open: boolean; gifts: Gift[]; onClose: () => void; onRemove: (g: Gift) => void; onSent: (gs: Gift[], giver: Giver, extra: GiftSubmission) => void | Promise<void>; returnFocus: { current: HTMLElement | null } }) {
  const [view, setView] = useState<DialogView>('cart');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [optIn, setOptIn] = useState(false);
  const { remote } = useSiteActions();
  const [proof, setProof] = useState<File | null>(null);
  const [how, setHow] = useState<'alias' | 'tarjeta'>('alias');
  const [copied, setCopied] = useState(false);
  const site = useSite();
  const alias = site.alias;
  // Lo enviado se guarda aparte: al enviar, el carrito se vacía pero el agradecimiento sigue mostrando esos regalos.
  const [sent, setSent] = useState<{ first: string; gifts: Gift[] } | null>(null);
  const total = items.reduce((n, g) => n + g.amount, 0);
  const reset = () => { attempt.current = null; setSendError(null); setView('cart'); setName(''); setSurname(''); setEmail(''); setMessage(''); setOptIn(false); setProof(null); setHow('alias'); setCopied(false); setSent(null); };
  // Para poder enviar: nombre, apellido, correo (obligatorio: constancia del regalo y contacto de la pareja) y, si transfiere por alias, el comprobante.
  const cardSelected = site.acceptCard && how === 'tarjeta';
  const noAlias = !cardSelected && !alias;
  const blocked = cardSelected || noAlias;
  const missing = blocked ? [] : [
    name.trim().length < 2 && 'nombre',
    surname.trim().length < 2 && 'apellido',
    !isEmail(email) && 'tu correo',
    how === 'alias' && !proof && 'comprobante',
  ].filter(Boolean) as string[];
  const close = () => { onClose(); window.setTimeout(reset, 200); };
  const keepShopping = () => { onClose(); window.setTimeout(() => setView('cart'), 200); };
  const copy = async () => {
    try { if (alias) await navigator.clipboard.writeText(alias); } catch { /* sin portapapeles: el alias igual queda a la vista */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 2200);
  };
  // La clave de reintento se crea una vez por envío y se reutiliza si falla la red: el servidor no duplica el aporte.
  const attempt = useRef<{ key: string; token: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked || missing.length || items.length === 0 || sending) return;
    attempt.current ??= { key: crypto.randomUUID(), token: `${crypto.randomUUID()}${crypto.randomUUID()}` };
    setSending(true); setSendError(null);
    try {
      await onSent(items, { name: `${name.trim()} ${surname.trim()}`, message: message.trim(), how, email: email.trim().toLowerCase(), marketingOptIn: optIn }, { proof, attempt: attempt.current });
    } catch (err) {
      setSending(false);
      setSendError(err instanceof Error && err.message ? err.message : 'No pudimos enviar tu regalo. Revisá tu conexión y probá de nuevo.');
      return;
    }
    setSending(false);
    attempt.current = null;
    setSent({ first: name.trim().split(/\s+/)[0] ?? name.trim(), gifts: items });
  };
  const remove = (g: Gift) => { onRemove(g); if (items.length <= 1) { onClose(); window.setTimeout(() => setView('cart'), 200); } };
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className="rg-dialog" onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }} onCloseAutoFocus={e => { e.preventDefault(); returnFocus.current?.focus(); }}>
        {sent ? (
          <div className="rg-thanks">
            <span className="rg-check" aria-hidden="true"><Check size={22} strokeWidth={1.8} /></span>
            <DialogTitle>¡Gracias, {sent.first}!</DialogTitle>
            <DialogDescription>{remote ? <>Registramos {sent.gifts.length === 1 ? 'tu regalo' : `tus ${sent.gifts.length} regalos`}. Los novios van a revisar tu comprobante: figura como pendiente hasta que ellos lo confirmen.</> : <>Gracias por {sent.gifts.length === 1 ? 'tu regalo' : `tus ${sent.gifts.length} regalos`}.</>}</DialogDescription>
            <ul className="rg-sent">{sent.gifts.map(g => <li key={g.id}>{g.name}<span>{formatARS(g.amount)}</span></li>)}</ul>
            <button type="button" className="dm-solid" onClick={close}>Volver a la lista</button>
          </div>
        ) : view === 'cart' ? (
          <div className="rg-form rg-cart">
            <header className="rg-head">
              <div>
                <p className="rg-kicker">Regalo para {site.names}</p>
                <DialogTitle>Tu regalo</DialogTitle>
              </div>
            </header>
            <ul className="rg-cart-list">
              {items.map(g => (
                <li key={g.id} className="rg-cart-item">
                  <Thumb gift={g} />
                  <div className="rg-cart-info">
                    <strong>{g.name}</strong>
                    <span>{formatARS(g.amount)}</span>
                  </div>
                  <button type="button" className="rg-remove" onClick={() => remove(g)} aria-label={`Quitar ${g.name}`}><X size={14} aria-hidden="true" />Quitar</button>
                </li>
              ))}
            </ul>
            <p className="rg-total"><span>Total</span><strong>{formatARS(total)}</strong></p>
            <div className="rg-actions">
              <button type="button" className="dm-solid" onClick={() => setView('pay')} disabled={items.length === 0}>Continuar</button>
              <button type="button" className="dm-ghost" onClick={keepShopping}>Agregar otro regalo</button>
            </div>
          </div>
        ) : (
          <form onSubmit={e => { void submit(e); }} noValidate className="rg-form">
            <header className="rg-head">
              <div>
                <p className="rg-kicker">Regalo para {site.names}</p>
                <DialogTitle>Tu regalo</DialogTitle>
                <DialogDescription>Total {formatARS(total)}</DialogDescription>
              </div>
            </header>

            {site.acceptCard && <fieldset className="rg-field">
              <legend>¿Cómo querés pagar?</legend>
              <div className="rg-chips">
                {(['alias', 'tarjeta'] as const).map(v => (
                  <label key={v} className={`rg-chip${how === v ? ' on' : ''}`}>
                    <input type="radio" name="rg-how" value={v} checked={how === v} onChange={() => setHow(v)} />
                    <span>{v === 'alias' ? 'Alias' : 'Tarjeta'}</span>
                  </label>
                ))}
              </div>
            </fieldset>}

            {how === 'alias' || !site.acceptCard ? (
              <>
                <div className="rg-alias">
                  <code>{alias || 'Alias a definir'}</code>
                  {alias && (
                    <button type="button" onClick={copy} aria-label={copied ? 'Alias copiado' : 'Copiar alias'}>
                      {copied ? <><Check size={14} aria-hidden="true" />Copiado</> : <Copy size={15} aria-hidden="true" />}
                    </button>
                  )}
                </div>
                {(site.bank || site.cbu) && <dl className="rg-bank">{site.bank && <div><dt>Banco</dt><dd>{site.bank}</dd></div>}{site.cbu && <div><dt>CBU</dt><dd>{site.cbu}</dd></div>}</dl>}
                <p className="rg-help">{alias ? `Transferí ${formatARS(total)} a este alias y después cargá el comprobante.` : 'Los novios todavía no cargaron su alias. Cuando lo hagan, vas a verlo acá.'}</p>
              </>
            ) : (
              <p className="rg-note">El pago con tarjeta todavía no está disponible. Elegí «Alias» para continuar.</p>
            )}

            {!blocked && (
              <div className="rg-up">
                <p className="rg-up-label">Comprobante de transferencia</p>
                <input id="rg-proof" className="dm-sr" type="file" accept="image/*,application/pdf" onChange={e => setProof(e.target.files?.[0] ?? null)} />
                <label htmlFor="rg-proof" className={`rg-file${proof ? ' has' : ''}`}>
                  {proof ? <Check size={16} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
                  <span>{proof ? proof.name : 'Subir captura o PDF'}</span>
                  {proof && <em>Cambiar</em>}
                </label>
              </div>
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
              <label htmlFor="rg-email">Correo electrónico</label>
              <input id="rg-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} aria-describedby="rg-email-help" />
              <p className="rg-hint" id="rg-email-help">Para enviarte la constancia de tu regalo. Los novios también lo ven.</p>
            </div>

            <div className="rg-field">
              <label htmlFor="rg-message">Mensaje (opcional)</label>
              <textarea id="rg-message" rows={2} value={message} onChange={e => setMessage(e.target.value)} />
            </div>

            {/* Novedades de Weda: casilla aparte y destildada (consentimiento expreso; no es necesaria para regalar). */}
            <label className="rg-optin"><input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} /><span>{MARKETING_CONSENT_TEXT} <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a></span></label>

            {!blocked && remote && <p className="rg-help">Tu regalo queda informado a los novios; ellos revisan tu comprobante para confirmarlo. Weda no cobra ni mueve dinero.</p>}
            {sendError && <p className="dm-error" role="alert">{sendError}</p>}
            <button type="submit" className="dm-solid rg-send" disabled={blocked || missing.length > 0 || sending} aria-busy={sending}>{sending ? 'Enviando…' : sendError ? 'Reintentar' : 'Enviar'}</button>
            <button type="button" className="dm-ghost" onClick={() => setView('cart')}>Volver a mis regalos</button>
            {noAlias && <p className="rg-missing" aria-live="polite">Todavía no se puede enviar: los novios no cargaron su alias.</p>}
            {missing.length > 0 && <p className="rg-missing" aria-live="polite">Para enviar falta: {missing.join(', ')}.</p>}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function GiftsPage() {
  const rsvp = useRsvp();
  const site = useSite();
  const { given, recordGift } = useSiteActions();
  const gifts = site.gifts;
  const categories = site.giftCategories;
  const [filter, setFilter] = useState<Category | 'Todos'>('Todos');
  const [cart, setCart] = useState<Gift[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
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
  // Lista todavía vacía: un estado pensado para eso, sin buscador ni filtros ni «0 regalos».
  if (gifts.length === 0) return <>
    <SiteCover variant="gifts" next="#regalos" />
    <section className="ej-block ej-white rg-list" id="regalos"><div className="section-inner">
      <div className="rg-blank">
        <h2>Esta lista todavía se está armando</h2>
        <p>{site.names.replace(/\s*&\s*/, ' y ')} van a sumar sus regalos muy pronto. Mientras tanto, podés acompañarlos de otra manera.</p>
        <div className="rg-next">
          {site.blocks.rsvp && <Button variant="seed" onClick={rsvp.open}>Confirmar asistencia</Button>}
          {site.blocks.invitation && <Button variant="seedLink" asChild><Link to={site.homePath as never}><span>Volver al sitio</span><ArrowRight size={15} /></Link></Button>}
        </div>
      </div>
    </div></section>
  </>;
  return <>
    <SiteCover variant="gifts" next="#regalos" />

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
      <h2 className="dm-sr">Regalos</h2>
      <div className="rg-grid">
        {visible.map(g => <GiftCard key={g.id} gift={g} chosen={site.kind === 'demo' && chosen.includes(g.id)} inCart={cart.some(c => c.id === g.id)} onPick={g => { returnFocus.current = document.activeElement as HTMLElement | null; setCart(c => c.some(x => x.id === g.id) ? c : [...c, g]); setCartOpen(true); }} />)}
      </div>
      <p className="rg-live" aria-live="polite">{visible.length} {visible.length === 1 ? 'regalo' : 'regalos'}{filter === 'Todos' ? '' : ` en ${filter}`}{range === 'all' || range === 'asc' || range === 'desc' ? '' : ' en ese rango de monto'}</p>
      <div className="rg-next">
        <p>¿Ya elegiste? Falta un último paso.</p>
        {site.blocks.rsvp && <Button variant="seed" onClick={rsvp.open}>Confirmar asistencia</Button>}
        {site.blocks.invitation && <Button variant="seedLink" asChild><Link to={site.homePath as never}><span>Volver al sitio</span><ArrowRight size={15} /></Link></Button>}
      </div>
    </div></section>

    {cart.length > 0 && !cartOpen && (
      <div className="rg-cart-bar" role="region" aria-label="Tu regalo">
        <p><strong>{cart.length === 1 ? '1 regalo' : `${cart.length} regalos`}</strong><span>{formatARS(cart.reduce((n, g) => n + g.amount, 0))}</span></p>
        <button type="button" className="dm-solid" onClick={e => { returnFocus.current = e.currentTarget; setCartOpen(true); }}>Ver mi regalo</button>
      </div>
    )}

    <GiftDialog
      open={cartOpen}
      gifts={cart}
      onClose={() => setCartOpen(false)}
      onRemove={g => setCart(c => c.filter(x => x.id !== g.id))}
      onSent={async (gs, who, extra) => { await recordGift(gs, who, extra); setCart([]); }}
      returnFocus={returnFocus}
    />
  </>;
}
