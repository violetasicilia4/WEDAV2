// Scroll suave con inercia para la landing (Lenis). Se carga recién cuando el navegador está libre y no se activa con «reducir movimiento»
// ni en pantallas táctiles (ahí el scroll nativo ya es fluido). Los enlaces a anclas (#planes, #regalos…) también se deslizan.
// Mientras hay una ventana abierta (el cuerpo queda bloqueado), el scroll suave se pausa para no mover la página de fondo.
import { useEffect } from 'react';

export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    const start = async () => {
      const { default: Lenis } = await import('lenis');
      if (cancelled) return;
      const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, anchors: { offset: -64 } });
      let raf = requestAnimationFrame(function tick(t) { lenis.raf(t); raf = requestAnimationFrame(tick); });
      const sync = () => { if (document.body.hasAttribute('data-scroll-locked')) lenis.stop(); else lenis.start(); };
      const mo = new MutationObserver(sync);
      mo.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] });
      stop = () => { cancelAnimationFrame(raf); mo.disconnect(); lenis.destroy(); };
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = ric ? ric.call(window, () => { void start(); }, { timeout: 2000 }) : window.setTimeout(() => { void start(); }, 600);
    return () => { cancelled = true; if (!ric) window.clearTimeout(id); stop?.(); };
  }, []);
}
