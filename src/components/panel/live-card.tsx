import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { sitePath } from '@/lib/weda/logic';
import type { AppState, SiteEvent } from '@/lib/weda/types';

export type LiveSection = 'portada' | 'fecha' | 'eventos' | 'regalos' | 'rsvp' | 'dress' | 'texto' | 'fotos' | 'mensaje' | 'musica';

/** Estado del teclado virtual: con poco alto visible, la ventana se achica o pasa a una tira. */
export type KeyboardState = 'off' | 'compact' | 'tight';

/* Ventana de la página REAL: un iframe de `/sitio/…?ventana` (los mismos componentes y estilos que ven los invitados, sin barra ni pie)
   recortado y alineado a la sección que se edita. No se redibuja nada a mano: cada cambio llega por el evento `storage` (~150 ms).
   Es solo para mirar (no recibe toques: el scroll de la pantalla sigue siendo del panel); la página completa se abre con «Ver completa». */

/** Qué elemento de la página real corresponde a cada sección (el evento abierto tiene su propia ancla). */
const targetOf = (doc: Document, section: LiveSection, openEvent: SiteEvent['key'] | null): Element | null => {
  switch (section) {
    case 'portada': return doc.querySelector('.iv-cover-group');
    case 'fecha': return doc.getElementById('save-the-date');
    // Desde el título del evento (sin el ícono): así entran título, fecha, horario y lugar en una ventana chica.
    case 'eventos': return (openEvent && doc.querySelector(`#ev-${openEvent} h3`)) || doc.querySelector('#dia h3') || doc.getElementById('dia');
    case 'regalos': return doc.getElementById('regalos');
    case 'texto': return doc.getElementById('texto');
    case 'rsvp': return doc.getElementById('confirmar');
    case 'dress': return doc.getElementById('dresscode');
    case 'fotos': return doc.querySelector('#fotos img') || doc.getElementById('fotos');
    case 'mensaje': return doc.getElementById('iv-close-title');
    // La lista de temas (lo que se carga en el formulario); sin temas, arriba del bloque.
    case 'musica': return doc.querySelector('#musica .iv-tracks') || doc.getElementById('musica');
  }
};

const EMPTY: Record<LiveSection, string> = {
  portada: 'Cargando tu portada…',
  fecha: 'Definí la fecha del casamiento y acá aparece el «Save the date» con su cuenta regresiva.',
  eventos: 'Prendé un evento y cargá el lugar: acá ves cómo lo leen tus invitados.',
  regalos: 'Elegí regalos en «Regalos»: la sección aparece cuando hay una lista.',
  texto: 'Escribí un título o un mensaje para verlo acá.',
  rsvp: 'La confirmación está oculta: tus invitados no la ven.',
  dress: 'Escribí un título o un texto para ver el dress code.',
  fotos: 'Subí una foto y la ves acá.',
  mensaje: 'El mensaje final está oculto: tus invitados no lo ven.',
  musica: 'Sumá canciones y aparecen acá.',
};

export function LiveCard({ s, section, label, hidden, openEvent, keyboard, onSeeFull, onHide }: {
  s: AppState; section: LiveSection; label: string; hidden: boolean; openEvent: SiteEvent['key'] | null; keyboard: KeyboardState; onSeeFull: () => void; onHide?: () => void; extra?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const raf = useRef(0);
  const observer = useRef<MutationObserver | null>(null);
  const [present, setPresent] = useState(true);
  const [ready, setReady] = useState(false);

  const align = useCallback(() => {
    const win = frame.current?.contentWindow;
    const doc = win?.document;
    if (!win || !doc?.body) return;
    const el = targetOf(doc, section, openEvent);
    setPresent(!!el);
    if (!el) return;
    const view = box.current?.clientHeight ?? 190;
    const r = el.getBoundingClientRect();
    // La portada se centra en los nombres; el resto arranca en el borde de la sección (con un respiro).
    const top = section === 'portada' ? win.scrollY + r.top + r.height / 2 - view / 2 : win.scrollY + r.top - 12;
    win.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'instant' as ScrollBehavior });
  }, [section, openEvent]);

  const alignRef = useRef(align);
  alignRef.current = align;
  const schedule = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => alignRef.current());
  }, []);

  useEffect(() => { align(); }, [align, keyboard]);
  useEffect(() => () => { cancelAnimationFrame(raf.current); observer.current?.disconnect(); }, []);

  // Al cargar la página real: alinear y seguir alineada cuando cambia su contenido o terminan de cargar las imágenes.
  const onLoad = () => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    setReady(true);
    align();
    observer.current?.disconnect();
    observer.current = new MutationObserver(schedule);
    observer.current.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src', 'style', 'class', 'hidden'] });
    doc.addEventListener('load', schedule, true);
  };

  const off = hidden || !present;
  const note = hidden ? 'Oculta: tus invitados no la ven.' : !present && ready ? EMPTY[section] : '';
  return (
    <aside className="lc" aria-label="Así lo ven tus invitados">
      <div className="lc-window" ref={box} data-off={off ? 'true' : undefined} data-kb={keyboard}>
        <iframe ref={frame} className="lc-frame" src={`${sitePath(s)}?ventana`} title="Tu página, como la ven tus invitados" tabIndex={-1} aria-hidden="true" onLoad={onLoad} />
        {note && <p className="lc-note">{note}</p>}
        {!ready && <p className="lc-note is-loading" role="status">Cargando…</p>}
        <button type="button" className="lc-open" onClick={onSeeFull}><span className="lc-pill">Ver completa<ArrowUpRight size={14} aria-hidden="true" /></span><span className="pn-sr">Ver {label} en la página completa</span></button>
        {onHide && <button type="button" className="lc-hide" onClick={onHide} aria-label="Ocultar la vista previa"><span><X size={14} aria-hidden="true" /></span></button>}
      </div>
      <div className="lc-strip">
        <p>Editando <strong>{label}</strong></p>
        <button type="button" className="pn-link" onClick={onSeeFull}>Ver cómo queda<ArrowUpRight size={14} aria-hidden="true" /></button>
      </div>
    </aside>
  );
}

/** ¿Hay un teclado virtual tapando la pantalla? Con un campo de texto enfocado y el alto visible bastante menor al normal:
 *  'compact' (todavía entra una ventana chica) o 'tight' (queda muy poco: solo una tira). iOS y Android achican `visualViewport`. */
export function useKeyboardState(): KeyboardState {
  const [state, setState] = useState<KeyboardState>('off');
  useEffect(() => {
    const vv = window.visualViewport;
    let base = Math.max(window.innerHeight, vv?.height ?? 0);
    const typing = () => {
      const a = document.activeElement as HTMLInputElement | null;
      return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !['checkbox', 'radio', 'file', 'button', 'submit'].includes(a.type);
    };
    const check = () => {
      const h = vv?.height ?? window.innerHeight;
      base = Math.max(base, h);
      if (!typing() || h > base - 140) return setState('off');
      setState(h < 480 ? 'tight' : 'compact');
    };
    const onOrientation = () => { base = vv?.height ?? window.innerHeight; check(); };
    const onBlur = () => window.setTimeout(check, 120);
    vv?.addEventListener('resize', check);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', onOrientation);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', onBlur);
    check();
    return () => {
      vv?.removeEventListener('resize', check);
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', onOrientation);
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', onBlur);
    };
  }, []);
  return state;
}
