import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Check, ChevronRight, Copy, Eye, Gift as GiftIcon, GripVertical, ImagePlus, Package, Pencil, Plus, X } from 'lucide-react';
import { Field, Locked, useToast } from '@/components/panel/ui';
import { centerChild, useScrollFade } from '@/components/panel/scroll-row';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { catalog, categories, setGifts, SETS, type GiftSet } from '@/lib/weda/catalog';
import { formatARS, type Gift } from '@/lib/demo-wedding';
import { readImage } from '@/lib/weda/images';
import {
  addCatalogGift, addCustomGift, addSet, hasCatalogGift, moveGiftTo, parseAmount, receivedGifts, receivedTotal, removeGift, removeSetGifts, sitePath, updateGift,
  cleanCbu, validateAlias, validateCbu, validateGift,
} from '@/lib/weda/logic';
import { can } from '@/lib/weda/plans';
import { openPreview } from '@/lib/weda/preview-event';
import { update, useAppState } from '@/lib/weda/store';
import type { Category } from '@/lib/demo-wedding';
import type { ListGift } from '@/lib/weda/types';

export const Route = createFileRoute('/panel/regalos')({
  validateSearch: (q: Record<string, unknown>): { tab?: 'cobro' } => (q['tab'] === 'cobro' ? { tab: 'cobro' } : {}),
  component: GiftsModule,
});

type Tab = 'lista' | 'agregar' | 'recibidos' | 'cobro';
/* Cuatro solapas, sin numerar (no son pasos obligatorios): mi lista · catálogo y packs · aportes recibidos · datos de cobro. Se entra siempre a «Mis regalos»:
   si está vacía, su estado vacío lleva al catálogo. «Cómo funciona» dejó de ser una solapa: es un desplegable al pie de «Mis regalos» y un aviso del paso que falta. */
const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'lista', label: 'Mis regalos', short: 'Mis regalos' },
  { id: 'agregar', label: 'Catálogo y packs', short: 'Catálogo' }, { id: 'recibidos', label: 'Aportes recibidos', short: 'Aportes' },
  { id: 'cobro', label: 'Datos de cobro', short: 'Cobro' },
];

const Thumb = ({ src }: { src?: string | undefined }) => (
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
        <span className="rg-price">{formatARS(gift.amount)}</span>
        {inList && <span className="pn-gcheck" aria-hidden="true"><Check size={16} strokeWidth={2.5} /></span>}
      </div>
      <h3 title={gift.name}>{gift.name}</h3>
      {inList
        ? <button type="button" className="pn-btn is-small is-white" onClick={onRemove} aria-label={`Quitar ${gift.name} de tu lista`}><Check size={15} aria-hidden="true" />Quitar</button>
        : <button type="button" className="pn-btn is-small" onClick={onAdd} aria-label={`Agregar ${gift.name} a tu lista`}><Plus size={15} aria-hidden="true" />Agregar</button>}
    </li>
  );
}

const HOW_LABEL = { alias: 'Por alias', tarjeta: 'Con tarjeta' } as const;
const fmtDate = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/* Transferencia bancaria: banco, CBU y alias. Cada dato se guarda solo apenas es válido; el error aparece al salir del campo. Los tres son opcionales (el alias alcanza para cobrar); si se cargan, los invitados los ven al transferir. */
function BankFields({ bank, cbu, alias }: { bank: string; cbu: string; alias: string }) {
  const [b, setB] = useState(bank);
  const [c, setC] = useState(cbu);
  const [al, setAl] = useState(alias);
  const [touched, setTouched] = useState<{ cbu?: boolean; alias?: boolean }>({});
  const cbuErr = c.trim() === '' ? undefined : validateCbu(c);
  const aliasErr = al.trim() === '' ? undefined : validateAlias(al);
  const save = (patch: Partial<{ bank: string; cbu: string; alias: string }>) => update(x => ({ ...x, gifts: { ...x.gifts, ...patch } }));
  return (
    <div className="pn-form">
      <Field label="Banco" optional>
        {a => <input id={a.id} type="text" value={b} placeholder="Nombre del banco" autoComplete="off" onChange={e => { setB(e.target.value); save({ bank: e.target.value.trim() }); }} />}
      </Field>
      <Field label="CBU" optional error={touched.cbu ? cbuErr : undefined}>
        {a => <input id={a.id} type="text" inputMode="numeric" value={c} placeholder="22 números" autoComplete="off" onChange={e => { setC(e.target.value); if (e.target.value.trim() === '' || !validateCbu(e.target.value)) save({ cbu: cleanCbu(e.target.value) }); }} onBlur={() => setTouched(t => ({ ...t, cbu: true }))} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      <Field label="Alias" error={touched.alias ? aliasErr : undefined}>
        {a => <input id={a.id} type="text" value={al} placeholder="tomas.martina" autoComplete="off" onChange={e => { setAl(e.target.value); if (e.target.value.trim() === '' || !validateAlias(e.target.value)) save({ alias: e.target.value.trim() }); }} onBlur={() => setTouched(t => ({ ...t, alias: true }))} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
    </div>
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

function GiftsModule() {
  const s = useAppState();
  const toast = useToast();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(() => search.tab ?? 'lista');
  const tabsRef = useScrollFade<HTMLDivElement>();
  // Al cambiar de pestaña (o entrar directo a una), la activa se centra: con 5 pestañas en una pantalla angosta, las de los extremos quedan fuera de vista.
  useEffect(() => { centerChild(tabsRef.current, tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')); }, [tab, tabsRef]);
  const [catView, setCatView] = useState<'packs' | 'singles'>('packs');
  const [packOpen, setPackOpen] = useState<GiftSet | null>(null);
  const [creating, setCreating] = useState(false);
  const [cfg, setCfg] = useState<'bank' | 'mp' | null>(null);
  const [editing, setEditing] = useState<ListGift | null>(null);
  // El botón de la barra superior (panel.tsx) pide abrir la vista previa de la lista.
  const [listView, setListView] = useState<'cards' | 'order'>('cards');

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


  const alias = s.gifts.alias.trim();
  const copyLink = () => { void navigator.clipboard?.writeText(`${window.location.origin}${sitePath(s)}/regalos`).catch(() => undefined); toast('Enlace de la lista copiado.'); };

  return (
    <div className="pn-page">
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

      <div className="pn-tabs pn-fade" role="tablist" aria-label="Lista de regalos" ref={tabsRef}>
        {TABS.map((t, i) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="pn-tabpanel" tabIndex={tab === t.id ? 0 : -1} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}
            onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); setTab(TABS[(i + 1) % TABS.length]!.id); } if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(TABS[(i + TABS.length - 1) % TABS.length]!.id); } }}>
            <span className="pn-tab-long">{t.label}</span><span className="pn-tab-short">{t.short}</span>
            {t.id === 'lista' && items.length > 0 && <span className="pn-count">{items.length}</span>}
            {t.id === 'cobro' && !alias && <><span className="pn-dot-todo" aria-hidden="true" /><span className="pn-sr">(pendiente, opcional por ahora)</span></>}
            {t.id === 'recibidos' && received.length > 0 && <span className="pn-count">{received.length}</span>}
          </button>
        ))}
      </div>

      <div id="pn-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pn-tabpanel">
        {tab === 'lista' && (
          <>
          {items.length > 0 && !alias && (
            <div className="rg-setup" role="status">
              <div><strong>Falta un paso para recibir aportes</strong><p>Cargá tu alias: es lo que tus invitados ven para saber a dónde mandar su regalo.</p></div>
              <button type="button" className="pn-btn" onClick={() => setTab('cobro')}>Cargar alias<ChevronRight size={15} aria-hidden="true" /></button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="pn-empty is-centered">
              <span className="pn-empty-ico" aria-hidden="true"><GiftIcon size={22} strokeWidth={1.6} /></span>
              <h2>Todavía no hay regalos en tu lista</h2>
              <p>Agregá de nuestro catálogo un montón de regalos o creá tus propios regalos para tu lista.</p>
              <div className="pn-actions is-center"><button type="button" className="pn-btn" onClick={() => setTab('agregar')}>Agregar del catálogo</button><button type="button" className="pn-btn is-ghost" onClick={() => setCreating(true)}>Crear un regalo propio</button></div>
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
                        <span className="rg-price">{formatARS(g.amount)}</span>
                        <div className="rg-arrows">
                          <button type="button" className="pn-icon" onClick={() => update(x => moveGiftTo(x, g.id, i - 1))} disabled={i === 0} aria-label={`Subir ${g.name}`}><ArrowUp size={16} aria-hidden="true" /></button>
                          <button type="button" className="pn-icon" onClick={() => update(x => moveGiftTo(x, g.id, i + 1))} disabled={i === items.length - 1} aria-label={`Bajar ${g.name}`}><ArrowDown size={16} aria-hidden="true" /></button>
                        </div>
                      </div>
                      <div className="rg-body">
                        <h3>{g.name}</h3>
                        <div className="rg-foot">
                          <span className="rg-cat">{g.category}</span>
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
                      <Thumb src={g.image} />
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
            </>
          )}
          <details className="rg-help">
            <summary>¿Cómo funciona la lista de regalos?</summary>
            <ol>
              <li>Elegís o creás los regalos de tu lista (sets completos o de a uno).</li>
              <li>Cargás tu alias en «Datos de cobro»: ahí te llegan los aportes.</li>
              <li>Compartís el enlace de la lista. Hoy es una demo: el enlace real se activa al publicar.</li>
              <li>Tus invitados eligen un regalo y lo ves en «Aportes recibidos», con su nombre y su mensaje, para agradecerles.</li>
            </ol>
          </details>
          </>
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
                        <div className="rg-pack-actions">
                          <button type="button" className="pn-btn is-ghost" onClick={() => setPackOpen(set)} aria-label={`Ver qué incluye el pack ${set.name}`}>Ver qué incluye</button>
                          <button type="button" className={`pn-btn${all ? ' is-ghost' : ''}`} onClick={toggle}>{all ? 'Quitar pack' : <><Plus size={15} aria-hidden="true" />Agregar</>}</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="pn-pick">
                <div className="pn-catalog">
                  <ul className="pn-ggrid">
                    <li className="pn-gown">
                      <button type="button" onClick={() => setCreating(true)}>
                        <span className="pn-owndot" aria-hidden="true"><Plus size={28} strokeWidth={1.6} /></span>
                        <strong>Crear un regalo propio</strong>
                        <span>Con tu nombre, tu monto y tu imagen</span>
                      </button>
                    </li>
                    {catalog.map(g => <CatalogCard key={g.id} gift={g} inList={hasCatalogGift(s, g.id)} onAdd={() => addOne(g.id)} onRemove={() => rmCatalog(g.id)} />)}
                  </ul>
                  <p className="pn-status-line" aria-live="polite" role="status">{catalog.length} {catalog.length === 1 ? 'regalo' : 'regalos'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'recibidos' && (
          <>
            <div className="rg-section-head">
              <div><h2>Aportes recibidos</h2><p className="pn-muted">Quién te regaló qué, con su mensaje.</p></div>
            </div>
            {/* Los tres totales están siempre, también antes del primer regalo (en cero). Los regalos se cargan en pesos y no hay cotización conectada: el total en dólares queda en «—». */}
            <ul className="gl-stats is-three" aria-label="Resumen de aportes recibidos">
              <li><span>Regalos recibidos</span><strong>{received.length}</strong><small>{received.length === 1 ? 'Regalo' : 'Regalos'}</small></li>
              <li><span>Total en pesos</span><strong>{formatARS(receivedTotal(received))}</strong><small>Pesos argentinos</small></li>
              <li><span>Total en dólares</span><strong aria-label="Sin dato">—</strong><small>Sin cotización conectada</small></li>
            </ul>
            {received.length === 0 ? (
              <div className="pn-empty is-centered">
                <span className="pn-empty-ico" aria-hidden="true"><GiftIcon size={22} strokeWidth={1.6} /></span>
                <h2>Todavía no recibiste regalos</h2>
                <p>Cuando un invitado regale desde la página de tu lista, lo vas a ver acá con su nombre, el monto y su mensaje. Para probarlo, regalá algo desde la vista de invitado.</p>
                <div className="pn-actions is-center"><button type="button" className="pn-btn" onClick={() => openPreview('gifts')}><Eye size={16} aria-hidden="true" />Ver la lista como invitado</button></div>
              </div>
            ) : (
              <>
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
            )}
          </>
        )}

        {tab === 'cobro' && (
          <div className="pn-config">
            <div className="pn-block-head">
              <h2>Datos para recibir tus regalos</h2>
            </div>
            <div className="pn-cfg-two">
              <section className="pn-cfg-block" aria-labelledby="cfg-alias">
                <div className="pn-cfg-head"><h2 id="cfg-alias">Transferencia bancaria</h2><span className={`pn-chip${alias ? ' is-ok' : ' is-todo'}`}>{alias ? 'Configurado' : 'Sin configurar'}</span></div>
                {alias ? (
                  <dl className="pn-cfg-sum">
                    <div><dt>Alias</dt><dd>{alias}</dd></div>
                    {s.gifts.bank.trim() && <div><dt>Banco</dt><dd>{s.gifts.bank.trim()}</dd></div>}
                    {s.gifts.cbu.trim() && <div><dt>CBU</dt><dd>{s.gifts.cbu.trim()}</dd></div>}
                  </dl>
                ) : <p className="pn-muted">Configurá los datos de tu cuenta para que tus invitados puedan transferirte a esta cuenta.</p>}
                <div className="pn-cfg-actions">
                  <button type="button" className="pn-btn" onClick={() => setCfg('bank')}>{alias ? 'Editar' : 'Configurar'}</button>
                  {alias && <button type="button" className="pn-link" onClick={() => { void navigator.clipboard?.writeText(alias).catch(() => undefined); toast('Alias copiado.'); }}><Copy size={14} aria-hidden="true" />Copiar alias</button>}
                </div>
              </section>
              <section className="pn-cfg-block" aria-labelledby="cfg-mp">
                <div className="pn-cfg-head"><h2 id="cfg-mp">Mercado Pago</h2><span className="pn-chip">Próximamente</span></div>
                <p className="pn-muted">Conectá tu cuenta de Mercado Pago para recibir los aportes ahí. Todavía no está disponible.</p>
                <div className="pn-cfg-actions">
                  <button type="button" className="pn-btn" onClick={() => setCfg('mp')}>Configurar</button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {cfg === 'bank' && (
        <Dialog open onOpenChange={o => { if (!o) setCfg(null); }}>
          <DialogContent className="pn-dialog">
            <DialogTitle>Transferencia bancaria</DialogTitle>
            <DialogDescription>Se guarda sola mientras escribís. El alias alcanza para cobrar; el banco y el CBU son opcionales.</DialogDescription>
            <BankFields bank={s.gifts.bank} cbu={s.gifts.cbu} alias={s.gifts.alias} />
            <div className="pn-actions is-end"><button type="button" className="pn-btn" onClick={() => setCfg(null)}>Listo</button></div>
          </DialogContent>
        </Dialog>
      )}

      {cfg === 'mp' && (
        <Dialog open onOpenChange={o => { if (!o) setCfg(null); }}>
          <DialogContent className="pn-dialog">
            <DialogTitle>Mercado Pago</DialogTitle>
            <DialogDescription>Todavía no podemos conectar tu cuenta de Mercado Pago. Cuando esté disponible, la vas a configurar desde acá.</DialogDescription>
            <label className="pn-check"><input type="checkbox" checked={s.gifts.acceptCard} onChange={e => update(x => ({ ...x, gifts: { ...x.gifts, acceptCard: e.target.checked } }))} /><span>Mostrar también la opción de pagar con tarjeta</span></label>
            <p className="pn-hint">Es solo tu preferencia: el cobro con tarjeta se habilita cuando conectemos un servicio de pagos.</p>
            <div className="pn-actions is-end"><button type="button" className="pn-btn" onClick={() => setCfg(null)}>Listo</button></div>
          </DialogContent>
        </Dialog>
      )}

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

      {packOpen && (() => {
        const set = packOpen;
        const gs = setGifts(set);
        const all = gs.every(g => hasCatalogGift(s, g.id));
        const toggle = () => { setPackOpen(null); if (all) withUndo(`Quitaste los regalos de «${set.name}».`, () => update(x => removeSetGifts(x, set.giftIds))); else doAddSet(set); };
        return (
          <Dialog open onOpenChange={o => { if (!o) setPackOpen(null); }}>
            <DialogContent className="pn-dialog">
              <DialogTitle>{set.name}</DialogTitle>
              <DialogDescription>{set.description}</DialogDescription>
              <p className="rg-label">{gs.length} regalos incluidos</p>
              <ul className="rg-pack-minis" aria-label={`Regalos del pack ${set.name}`}>
                {gs.map(g => (
                  <li key={g.id} className="rg-mini">
                    <span className="rg-mini-photo">{g.image ? <img src={g.image} alt="" loading="lazy" style={g.pos ? { objectPosition: g.pos } : undefined} /> : <GiftIcon size={24} strokeWidth={1.3} aria-hidden="true" />}</span>
                    <span className="rg-mini-name">{g.name}</span>
                  </li>
                ))}
              </ul>
              <div className="pn-actions is-end">
                <button type="button" className="pn-btn is-ghost" onClick={() => setPackOpen(null)}>Cerrar</button>
                <button type="button" className={`pn-btn${all ? ' is-ghost' : ''}`} onClick={toggle}>{all ? 'Quitar pack' : <><Plus size={15} aria-hidden="true" />Agregar pack</>}</button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
