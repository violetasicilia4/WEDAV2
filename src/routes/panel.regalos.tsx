import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Check, ChevronRight, ChevronUp, Copy, Eye, Gift as GiftIcon, GripVertical, ImagePlus, Package, Pencil, Plus, X } from 'lucide-react';
import { CoupleCover, Field, Locked, PreviewFrame, useToast } from '@/components/panel/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { catalog, categories, setGifts, SETS, type GiftSet } from '@/lib/weda/catalog';
import { formatARS, type Gift } from '@/lib/demo-wedding';
import { readImage } from '@/lib/weda/images';
import {
  addCatalogGift, addCustomGift, addSet, giftTotal, hasCatalogGift, moveGiftTo, norm, parseAmount, receivedGifts, receivedTotal, removeGift, removeSetGifts, sitePath, updateGift,
  validateAlias, validateGift,
} from '@/lib/weda/logic';
import { can } from '@/lib/weda/plans';
import { getState, update, useAppState } from '@/lib/weda/store';
import type { Category } from '@/lib/demo-wedding';
import type { ListGift } from '@/lib/weda/types';

/* Regalos de un pack: abiertos en pantallas anchas; en el celular quedan plegados para que cada pack no ocupe una pantalla entera. El panel solo se dibuja ya hidratado, así que mirar el ancho acá es seguro. */
function PackGifts({ gifts }: { gifts: { id: string; name: string; amount: number }[] }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 641px)').matches);
  return (
    <details className="rg-pack-more" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary>{open ? 'Regalos incluidos en este pack' : `Ver los ${gifts.length} regalos incluidos`}</summary>
      <ul className="rg-pack-list">{gifts.map(g => <li key={g.id}><span>{g.name}</span><b>{formatARS(g.amount)}</b></li>)}</ul>
    </details>
  );
}

export const Route = createFileRoute('/panel/regalos')({
  validateSearch: (q: Record<string, unknown>): { tab?: 'cobro' } => (q['tab'] === 'cobro' ? { tab: 'cobro' } : {}),
  component: GiftsModule,
});

type Tab = 'como' | 'lista' | 'agregar' | 'recibidos' | 'cobro';
/* Orden de la pantalla: cómo funciona → mis regalos → catálogo y packs → aportes recibidos → datos de cobro. Se puede entrar a cualquiera.
   En pantallas angostas se muestra la etiqueta corta para que las cinco solapas entren sin scroll lateral. */
const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'como', label: 'Cómo funciona', short: 'Guía' }, { id: 'lista', label: 'Mis regalos', short: 'Mis regalos' },
  { id: 'agregar', label: 'Catálogo y packs', short: 'Catálogo' }, { id: 'recibidos', label: 'Aportes recibidos', short: 'Aportes' },
  { id: 'cobro', label: 'Datos de cobro', short: 'Cobro' },
];

const Thumb = ({ src, name }: { src?: string | undefined; name: string }) => (
  <span className="pn-gthumb" aria-hidden="true">{src ? <img src={src} alt="" loading="lazy" /> : <GiftIcon size={30} strokeWidth={1.3} />}</span>
);

/* Formulario de un regalo (para crear uno propio y para editar cualquiera de la lista): foto, monto, nombre y categoría. */
type GiftValues = { name: string; amount: number; category: Category; image: string | undefined };
function GiftForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: ListGift | undefined; submitLabel: string; onSubmit: (v: GiftValues) => void; onCancel?: (() => void) | undefined }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Proyectos futuros');
  const [image, setImage] = useState<string | undefined>(initial?.image);
  const [errors, setErrors] = useState<ReturnType<typeof validateGift>>({});
  const [imgError, setImgError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateGift({ name, amount, text: '' });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ name: name.trim(), amount: parseAmount(amount), category, image });
  };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setImgError('');
    try { setImage((await readImage(f, 900)).src); }
    catch (e) { setImgError(e instanceof Error ? e.message : 'No pudimos cargar la foto.'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };
  return (
    <form onSubmit={submit} noValidate className="pn-form">
      <div className="pn-ownphoto">
        <input ref={fileRef} className="pn-sr" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Elegir una imagen del regalo" onChange={e => void pick(e.target.files?.[0])} />
        <button type="button" className="pn-ownphoto-btn" onClick={() => fileRef.current?.click()} aria-label={image ? 'Cambiar la imagen' : 'Subir una imagen'}>
          {image ? <img src={image} alt="" /> : <span><ImagePlus size={28} strokeWidth={1.3} aria-hidden="true" />Subir una imagen<small>Opcional</small></span>}
        </button>
        {image && <button type="button" className="pn-link is-muted" onClick={() => setImage(undefined)}>Quitar la imagen</button>}
        {imgError && <p className="pn-error" role="alert">{imgError}</p>}
      </div>
      <Field label="Monto en pesos" error={errors.amount}>
        {a => <input id={a.id} type="text" inputMode="numeric" value={amount} placeholder="180000" onChange={e => { setAmount(e.target.value); setErrors(x => ({ ...x, amount: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      <Field label="Nombre del regalo" error={errors.name}>{a => <input id={a.id} type="text" value={name} placeholder="Auriculares para nuestros viajes" onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
      <Field label="Categoría" optional>{a => <select id={a.id} value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>}</Field>
      <div className="pn-actions is-end">
        {onCancel && <button type="button" className="pn-btn is-ghost" onClick={onCancel}>Cancelar</button>}
        <button type="submit" className="pn-btn">{submitLabel}</button>
      </div>
    </form>
  );
}

/* Foto de cada set (de las imágenes que ya usa el catálogo). */
const SET_COVER: Record<string, string> = {
  'luna-de-miel': '/lm-santorini.webp', hogar: '/lista-de-regalos-lampara.jpg', experiencias: '/lm-globo.webp?v=2',
  proyectos: '/regalo-casa.jpg', 'primer-hogar': '/lista-de-regalos-olla.jpg', escapada: '/regalo-cena-mar.webp',
};

/* Foto cuadrada, nombre, monto y una sola acción. El estado «en tu lista» se marca con tilde sobre la foto y botón liviano. */
function CatalogCard({ gift, inList, onAdd, onRemove }: { gift: Gift; inList: boolean; onAdd: () => void; onRemove: () => void }) {
  return (
    <li className={`pn-gcard${inList ? ' is-in' : ''}`}>
      <div className="pn-gphoto">
        {gift.image ? <img src={gift.image} alt="" loading="lazy" style={gift.pos ? { objectPosition: gift.pos } : undefined} /> : <GiftIcon size={34} strokeWidth={1.3} aria-hidden="true" />}
        {inList && <span className="pn-gcheck" aria-hidden="true"><Check size={16} strokeWidth={2.5} /></span>}
      </div>
      <h3 title={gift.name}>{gift.name}</h3>
      <p className="pn-gprice">{formatARS(gift.amount)}</p>
      {inList
        ? <button type="button" className="pn-btn is-small is-white" onClick={onRemove} aria-label={`Quitar ${gift.name} de tu lista`}><Check size={15} aria-hidden="true" />Quitar</button>
        : <button type="button" className="pn-btn is-small" onClick={onAdd} aria-label={`Agregar ${gift.name} a tu lista`}><Plus size={15} aria-hidden="true" />Agregar</button>}
    </li>
  );
}

const HOW_LABEL = { alias: 'Por alias', tarjeta: 'Con tarjeta' } as const;
const fmtDate = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/* El alias se guarda solo apenas es válido; el error aparece al salir del campo. */
function AliasField({ value }: { value: string }) {
  const [v, setV] = useState(value);
  const [touched, setTouched] = useState(false);
  const err = v.trim() === '' ? undefined : validateAlias(v);
  const change = (next: string) => {
    setV(next);
    if (next.trim() === '' || !validateAlias(next)) update(x => ({ ...x, gifts: { ...x.gifts, alias: next.trim() } }));
  };
  return (
    <Field label="Tu alias bancario" error={touched ? err : undefined}>
      {a => <input id={a.id} type="text" value={v} placeholder="tomas.martina" onChange={e => change(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
    </Field>
  );
}

/* Ordenar arrastrando: se mantiene apretado el bloque (en el celular) o se arrastra con el mouse. También con Alt + flechas. */
function SortableGifts({ items, onMove, renderRow }: { items: ListGift[]; onMove: (id: string, to: number) => void; renderRow: (g: ListGift, dragging: boolean) => React.ReactNode }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const st = useRef<{ id: string; pointerId: number; startX: number; startY: number; grab: number; timer: number | null; active: boolean; touch: boolean; order: string[] } | null>(null);

  const shown = order ? order.map(id => items.find(g => g.id === id)).filter((g): g is ListGift => !!g) : items;

  const finish = (commit: boolean) => {
    const cur = st.current;
    if (cur?.timer) window.clearTimeout(cur.timer);
    if (cur?.active && commit) { const to = cur.order.indexOf(cur.id); onMove(cur.id, to); }
    st.current = null; setDrag(null); setOrder(null);
  };

  const begin = (id: string) => {
    const cur = st.current; if (!cur) return;
    cur.active = true; cur.order = items.map(g => g.id);
    setOrder(cur.order); setDrag({ id, dy: 0 });
    try { (listRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null)?.setPointerCapture(cur.pointerId); } catch { /* sin captura */ }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLLIElement>, id: string) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const li = e.currentTarget;
    const touch = e.pointerType !== 'mouse';
    st.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, grab: e.clientY - li.getBoundingClientRect().top, timer: null, active: false, touch, order: items.map(g => g.id) };
    if (touch) st.current.timer = window.setTimeout(() => begin(id), 280);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    const cur = st.current; if (!cur || cur.pointerId !== e.pointerId) return;
    if (!cur.active) {
      const moved = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      if (cur.touch) { if (moved > 8 && cur.timer) { window.clearTimeout(cur.timer); st.current = null; } return; }
      if (moved > 5) begin(cur.id); else return;
    }
    const list = listRef.current; if (!list) return;
    const li = list.querySelector(`[data-id="${cur.id}"]`) as HTMLElement | null; if (!li) return;
    const listTop = list.getBoundingClientRect().top;
    const y = e.clientY - listTop - cur.grab;
    setDrag({ id: cur.id, dy: y - li.offsetTop });
    const center = y + li.offsetHeight / 2;
    const rows = [...list.children] as HTMLElement[];
    let target = cur.order.indexOf(cur.id);
    rows.forEach((r, idx) => { if (r === li) return; const mid = r.offsetTop + r.offsetHeight / 2; if (idx < target && center < mid) target = idx; else if (idx > target && center > mid) target = idx; });
    const from = cur.order.indexOf(cur.id);
    if (target !== from) { const next = [...cur.order]; next.splice(from, 1); next.splice(target, 0, cur.id); cur.order = next; setOrder(next); }
  };
  // Mientras se arrastra con el dedo no tiene que scrollear la página.
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const stop = (e: TouchEvent) => { if (st.current?.active) e.preventDefault(); };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => el.removeEventListener('touchmove', stop);
  }, []);

  return (
    <>
    <p id="pn-sort-help" className="pn-sr">Para cambiar el orden con el teclado, mantené Alt y usá las flechas hacia arriba o abajo.</p>
    <ol ref={listRef} className={`pn-glist pn-sortable${drag ? ' is-dragging' : ''}`} aria-label="Regalos de tu lista (podés ordenarlos arrastrando)">
      {shown.map(g => {
        const dragging = drag?.id === g.id;
        return (
          <li key={g.id} data-id={g.id} className={`pn-grow${dragging ? ' is-drag' : ''}`} style={dragging ? { transform: `translateY(${drag!.dy}px)` } : undefined} tabIndex={0}
            aria-roledescription="elemento ordenable" aria-describedby="pn-sort-help"
            onPointerDown={e => onPointerDown(e, g.id)} onPointerMove={onPointerMove} onPointerUp={() => finish(true)} onPointerCancel={() => finish(false)} onContextMenu={e => { if (st.current?.touch) e.preventDefault(); }}
            onKeyDown={e => { if (!e.altKey) return; const i = items.findIndex(x => x.id === g.id); if (e.key === 'ArrowUp') { e.preventDefault(); onMove(g.id, i - 1); } if (e.key === 'ArrowDown') { e.preventDefault(); onMove(g.id, i + 1); } }}>
            {renderRow(g, dragging)}
          </li>
        );
      })}
    </ol>
    </>
  );
}

/* Resumen de la selección: panel lateral en desktop y barra inferior en el celular. Siempre a mano mientras se explora el catálogo. */
function SelectionSummary({ items, onRemove, onReview }: { items: ListGift[]; onRemove: (g: ListGift) => void; onReview: () => void }) {
  const [open, setOpen] = useState(false);
  const total = giftTotal(items);
  const body = items.length === 0
    ? <p className="pn-muted">Todavía no elegiste ningún regalo. Tocá un set o «Agregar» en cada regalo.</p>
    : <ul className="pn-sel-list">{items.map(g => (
        <li key={g.id}><Thumb src={g.image} name={g.name} /><span><strong>{g.name}</strong><small>{formatARS(g.amount)}</small></span><button type="button" className="pn-icon" onClick={() => onRemove(g)} aria-label={`Quitar ${g.name}`}><X size={16} aria-hidden="true" /></button></li>
      ))}</ul>;
  return (
    <>
      <aside className="pn-sel" aria-label="Resumen de tu selección">
        <h2>Tu selección</h2>
        <p className="pn-sel-count" role="status" aria-live="polite"><strong>{items.length}</strong> {items.length === 1 ? 'regalo elegido' : 'regalos elegidos'}{items.length > 0 && <> · {formatARS(total)}</>}</p>
        {body}
        <button type="button" className="pn-btn is-ghost" onClick={onReview} disabled={items.length === 0}>Revisar mi lista</button>
      </aside>
      <div className="pn-selbar">
        <button type="button" className="pn-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <span className="pn-selbar-text"><GiftIcon size={18} aria-hidden="true" />{items.length} {items.length === 1 ? 'regalo elegido' : 'regalos elegidos'}{items.length > 0 && <> · {formatARS(total)}</>}</span>
          <span className="pn-selbar-go">Ver<ChevronUp size={16} aria-hidden="true" /></span>
        </button>
      </div>
      {open && (
        <Dialog open onOpenChange={o => { if (!o) setOpen(false); }}>
          <DialogContent className="pn-dialog">
            <DialogTitle>Tu selección</DialogTitle>
            <DialogDescription>{items.length === 0 ? 'Todavía no elegiste regalos.' : `${items.length} ${items.length === 1 ? 'regalo' : 'regalos'} · ${formatARS(total)}`}</DialogDescription>
            {body}
            <div className="pn-actions is-end">
              <button type="button" className="pn-btn is-ghost" onClick={() => setOpen(false)}>Seguir eligiendo</button>
              <button type="button" className="pn-btn" onClick={() => { setOpen(false); onReview(); }} disabled={items.length === 0}>Revisar mi lista</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function GiftsModule() {
  const s = useAppState();
  const toast = useToast();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(() => search.tab ?? 'como');
  const [catView, setCatView] = useState<'packs' | 'singles'>('packs');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ListGift | null>(null);
  const [preview, setPreview] = useState(false);
  // El botón de la barra superior (panel.tsx) pide abrir la vista previa de la lista.
  useEffect(() => {
    const open = () => setPreview(true);
    window.addEventListener('weda:open-gifts-preview', open);
    return () => window.removeEventListener('weda:open-gifts-preview', open);
  }, []);
  const [listView, setListView] = useState<'cards' | 'order'>('cards');
  const [showPage, setShowPage] = useState(false);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string>('Todas');

  if (!can(s.planId, 'gifts')) return <Locked feature="gifts" />;
  const items = s.gifts.items;
  const received = receivedGifts(s);

  // Cada cambio guarda la lista anterior para poder deshacer desde el aviso.
  const withUndo = (message: string, change: () => void) => {
    const before = s.gifts.items;
    change();
    toast(message, 'ok', { label: 'Deshacer', onClick: () => update(x => ({ ...x, gifts: { ...x.gifts, items: before } })) });
  };
  const doAddSet = (set: GiftSet) => {
    const r = addSet(s, set);
    if (r.added === 0) { toast('Esos regalos ya estaban en tu lista.'); return; }
    const before = s.gifts.items;
    update(() => r.state);
    toast(`Agregaste ${r.added} ${r.added === 1 ? 'regalo' : 'regalos'}${r.skipped ? ` (${r.skipped} ya estaban)` : ''}.`, 'ok', { label: 'Deshacer', onClick: () => update(x => ({ ...x, gifts: { ...x.gifts, items: before } })) });
  };
  const rm = (g: ListGift) => withUndo(`Quitaste «${g.name}».`, () => update(x => removeGift(x, g.id)));
  const addOne = (id: string, from?: string) => { const r = addCatalogGift(s, id, from); if (r.added) { update(() => r.state); toast('Agregado a tu lista.'); } };
  const rmCatalog = (catalogId: string) => { const g = items.find(x => x.catalogId === catalogId); if (g) rm(g); };


  const shownCatalog = catalog.filter(g => (cat === 'Todas' || g.category === cat) && (!query.trim() || norm(g.name).includes(norm(query))));
  const alias = s.gifts.alias.trim();
  const copyLink = () => { void navigator.clipboard?.writeText(`${window.location.origin}${sitePath(s)}/regalos`).catch(() => undefined); toast('Enlace de la lista copiado.'); };

  return (
    <div className="pn-page">
      <CoupleCover variant="gifts" eyebrow="Lista de regalos de" />
      <header className="pn-page-head is-compact rg-head">
        <div>
          <h1>Lista de regalos</h1>
          <p className="pn-sub" role="status" aria-live="polite">Tus invitados eligen un regalo de tu lista y te lo regalan por alias.</p>
        </div>
        <div className="rg-head-actions">
          <button type="button" className="pn-btn is-ghost" onClick={copyLink}><Copy size={16} aria-hidden="true" />Copiar enlace de lista</button>
          <button type="button" className="pn-btn" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Crear regalo</button>
        </div>
      </header>

      <div className="pn-tabs" role="tablist" aria-label="Lista de regalos">
        {TABS.map((t, i) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="pn-tabpanel" tabIndex={tab === t.id ? 0 : -1} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}
            onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); setTab(TABS[(i + 1) % TABS.length]!.id); } if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(TABS[(i + TABS.length - 1) % TABS.length]!.id); } }}>
            <span className="pn-tab-long">{i + 1}. {t.label}</span><span className="pn-tab-short">{t.short}</span>
            {t.id === 'lista' && items.length > 0 && <span className="pn-count">{items.length}</span>}
            {t.id === 'cobro' && !alias && <><span className="pn-dot-todo" aria-hidden="true" /><span className="pn-sr">(pendiente, opcional por ahora)</span></>}
            {t.id === 'recibidos' && received.length > 0 && <span className="pn-count">{received.length}</span>}
          </button>
        ))}
      </div>

      <div id="pn-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pn-tabpanel">
        {tab === 'como' && (
          <div className="rg-how">
            <section className="rg-kpis" aria-label="Resumen de tu lista">
              <div className="rg-kpi"><span>Total recibido</span><strong>{formatARS(receivedTotal(received))}</strong><small>Registrado en este navegador</small></div>
              <div className="rg-kpi"><span>Aportes recibidos</span><strong>{received.length}</strong><small>{received.length === 0 ? 'Todavía no hay aportes' : 'Los ves en «Aportes recibidos»'}</small></div>
              <div className="rg-kpi"><span>Regalos en lista</span><strong>{items.length}</strong><small>Activos para aportes</small></div>
            </section>
            <p className="rg-eyebrow">Pasos del funcionamiento</p>
            <ol className="rg-steps">
              {[
                { done: items.length > 0, title: 'Elegí o creá los regalos de tu lista', text: items.length > 0 ? `Tenés ${items.length} ${items.length === 1 ? 'regalo' : 'regalos'} en tu lista. Podés sumar packs completos o armar regalos individuales.` : 'Sumá un pack completo o elegí regalos de a uno. También podés crear los tuyos.', cta: items.length > 0 ? `Ver mis regalos (${items.length})` : 'Elegir regalos', go: () => setTab(items.length > 0 ? 'lista' : 'agregar') },
                { done: !!alias, title: 'Sumá tu alias', text: alias ? `Alias cargado (${alias}). Tus invitados ven a dónde mandar su aporte.` : 'Cargá el alias donde querés recibir los aportes de tus invitados.', cta: alias ? 'Ver datos de cobro' : 'Cargar alias', go: () => setTab('cobro') },
                { done: false, title: 'Compartí el enlace de tu lista', text: 'Tus invitados entran desde el celular, eligen un regalo y te lo regalan. Hoy es una demo: el enlace real se activa al publicar.', cta: 'Copiar enlace', go: copyLink },
                { done: received.length > 0, title: 'Recibí los aportes y agradecé', text: received.length > 0 ? 'Revisá quién te regaló qué y con qué mensaje, para agradecerles.' : 'Cuando un invitado te regale algo, lo ves acá con su nombre y su mensaje.', cta: received.length > 0 ? `${received.length} ${received.length === 1 ? 'aporte' : 'aportes'}` : 'Ver aportes', go: () => setTab('recibidos') },
              ].map(st => (
                <li key={st.title} className={`rg-step${st.done ? ' is-done' : ''}`}>
                  <span className="rg-step-ico" aria-hidden="true">{st.done ? <Check size={18} strokeWidth={2} /> : <GiftIcon size={18} strokeWidth={1.5} />}</span>
                  <div className="rg-step-text"><h3>{st.title}{st.done && <span className="pn-chip is-ok">Listo</span>}</h3><p>{st.text}</p></div>
                  <button type="button" className="pn-btn is-ghost is-small" onClick={st.go}>{st.cta}<ChevronRight size={15} aria-hidden="true" /></button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === 'lista' && (
          items.length === 0 ? (
            <div className="pn-empty">
              <h2>Armá tu lista en un minuto</h2>
              <p>Sumá un set completo de regalos y después sacá los que no quieras. También podés elegir de a uno o crear uno propio.</p>
              <div className="pn-actions"><button type="button" className="pn-btn" onClick={() => setTab('agregar')}>Agregar regalos</button><button type="button" className="pn-btn is-ghost" onClick={() => setCreating(true)}>Crear un regalo propio</button></div>
            </div>
          ) : (
            <>
              <div className="rg-section-head">
                <div><h2>Mis regalos ({items.length})</h2><p className="pn-muted">Podés reordenar los regalos con las flechas, modificarlos o sumar más desde el catálogo.</p></div>
                <div className="rg-head-actions">
                  <div className="pn-switch is-small pn-views" role="group" aria-label="Cómo ver tu lista">
                    <button type="button" className={listView === 'cards' ? 'on' : ''} aria-pressed={listView === 'cards'} onClick={() => setListView('cards')}>Tarjetas</button>
                    <button type="button" className={listView === 'order' ? 'on' : ''} aria-pressed={listView === 'order'} onClick={() => setListView('order')}>Ordenar</button>
                  </div>
                  <button type="button" className="pn-btn is-ghost" onClick={() => { setCatView('packs'); setTab('agregar'); }}><Package size={16} aria-hidden="true" />Explorar packs sugeridos</button>
                </div>
              </div>
              {listView === 'cards' ? (
                <ul className="rg-grid" aria-label="Regalos de tu lista">
                  {items.map((g, i) => (
                    <li key={g.id} className="rg-card">
                      <div className="rg-photo">
                        {g.image ? <img src={g.image} alt="" loading="lazy" style={g.pos ? { objectPosition: g.pos } : undefined} /> : <GiftIcon size={34} strokeWidth={1.3} aria-hidden="true" />}
                        <span className="rg-chip">{g.category}</span>
                        <div className="rg-arrows">
                          <button type="button" className="pn-icon" onClick={() => update(x => moveGiftTo(x, g.id, i - 1))} disabled={i === 0} aria-label={`Subir ${g.name}`}><ArrowUp size={16} aria-hidden="true" /></button>
                          <button type="button" className="pn-icon" onClick={() => update(x => moveGiftTo(x, g.id, i + 1))} disabled={i === items.length - 1} aria-label={`Bajar ${g.name}`}><ArrowDown size={16} aria-hidden="true" /></button>
                        </div>
                      </div>
                      <div className="rg-body">
                        <h3>{g.name}</h3>
                        {g.text && <p className="rg-text">{g.text}</p>}
                        <div className="rg-foot">
                          <div><span className="rg-label">Valor sugerido</span><strong>{formatARS(g.amount)}</strong></div>
                          <div className="rg-actions">
                            <button type="button" className="pn-icon" onClick={() => setEditing(g)} aria-label={`Editar ${g.name}`}><Pencil size={16} aria-hidden="true" /></button>
                            <button type="button" className="pn-icon" onClick={() => rm(g)} aria-label={`Quitar ${g.name}`}><X size={16} aria-hidden="true" /></button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <SortableGifts items={items} onMove={(id, to) => update(x => moveGiftTo(x, id, to))} renderRow={g => (
                    <>
                      <Thumb src={g.image} name={g.name} />
                      <div className="pn-gmeta">
                        <strong>{g.name}</strong>
                        <span>{formatARS(g.amount)} · {g.category}</span>
                      </div>
                      <div className="pn-gactions">
                        <GripVertical size={18} className="pn-grip" aria-hidden="true" />
                        <button type="button" className="pn-icon" onClick={() => setEditing(g)} aria-label={`Editar ${g.name}`}><Pencil size={16} aria-hidden="true" /></button>
                        <button type="button" className="pn-icon" onClick={() => rm(g)} aria-label={`Quitar ${g.name}`}><X size={16} aria-hidden="true" /></button>
                      </div>
                    </>
                  )} />
                  <p className="pn-hint">Para ordenar, mantené apretado un regalo y movelo.</p>
                </>
              )}
              <section className="pn-page-view" aria-labelledby="pn-pv-title">
                <h2 id="pn-pv-title" className="pn-sr">Página de regalos</h2>
                <button type="button" className="pn-btn" aria-expanded={showPage} aria-controls="pn-pv-frame" onClick={() => setShowPage(v => !v)}><Eye size={16} aria-hidden="true" />{showPage ? 'Ocultar la página de regalos' : 'Ver cómo la ven tus invitados'}</button>
                {showPage && (
                  <div id="pn-pv-frame" className="pn-pv-frame">
                    <p className="pn-muted">Es la página de regalos con tus datos y se actualiza sola. Todavía no está publicada.</p>
                    <PreviewFrame path={`${sitePath(s)}/regalos`} device="mobile" />
                  </div>
                )}
              </section>
            </>
          )
        )}

        {tab === 'agregar' && (
          <div className="rg-catalog">
            <div className="rg-section-head">
              <div><h2>Catálogo sugerido y packs</h2><p className="pn-muted">Elegí packs curados completos o agregá regalos individuales a tu lista.</p></div>
              <div className="pn-switch is-small" role="group" aria-label="Qué querés ver">
                <button type="button" className={catView === 'packs' ? 'on' : ''} aria-pressed={catView === 'packs'} onClick={() => setCatView('packs')}>Packs armados ({SETS.length})</button>
                <button type="button" className={catView === 'singles' ? 'on' : ''} aria-pressed={catView === 'singles'} onClick={() => setCatView('singles')}>Regalos individuales</button>
              </div>
            </div>

            {catView === 'packs' ? (
              <ul className="rg-packs" aria-label="Packs de regalos">
                {SETS.map(set => {
                  const gs = setGifts(set);
                  const inList = gs.filter(g => hasCatalogGift(s, g.id)).length;
                  const all = inList === gs.length;
                  const total = gs.reduce((n, g) => n + g.amount, 0);
                  const cover = SET_COVER[set.id];
                  const toggle = () => (all ? withUndo(`Quitaste los regalos de «${set.name}».`, () => update(x => removeSetGifts(x, set.giftIds))) : doAddSet(set));
                  return (
                    <li key={set.id} className={`rg-pack${all ? ' is-on' : ''}`}>
                      <div className="rg-pack-cover" style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                        {all && <span className="rg-chip"><Check size={13} strokeWidth={2.5} aria-hidden="true" />En tu lista</span>}
                        <div><small>{gs.length} regalos</small><h3>{set.name}</h3></div>
                      </div>
                      <div className="rg-pack-body">
                        <p className="rg-text">{set.description}</p>
                        <PackGifts gifts={gs} />
                        <div className="rg-foot">
                          <div><span className="rg-label">Total sugerido</span><strong>{formatARS(total)}</strong></div>
                          <button type="button" className={`pn-btn${all ? ' is-ghost' : ''}`} onClick={toggle}>{all ? 'Quitar pack' : <><Plus size={15} aria-hidden="true" />Agregar pack ({gs.length} regalos)</>}</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="pn-pick">
                <div className="pn-catalog">
                  <div className="pn-filters is-chips">
                    <label className="pn-sr" htmlFor="pn-q">Buscar un regalo</label>
                    <input id="pn-q" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar un regalo" autoComplete="off" />
                    <div className="pn-chips" role="group" aria-label="Categoría">
                      {['Todas', ...categories].map(c => <button key={c} type="button" className={`pn-chipbtn${cat === c ? ' on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
                    </div>
                  </div>
                  <ul className="pn-ggrid">
                    <li className="pn-gown">
                      <button type="button" onClick={() => setCreating(true)}>
                        <span className="pn-owndot" aria-hidden="true"><Plus size={28} strokeWidth={1.6} /></span>
                        <strong>Crear un regalo propio</strong>
                        <span>Con tu nombre, tu monto y tu imagen</span>
                      </button>
                    </li>
                    {shownCatalog.map(g => <CatalogCard key={g.id} gift={g} inList={hasCatalogGift(s, g.id)} onAdd={() => addOne(g.id)} onRemove={() => rmCatalog(g.id)} />)}
                  </ul>
                  {shownCatalog.length === 0 && <p className="pn-note">No encontramos regalos con esa búsqueda.</p>}
                  <p className="pn-status-line" aria-live="polite" role="status">{shownCatalog.length} {shownCatalog.length === 1 ? 'regalo' : 'regalos'}</p>
                </div>
                <SelectionSummary items={items} onRemove={rm} onReview={() => setTab('lista')} />
              </div>
            )}
          </div>
        )}

        {tab === 'recibidos' && (
          received.length === 0 ? (
            <div className="pn-empty">
              <h2>Todavía no recibiste regalos</h2>
              <p>Cuando un invitado regale desde la página de tu lista, lo vas a ver acá con su nombre, el monto y su mensaje. Para probarlo, regalá algo desde la vista de invitado.</p>
              <div className="pn-actions"><button type="button" className="pn-btn" onClick={() => setPreview(true)}><Eye size={16} aria-hidden="true" />Ver la lista como invitado</button></div>
            </div>
          ) : (
            <>
              <div className="rg-section-head">
                <div><h2>Aportes recibidos ({received.length})</h2><p className="pn-muted">Quién te regaló qué, con su mensaje.</p></div>
                <span className="rg-total">Total: {formatARS(receivedTotal(received))}</span>
              </div>
              <ul className="rg-recs" aria-label="Aportes recibidos">
                {received.map(r => (
                  <li key={r.id} className="rg-rec">
                    <div className="rg-rec-main">
                      <p className="rg-rec-name">{r.giver}{r.how && <span className="pn-chip">{HOW_LABEL[r.how]}</span>}</p>
                      <p className="rg-rec-gift">Regaló: <b>{r.giftName}</b>{r.at ? ` · ${fmtDate(r.at)}` : ''}</p>
                      {r.message && <p className="rg-quote">«{r.message}»</p>}
                    </div>
                    <strong className="rg-rec-amount">{formatARS(r.amount)}</strong>
                  </li>
                ))}
              </ul>
              <p className="pn-hint">En esta demo los regalos se registran en este navegador cuando se hacen desde la vista de invitado. No hay verificación de pagos.</p>
            </>
          )
        )}

        {tab === 'cobro' && (
          <div className="pn-config">
            <div className="pn-block-head">
              <h2>Datos para recibir tus regalos</h2>
              <p className="pn-muted">Acá configurás cómo recibís vos los aportes. No es obligatorio para seguir armando tu casamiento, pero para activar los regalos reales al publicar vas a necesitar completarlo.</p>
              <p className="pn-muted" role="status">{alias ? 'Estado: configurado.' : 'Estado: sin configurar. Podés dejarlo para después.'}</p>
            </div>
            <section className="pn-cfg-block" aria-labelledby="cfg-alias">
              <div className="pn-cfg-head"><h2 id="cfg-alias">Alias bancario</h2><span className={`pn-chip${alias ? ' is-ok' : ' is-todo'}`}>{alias ? 'Configurado' : 'Sin configurar'}</span></div>
              <AliasField value={s.gifts.alias} />
              <div className="pn-cfg-review">
                <p className="pn-label">Así lo ven tus invitados</p>
                <div className="pn-alias-card">
                  <span className="pn-alias-kind">Transferencia por alias</span>
                  <code>{alias || 'Alias a definir'}</code>
                  {alias && <button type="button" className="pn-icon" aria-label="Copiar el alias" onClick={() => { void navigator.clipboard?.writeText(alias).catch(() => undefined); toast('Alias copiado.'); }}><Copy size={16} aria-hidden="true" /></button>}
                </div>
              </div>
            </section>
            <section className="pn-cfg-block is-soon" aria-labelledby="cfg-mp">
              <div className="pn-cfg-head"><h2 id="cfg-mp">Mercado Pago</h2><span className="pn-chip">Próximamente</span></div>
              <p className="pn-muted">Vas a poder conectar tu cuenta de Mercado Pago para recibir los aportes ahí. Todavía no está disponible.</p>
              <label className="pn-check"><input type="checkbox" checked={s.gifts.acceptCard} onChange={e => update(x => ({ ...x, gifts: { ...x.gifts, acceptCard: e.target.checked } }))} /><span>Mostrar también la opción de pagar con tarjeta</span></label>
              <p className="pn-hint">Es solo tu preferencia: el cobro con tarjeta se habilita cuando conectemos un servicio de pagos.</p>
            </section>
          </div>
        )}
      </div>

      {creating && (
        <Dialog open onOpenChange={o => { if (!o) setCreating(false); }}>
          <DialogContent className="pn-dialog">
            <DialogTitle>Crear un regalo propio</DialogTitle>
            <DialogDescription>Una foto, el monto y el nombre alcanzan.</DialogDescription>
            <GiftForm submitLabel="Agregar a mi lista" onCancel={() => setCreating(false)} onSubmit={v => { update(x => addCustomGift(x, v)); setCreating(false); setTab('lista'); toast('Regalo agregado a tu lista.'); }} />
          </DialogContent>
        </Dialog>
      )}

      {editing && (
        <Dialog open onOpenChange={o => { if (!o) setEditing(null); }}>
          <DialogContent className="pn-dialog">
            <DialogTitle>Editar regalo</DialogTitle>
            <DialogDescription>Los cambios se ven al instante en la vista previa.</DialogDescription>
            <div className="pn-form">
              <GiftForm initial={editing} submitLabel="Guardar" onCancel={() => setEditing(null)} onSubmit={v => { update(x => updateGift(x, editing.id, { name: v.name, amount: v.amount, category: v.category, image: v.image })); setEditing(null); toast('Regalo actualizado.'); }} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="pn-dialog is-preview">
          <DialogTitle>Así la ven tus invitados</DialogTitle>
          <DialogDescription>Es la misma página que /ejemplo/regalos, con tus datos. Se actualiza sola.</DialogDescription>
          <PreviewFrame path={`${sitePath(s)}/regalos`} device="mobile" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
