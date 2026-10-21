import { useEffect, useRef } from 'react';

/** Centra un elemento dentro de una fila que se desplaza de costado (sin mover la página). Es instantáneo a propósito: es un reacomodo, no una transición. */
export function centerChild(row: HTMLElement | null, child: HTMLElement | null | undefined) {
  if (!row || !child) return;
  row.scrollTo({ left: child.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft - (row.clientWidth - child.offsetWidth) / 2, behavior: 'auto' });
}

/** Fila que se desplaza de costado: marca con `data-edge` ('right' | 'left' | 'both') el lado donde todavía hay opciones fuera de pantalla,
 *  y el CSS (`.pn-fade`) desvanece ese borde. Así se nota que hay más pestañas sin depender de que la persona pruebe deslizar. */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 4;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      el.dataset['edge'] = left && right ? 'both' : right ? 'right' : left ? 'left' : '';
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);
  return ref;
}
