// Aparición suave de los bloques de la landing al entrar en pantalla (sube un poco y se funde).
// Sin JavaScript o con «reducir movimiento» no se oculta nada: el contenido queda visible desde el primer momento.
// Usa la propiedad `translate` (no `transform`) para no pisar los hovers ni las animaciones que ya usan transform.
import { useEffect } from 'react';

const TARGETS = [
  '.feat-head', '.feat-card',
  '.duo-photo', '.duo-panel',
  '.tq',
  '.plans-head', '.plan-card',
  '.footer-top',
];

export function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const els = [...document.querySelectorAll<HTMLElement>(TARGETS.join(','))];
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('rv-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    for (const el of els) {
      // Lo que ya está a la vista al cargar no se esconde (evita un parpadeo).
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
      // Tarjetas hermanas entran escalonadas.
      const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.matches(TARGETS.join(','))) : [];
      const k = Math.max(0, sibs.indexOf(el));
      el.style.setProperty('--rv-delay', `${Math.min(k, 4) * 90}ms`);
      el.classList.add('rv');
      io.observe(el);
    }
    return () => { io.disconnect(); for (const el of els) el.classList.remove('rv', 'rv-in'); };
  }, []);
}
