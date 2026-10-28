import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Check, ChevronRight, Copy, Eye, Gift as GiftIcon, ImagePlus, Package, Pencil, Plus, X } from 'lucide-react';
import { Field, Locked, useToast } from '@/components/panel/ui';
import { centerChild, useScrollFade } from '@/components/panel/scroll-row';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { catalog, categories, setGifts, SETS, type GiftSet } from '@/lib/weda/catalog';
import { formatARS, type Gift } from '@/lib/demo-wedding';
import { readImage } from '@/lib/weda/images';
import {
  addCatalogGift, addCustomGift, addSet, contributionsFromServer, contributionsFromState, hasCatalogGift, moveGiftTo, parseAmount, removeGift, removeSetGifts, sitePath, updateGift, type Contribution,
  cleanCbu, validateAlias, validateCbu, validateGift,
} from '@/lib/weda/logic';
import { can } from '@/lib/weda/plans';
import { openPreview } from '@/lib/weda/preview-event';
import { update, useAppState } from '@/lib/weda/store';
import { api, useRemote } from '@/lib/weda/remote';
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

/** Aportes recibidos: con cuenta, los del servidor (con correo y comprobante); sin cuenta, los registrados en este navegador. */
function useContributions(s: ReturnType<typeof useAppState>): { list: Contribution[]; loading: boolean; failed: boolean } {
  const { user } = useRemote();
  const [server, setServer] = useState<Contribution[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!user) { setServer(null); return; }
    let alive = true;
    api<{ contributions: unknown }>('GET', '/api/contributions')
      .then(r => { if (alive) { setServer(contributionsFromServer(r.contributions)); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [user]);
  if (user) return { list: server ?? [], loading: server === null && !failed, failed };
  return { list: contributionsFromState(s), loading: false, failed: false };
}
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

/* Ordenar las tarjetas arrastrándolas: con el mouse se agarran y se llevan; con el dedo, se mantienen apretadas un instante y se llevan (así el scroll de la página sigue andando).
   Tocar una tarjeta (sin arrastrar) abre su edición. Con el teclado: Alt + flechas mueven la tarjeta enfocada.
   Fluidez: la tarjeta que se lleva sigue al puntero por transform directo (sin pasar por el render), las demás se deslizan a su nuevo lugar (FLIP) y al soltar la tarjeta se asienta en su hueco.
   El lugar nuevo se decide con la grilla sin transformaciones (offsets), no con lo que se ve en pantalla, para que las animaciones no la confundan. */
const SETTLE_MS = 170;
function SortableGrid({ items, onMove, onOpen, renderCard }: { items: ListGift[]; onMove: (id: string, to: number) => void; onOpen: (g: ListGift) => void; renderCard: (g: ListGift, i: number) => React.ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const justDragged = useRef(false);
  const raf = useRef(0);
  const before = useRef<Map<string, DOMRect>>(new Map());
  const st = useRef<{ id: string; pointerId: number; startX: number; startY: number; grabX: number; grabY: number; x: number; y: number; timer: number | null; active: boolean; touch: boolean; order: string[] } | null>(null);

  const shown = order ? order.map(id => items.find(g => g.id === id)).filter((g): g is ListGift => !!g) : items;
  const cardEl = useCallback((id: string) => listRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`) ?? null, []);

  // La tarjeta llevada queda exactamente donde está el puntero (menos el punto por el que se la agarró).
  const place = useCallback(() => {
    const cur = st.current, list = listRef.current; if (!cur?.active || !list) return;
    const li = cardEl(cur.id); if (!li) return;
    const box = list.getBoundingClientRect();
    li.style.transform = `translate(${cur.x - box.left - cur.grabX - li.offsetLeft}px, ${cur.y - box.top - cur.grabY - li.offsetTop}px) scale(1.03)`;
  }, [cardEl]);
  // Decide el lugar según la tarjeta (en la grilla, sin transformaciones) sobre la que está el puntero; una zona central evita que salte de ida y vuelta.
  const retarget = () => {
    const cur = st.current, list = listRef.current; if (!cur?.active || !list) return;
    const box = list.getBoundingClientRect(); const px = cur.x - box.left, py = cur.y - box.top;
    const cards = [...list.children] as HTMLElement[];
    const over = cards.find(c => {
      if (c.dataset['id'] === cur.id) return false;
      const mx = c.offsetWidth * 0.2, my = c.offsetHeight * 0.2;
      return px >= c.offsetLeft + mx && px <= c.offsetLeft + c.offsetWidth - mx && py >= c.offsetTop + my && py <= c.offsetTop + c.offsetHeight - my;
    });
    if (!over) return;
    const target = cur.order.indexOf(over.dataset['id'] ?? ''), from = cur.order.indexOf(cur.id);
    if (target < 0 || target === from) return;
    // Posiciones de antes (con lo que ya se ve): sirven para deslizar cada tarjeta desde donde estaba.
    before.current = new Map(cards.map(c => [c.dataset['id'] ?? '', c.getBoundingClientRect()]));
    const next = [...cur.order]; next.splice(from, 1); next.splice(target, 0, cur.id); cur.order = next; setOrder(next);
  };
  // Después de reordenar: las demás tarjetas se deslizan de su lugar anterior al nuevo, y la llevada se vuelve a pegar al puntero.
  useLayoutEffect(() => {
    const list = listRef.current; if (!list || !st.current?.active) return;
    for (const el of [...list.children] as HTMLElement[]) {
      const id = el.dataset['id'] ?? ''; if (id === st.current.id) continue;
      const old = before.current.get(id); if (!old) continue;
      const now = el.getBoundingClientRect(); const dx = old.left - now.left, dy = old.top - now.top;
      if (!dx && !dy) continue;
      el.style.transition = 'none'; el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.getBoundingClientRect();
      el.style.transition = `transform ${SETTLE_MS + 30}ms cubic-bezier(.2, .8, .2, 1)`; el.style.transform = '';
    }
    before.current = new Map();
    place();
  }, [order, place]);

  const clearStyles = () => { for (const el of [...(listRef.current?.children ?? [])] as HTMLElement[]) { el.style.transform = ''; el.style.transition = ''; } };
  const loop = () => {
    const cur = st.current; if (!cur?.active) { raf.current = 0; return; }
    // Cerca del borde de la pantalla, la página acompaña (y la tarjeta sigue pegada al puntero).
    if (cur.y < 90) window.scrollBy(0, -12); else if (cur.y > window.innerHeight - 90) window.scrollBy(0, 12);
    place(); retarget();
    raf.current = window.requestAnimationFrame(loop);
  };

  const finish = (commit: boolean) => {
    const cur = st.current;
    if (cur?.timer) window.clearTimeout(cur.timer);
    window.cancelAnimationFrame(raf.current); raf.current = 0;
    if (!cur?.active) { st.current = null; return; }
    st.current = null;
    // El «click» que sigue al soltar no tiene que abrir la edición.
    justDragged.current = true; window.setTimeout(() => { justDragged.current = false; }, 0);
    if (commit) onMove(cur.id, cur.order.indexOf(cur.id));
    // La tarjeta se asienta en su hueco y recién después se suelta todo.
    const li = cardEl(cur.id);
    if (li) { li.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(.2, .8, .2, 1)`; li.style.transform = 'translate(0, 0) scale(1)'; }
    window.setTimeout(() => { clearStyles(); setDragId(null); setOrder(null); }, SETTLE_MS + 10);
  };

  const begin = (id: string) => {
    const cur = st.current; if (!cur) return;
    cur.active = true; cur.order = items.map(g => g.id);
    setOrder(cur.order); setDragId(id);
    try { cardEl(id)?.setPointerCapture(cur.pointerId); } catch { /* sin captura */ }
    if (typeof navigator !== 'undefined' && cur.touch) navigator.vibrate?.(8);
    window.requestAnimationFrame(() => { place(); raf.current = window.requestAnimationFrame(loop); });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLLIElement>, id: string) => {
    if (st.current) return;
    if ((e.target as HTMLElement).closest('.rg-actions')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect(); const touch = e.pointerType !== 'mouse';
    st.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, grabX: e.clientX - r.left, grabY: e.clientY - r.top, x: e.clientX, y: e.clientY, timer: null, active: false, touch, order: items.map(g => g.id) };
    if (touch) st.current.timer = window.setTimeout(() => begin(id), 280);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    const cur = st.current; if (!cur || cur.pointerId !== e.pointerId) return;
    cur.x = e.clientX; cur.y = e.clientY;
    if (!cur.active) {
      const moved = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      // Con el dedo, moverse antes de tiempo es un scroll: se cancela el arrastre.
      if (cur.touch) { if (moved > 8 && cur.timer) { window.clearTimeout(cur.timer); st.current = null; } return; }
      if (moved > 5) begin(cur.id);
      return;
    }
    place(); retarget();
  };
  // Mientras se arrastra con el dedo no tiene que scrollear la página.
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const stop = (e: TouchEvent) => { if (st.current?.active) e.preventDefault(); };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => { el.removeEventListener('touchmove', stop); window.cancelAnimationFrame(raf.current); };
  }, []);

  const keyMove = (e: React.KeyboardEvent<HTMLLIElement>, id: string) => {
    if (!e.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const i = items.findIndex(x => x.id === id);
    onMove(id, i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1));
    // Después de reordenar el foco sigue en la misma tarjeta.
    window.requestAnimationFrame(() => cardEl(id)?.focus());
  };

  return (
    <>
      <p id="pn-sort-help" className="pn-sr">Para cambiar el orden con el teclado, mantené Alt y usá las flechas.</p>
      <ul ref={listRef} className={`rg-grid rg-sortable${dragId ? ' is-dragging' : ''}`} aria-label="Regalos de tu lista (podés ordenarlos arrastrando)">
        {shown.map((g, i) => (
          <li key={g.id} data-id={g.id} className={`rg-card${dragId === g.id ? ' is-drag' : ''}`} tabIndex={0}
            aria-roledescription="elemento ordenable" aria-describedby="pn-sort-help"
            onPointerDown={e => onPointerDown(e, g.id)} onPointerMove={onPointerMove} onPointerUp={() => finish(true)} onPointerCancel={() => finish(false)}
            onContextMenu={e => { if (st.current?.touch) e.preventDefault(); }}
            onClick={e => { if (justDragged.current || (e.target as HTMLElement).closest('.rg-actions')) return; onOpen(g); }}
            onKeyDown={e => { keyMove(e, g.id); if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onOpen(g); } }}>
            {renderCard(g, i)}
          </li>
        ))}
      </ul>
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

  const contrib = useContributions(s);
  // Recordatorio por correo a quien regaló (con un enlace nuevo para adjuntarlo). El servidor permite uno por día por aporte.
  const remind = async (r: Contribution) => {
    try {
      const res = await api<{ status: string }>('POST', `/api/contributions/${encodeURIComponent(r.id)}/remind`);
      toast(res.status === 'sent' ? `Le pedimos el comprobante a ${r.giver}.` : res.status === 'skipped' ? 'El envío de correos todavía no está configurado: no se mandó.' : 'No pudimos enviar el correo. Probá de nuevo en un rato.', res.status === 'sent' ? 'ok' : 'error');
    } catch (e) {
      const code = e instanceof Error && 'code' in e ? String((e as { code: unknown }).code) : '';
      toast(code === 'reminder_too_soon' ? 'Ya se lo pediste hoy. Podés volver a pedirlo mañana.' : code === 'receipt_already_attached' ? 'Ya adjuntó el comprobante: actualizá la página.' : 'No pudimos enviar el correo. Probá de nuevo en un rato.', 'error');
    }
  };
  if (!can(s.planId, 'gifts')) return <Locked feature="gifts" />;
  const items = s.gifts.items;
  const received = contrib.list;
  const giftCount = received.reduce((n, c) => n + c.gifts.length, 0);

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
                <div><h2>Mis regalos ({items.length})</h2><p className="pn-muted">Arrastrá las tarjetas para cambiar el orden y tocá una para editarla.</p></div>
                <div className="rg-head-actions">
                  <button type="button" className="pn-btn is-ghost" onClick={() => { setCatView('packs'); setTab('agregar'); }}><Package size={16} aria-hidden="true" />Explorar packs sugeridos</button>
                </div>
              </div>
              <SortableGrid items={items} onMove={(id, to) => update(x => moveGiftTo(x, id, to))} onOpen={setEditing} renderCard={g => (
                <>
                  <div className="rg-photo">
                    {g.image ? <img src={g.image} alt="" loading="lazy" draggable={false} style={g.pos ? { objectPosition: g.pos } : undefined} /> : <GiftIcon size={34} strokeWidth={1.3} aria-hidden="true" />}
                    <span className="rg-price">{formatARS(g.amount)}</span>
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
                </>
              )} />
            </>
          )}
          <details className="rg-help">
            <summary>¿Cómo funciona la lista de regalos?</summary>
            <ol>
              <li>Elegís o creás los regalos de tu lista (sets completos o de a uno).</li>
              <li>Cargás tu alias en «Datos de cobro»: ahí te llegan los aportes.</li>
              <li>Compartís el enlace de la lista. El enlace se activa al publicar.</li>
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
                        {all && <span className="rg-pack-chip"><Check size={13} strokeWidth={2.5} aria-hidden="true" />En tu lista</span>}
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
                        <strong>Crear regalo</strong>
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
              <div><h2>Aportes recibidos</h2><p className="pn-muted">Quién te regaló, qué regalos, el monto, la fecha, su mensaje y el comprobante.</p></div>
            </div>
            {/* Los tres totales están siempre, también antes del primer regalo (en cero). Los regalos se cargan en pesos y no hay cotización conectada: el total en dólares queda en «—». */}
            <ul className="gl-stats is-three" aria-label="Resumen de aportes recibidos">
              <li><span>Regalos recibidos</span><strong>{giftCount}</strong><small>{giftCount === 1 ? 'Regalo' : 'Regalos'}</small></li>
              <li><span>Total en pesos</span><strong>{formatARS(received.reduce((n, c) => n + c.total, 0))}</strong><small>Pesos argentinos</small></li>
              <li><span>Total en dólares</span><strong aria-label="Sin dato">—</strong><small>Sin cotización conectada</small></li>
            </ul>
            {contrib.failed && <p className="pn-banner" role="alert">No pudimos traer tus aportes. Revisá tu conexión y volvé a abrir esta pestaña.</p>}
            {contrib.loading ? <p className="pn-muted" role="status">Cargando tus aportes…</p> : received.length === 0 ? (
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
                        <p className="rg-rec-name">{r.giver}{r.how && <span className="pn-chip">{HOW_LABEL[r.how]}</span>}{r.status === 'pending_review' && <span className="pn-chip is-todo">A revisar</span>}{r.status === 'confirmed' && <span className="pn-chip is-ok">Confirmado</span>}</p>
                        {r.email && <p className="rg-rec-mail"><a className="pn-link" href={`mailto:${r.email}`}>{r.email}</a></p>}
                        <ul className="rg-rec-gifts" aria-label={`Regalos de ${r.giver}`}>
                          {r.gifts.map((g, i) => <li key={`${g.name}-${i}`}><span>{g.name}</span><span>{formatARS(g.amount)}</span></li>)}
                        </ul>
                        {r.at && <p className="rg-rec-date">{fmtDate(r.at)}</p>}
                        {r.message && <p className="rg-quote">«{r.message}»</p>}
                        {r.receipt === 'missing' && (
                          <div className="rg-rec-missing">
                            <p className="rg-rec-proof is-missing">Falta el comprobante</p>
                            {r.email && <button type="button" className="pn-btn is-ghost is-small" onClick={() => void remind(r)}>Pedir comprobante</button>}
                          </div>
                        )}
                        {r.receipt && r.receipt !== 'missing' && <a className="pn-btn is-ghost is-small rg-rec-proof" href={r.receipt} target="_blank" rel="noopener noreferrer"><Eye size={15} aria-hidden="true" />Ver comprobante<span className="pn-sr"> (se abre en una pestaña nueva)</span></a>}
                      </div>
                      <strong className="rg-rec-amount">{formatARS(r.total)}</strong>
                    </li>
                  ))}
                </ul>
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
            <DialogContent className="pn-dialog is-pack">
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
