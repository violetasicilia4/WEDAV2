// Vista previa del editor «Tu página»: la página pública REAL (la misma de /sitio/…) en un iframe, con el tamaño lógico del dispositivo
// (celular 390 px o compu 1280 px) escalado para entrar en el panel. Así las proporciones, el espaciado y los cortes de columna son los del
// resultado final, no una maqueta. Comparte el estado local: cada cambio del editor llega por el evento `storage` (≈150 ms), sin guardar ni recargar.
//
// Además conecta la página con el editor: tocar una sección de la vista previa la elige en el editor, y la sección que se está editando queda marcada.
import { useCallback, useEffect, useRef, useState } from 'react';

export type PreviewSection = 'portada' | 'eventos' | 'regalos' | 'rsvp' | 'dress' | 'fotos' | 'musica' | 'mensaje';
export type Device = 'mobile' | 'desktop';

/** Dónde vive cada sección en la página pública (selectores del DOM real). */
const TARGETS: [string, PreviewSection][] = [
  ['.iv-cover', 'portada'], ['#nos-casamos', 'portada'], ['#dia', 'eventos'], ['#regalos', 'regalos'], ['#confirmar', 'rsvp'],
  ['#dresscode', 'dress'], ['#fotos', 'fotos'], ['.iv-participate', 'musica'], ['.iv-closing', 'mensaje'],
];
const SIZE: Record<Device, number> = { mobile: 390, desktop: 1280 };
const OLIVE = '#959571';

const STYLE = `
.ed-pick { cursor: pointer; }
/* Los grosores se compensan con la escala de la vista previa (--ed-w) para que se vean igual de claros en compu, donde la página se achica. */
.ed-pick:hover { outline: var(--ed-w, 3px) dashed ${OLIVE}; outline-offset: calc(var(--ed-w, 3px) * -1); }
.ed-on, .ed-on:hover { outline: var(--ed-w, 3px) solid ${OLIVE} !important; outline-offset: calc(var(--ed-w, 3px) * -1); box-shadow: inset 0 0 0 var(--ed-w, 3px) #fff; }
.ej-bar { pointer-events: none; }
`;

function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

export function SitePreview({ path, device, anchor, jump, active, onSelect, label }: {
  path: string;
  device: Device;
  /** Id de la sección de la página a la que llevar la vista previa ('' = arriba de todo, undefined = no mover). */
  anchor?: string | undefined;
  /** Cambia cada vez que se pide volver a la misma sección. */
  jump?: number | undefined;
  /** Sección que se está editando: queda marcada en la página. */
  active?: PreviewSection | null | undefined;
  /** Se llamó al tocar una sección de la página. */
  onSelect?: ((s: PreviewSection) => void) | undefined;
  label: string;
}) {
  const [stage, box] = useBox();
  const frame = useRef<HTMLIFrameElement>(null);
  const watch = useRef<MutationObserver | null>(null);
  const activeRef = useRef(active);
  const selectRef = useRef(onSelect);
  activeRef.current = active;
  selectRef.current = onSelect;

  const W = SIZE[device];
  // Compu: se achica para entrar a lo ancho. Celular: tamaño real si entra; si el panel es más angosto, también se achica.
  const pad = device === 'mobile' ? 0 : 0;
  const scale = box.w > 0 ? Math.min(1, (box.w - pad) / W) : 1;
  const frameH = device === 'mobile' ? Math.min(box.h, 860) : box.h;
  const outerW = W * scale;

  /** Marca las secciones tocables y la que se está editando. Idempotente: solo toca el DOM si algo falta. */
  const mark = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    for (const [sel, sec] of TARGETS) {
      doc.querySelectorAll<HTMLElement>(sel).forEach(el => {
        if (!el.classList.contains('ed-pick')) el.classList.add('ed-pick');
        el.classList.toggle('ed-on', activeRef.current === sec);
      });
    }
  }, []);

  const scrollTo = useCallback(() => {
    watch.current?.disconnect();
    if (anchor === undefined) return;
    try {
      const w = frame.current?.contentWindow;
      if (!w) return;
      if (anchor === '') { w.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const el = w.document.getElementById(anchor);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      // La sección todavía no existe (por ejemplo, recién agregada): espera a que aparezca.
      const obs = new MutationObserver(() => {
        const found = w.document.getElementById(anchor);
        if (found) { obs.disconnect(); found.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
      obs.observe(w.document.body, { childList: true, subtree: true });
      watch.current = obs;
      window.setTimeout(() => obs.disconnect(), 3000);
    } catch { /* la página todavía no cargó */ }
    // `jump` fuerza volver a la misma sección aunque el ancla no cambie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, jump]);

  // Cuando la página carga: estilos de selección, clics y observador (React vuelve a pintar clases al actualizarse la página).
  const onLoad = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.head) return;
    if (!doc.getElementById('ed-style')) {
      const st = doc.createElement('style'); st.id = 'ed-style'; st.textContent = STYLE; doc.head.appendChild(st);
    }
    doc.addEventListener('click', e => {
      // Dentro de la vista previa nada navega ni abre diálogos: tocar una sección la elige en el editor.
      e.preventDefault(); e.stopPropagation();
      const t = e.target as Element | null;
      for (const [sel, sec] of TARGETS) if (t?.closest(sel)) { selectRef.current?.(sec); return; }
    }, true);
    let queued = false;
    new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mark(); }); }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    doc.documentElement.style.setProperty('--ed-w', `${Math.max(3, 3 / scale)}px`);
    mark();
    scrollTo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mark, scrollTo]);

  // Grosor del marcado en píxeles de la página (no de la pantalla): ≈ 3 px visibles aunque la página esté achicada.
  useEffect(() => { frame.current?.contentDocument?.documentElement.style.setProperty('--ed-w', `${Math.max(3, 3 / scale)}px`); }, [scale, device]);
  useEffect(mark, [active, mark]);
  useEffect(scrollTo, [scrollTo]);
  useEffect(() => () => watch.current?.disconnect(), []);

  return (
    <div className="sp-stage" ref={stage}>
      {box.w > 0 && (
        <div className={`sp-device is-${device}`} style={{ width: outerW, height: frameH * 1 }}>
          <iframe
            ref={frame}
            key={path}
            title={label}
            src={`${path}${path.includes('?') ? '&' : '?'}borrador`}
            onLoad={onLoad}
            style={{ width: W, height: frameH / scale, transform: `scale(${scale})`, transformOrigin: '0 0' }}
          />
        </div>
      )}
    </div>
  );
}
