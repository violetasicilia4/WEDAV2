import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { track } from '@/lib/analytics';
import { testimonials } from '@/lib/testimonials';
import { ArrowLeft, ArrowRight, Gift, Receipt, UserCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GiftDemo, SiteDemo, RsvpDemo } from '@/components/feature-demos';
import { FloatNav } from '@/components/float-nav';
import { LandingPlans } from '@/components/landing-plans';
import { TRIAL_DAYS } from '@/lib/weda/plans';
import { SiteFooter } from '@/components/site-footer';
import { GiftFeatures } from '@/components/gift-features';
import { pageMeta } from '@/lib/site';
import { useSmoothScroll } from '@/lib/smooth-scroll';
import { useReveal } from '@/lib/reveal';

export const Route = createFileRoute('/')({
  head: () => {
    const { meta, links } = pageMeta({
      title: 'Weda • Lista de regalos y sitio para tu casamiento',
      description: 'Creá tu lista de regalos, compartí el sitio de tu casamiento y organizá las confirmaciones de tus invitados, todo en un solo lugar. Weda, la plataforma para casamientos.',
      ogDescription: 'Creá tu lista de regalos, compartí el sitio de tu casamiento y organizá las confirmaciones de tus invitados, todo en un solo lugar.',
      path: '/',
    });
    return { meta, links };
  },
  component: Index,
});
const features = [
  { title: 'Lista de regalos', note: 'Creen su lista con regalos y proyectos que quieran compartir con sus invitados.', icon: <GiftDemo /> },
  { title: 'Sitio del casamiento', note: 'Compartan la fecha, los lugares, las fotos y todos los detalles del evento.', icon: <SiteDemo /> },
  { title: 'Confirmación de asistencia', note: 'Reciban las respuestas de sus invitados y organicen quiénes los acompañarán.', icon: <RsvpDemo /> },
];
// CTA de la landing. Cada uno tiene un destino real (una sección de esta página o una ruta existente);
// si todavía no hay una pantalla a la que llevar (registro, pago), se muestra como botón inactivo.
type SeedLinkProps = { children: React.ReactNode; pill?: boolean; href?: string; to?: '/ejemplo' | '/ejemplo/regalos' | '/crear/cuenta'; disabled?: boolean };
function SeedLink({ children, pill = false, href, to, disabled }: SeedLinkProps) {
  const content = pill ? children : <><span>{children}</span><ArrowRight size={15} /></>;
  const variant = pill ? 'seed' : 'seedLink';
  if (disabled) return <Button variant={variant} type="button" disabled>{content}</Button>;
  if (to === '/crear/cuenta') return <Button variant={variant} asChild><Link to="/crear/cuenta">{content}</Link></Button>;
  if (to) return <Button variant={variant} asChild><Link to={to}>{content}</Link></Button>;
  return <Button variant={variant} asChild><a href={href}>{content}</a></Button>;
}
/* Antes: cuatro «testimonios» de parejas inventadas (nombres y fotos ficticios). Publicar experiencias de clientes que no existen puede ser publicidad
   engañosa (Ley 24.240): hasta tener testimonios reales y con consentimiento, la sección muestra lo que Weda hace, sin fingir clientes
   (auditoría 2026-10-28, docs/auditoria-ux-conversion/findings.md F-10). Cada frase describe una función que existe hoy. */
const benefits: { text: string; title: string; Icon: typeof Gift }[] = [
  { text: 'Tu lista de regalos y tu invitación, en un solo link para compartir con todos tus invitados.', title: 'Un solo link', Icon: Gift },
  { text: 'Ves quién te regaló, qué regalos eligió, el monto, la fecha, su mensaje y el comprobante de la transferencia.', title: 'Regalos con comprobante', Icon: Receipt },
  { text: 'Tus invitados confirman desde la página y las respuestas se suman solas a tu lista de invitados.', title: 'Confirmaciones en un lugar', Icon: UserCheck },
  { text: 'Los regalos van directo a tu cuenta: Weda no cobra comisión ni pasa por el dinero.', title: 'Sin comisión', Icon: Wallet },
];
function Benefits() {
  // Una frase a la vez, en grande, con flechas para pasar de una a otra. Todas ocupan la misma celda: la sección no cambia de alto al pasar.
  const [i, setI] = useState(0);
  const n = benefits.length;
  const go = (d: number) => setI(v => (v + d + n) % n);
  const b = benefits[i]!;
  const num = (v: number) => String(v).padStart(2, '0');
  return (
    <div className="tq" role="group" aria-roledescription="carrusel" aria-label="Por qué Weda">
      <p className="tq-label">/Por qué Weda</p>
      <div className="tq-quotes">
        {benefits.map((q, k) => <p key={q.title} className={`tq-text${k === i ? ' on' : ''}`} aria-hidden={k === i ? undefined : true}>{q.text}</p>)}
      </div>
      <div className="tq-rule" aria-hidden="true"><i style={{ width: `${100 / n}%`, transform: `translateX(${i * 100}%)` }} /></div>
      <div className="tq-foot">
        <div className="tq-who" aria-live="polite">
          <span className="tq-ico" aria-hidden="true"><b.Icon size={22} strokeWidth={1.6} /></span>
          <p className="tq-cap"><strong>{b.title}</strong><span>{num(i + 1)} / {num(n)}</span></p>
        </div>
        <div className="tq-nav">
          <button type="button" onClick={() => go(-1)} aria-label="Anterior"><ArrowLeft size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => go(1)} aria-label="Siguiente"><ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
}
function Testimonials() {
  // Una cita a la vez, en grande, con flechas para pasar de una a otra (vuelve el diseño anterior, ahora sobre blanco: pedido de la dueña, 2026-11-03).
  // Todas las citas ocupan la misma celda: la sección no cambia de alto al pasar.
  const [i, setI] = useState(0);
  const n = testimonials.length;
  const go = (d: number) => setI(v => (v + d + n) % n);
  const t = testimonials[i]!;
  const num = (v: number) => String(v).padStart(2, '0');
  return (
    <div className="tq is-white" role="group" aria-roledescription="carrusel" aria-label="Testimonios">
      <p className="tq-label">/Testimonios</p>
      <span className="tq-mark" aria-hidden="true">“</span>
      <div className="tq-quotes">
        {testimonials.map((q, k) => <blockquote key={q.who} className={k === i ? 'on' : undefined} aria-hidden={k === i ? undefined : true}>{q.quote}</blockquote>)}
      </div>
      <div className="tq-rule" aria-hidden="true"><i style={{ width: `${100 / n}%`, transform: `translateX(${i * 100}%)` }} /></div>
      <div className="tq-foot">
        <figure className="tq-who" aria-live="polite">
          {t.photo && <img key={t.who} src={t.photo} alt="" width={48} height={48} loading="lazy" draggable={false} />}
          <figcaption><strong>{t.who}</strong><span>{num(i + 1)} / {num(n)}</span></figcaption>
        </figure>
        <div className="tq-nav">
          <button type="button" onClick={() => go(-1)} aria-label="Testimonio anterior"><ArrowLeft size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => go(1)} aria-label="Testimonio siguiente"><ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
}
function Index() {
  useSmoothScroll();
  useReveal();
  useEffect(() => { track('landing_viewed'); }, []);
  const heroVideo = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  // El video se pide recién cuando la página terminó de cargar y el navegador está libre: la portada (póster) es lo primero que se ve
  // y no compite con el resto. Con movimiento reducido, ahorro de datos, conexión lenta o como fondo del registro (iframe) no se descarga: queda el póster.
  // En celular (hasta 640 px) va una versión vertical recortada a lo que se ve en pantalla (0,37 MB en vez de 1,7 MB, auditoría F-05).
  useEffect(() => {
    const v = heroVideo.current;
    if (!v) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const lean = () => window.self !== window.top || mq.matches || conn?.saveData === true || /^(slow-2g|2g|3g)$/.test(conn?.effectiveType ?? '');
    let started = false;
    const start = () => {
      // «Crear mi evento» es el paso principal: su pantalla se deja bajada para que al tocar se abra sin espera.
      if (window.self === window.top) void router.preloadRoute({ to: '/crear/cuenta' }).catch(() => {});
      if (started || lean()) return;
      started = true;
      const phone = window.matchMedia('(max-width: 640px)').matches;
      v.classList.toggle('is-portrait', phone);
      v.src = phone ? '/hero-mobile.mp4?v=1' : '/hero.mp4?v=9';
      v.play().catch(() => {});
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    // En celular se espera un poco más: primero tiene que quedar lista la página para responder a los toques.
    const wait = window.matchMedia('(max-width: 640px)').matches ? 1200 : 0;
    const idle = () => window.setTimeout(() => { if (ric) ric.call(window, start, { timeout: 2500 }); else window.setTimeout(start, 800); }, wait);
    if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
    // Si el usuario activa movimiento reducido con la página abierta, se pausa.
    const onChange = () => { if (mq.matches) v.pause(); else if (started) v.play().catch(() => {}); };
    mq.addEventListener('change', onChange);
    return () => { window.removeEventListener('load', idle); mq.removeEventListener('change', onChange); };
  }, [router]);
  return <>
    <a className="skip-link" href="#main">Ir al contenido</a>
    <Link to="/encontrar" className="announcement">¿Invitado? Encontrá una lista de regalos <ArrowRight size={11} className="ml-1"/></Link>
    <FloatNav onLanding />
    <main id="main">
    <section className="seed-hero" id="top">
      <video className="hero-image" poster="/hero-poster.jpg?v=5" muted loop playsInline preload="none" aria-hidden="true" ref={heroVideo}/>
      <div className="hero-inner"><div className="hero-copy"><h1>Tu casamiento empieza antes del gran día.</h1><p>Creá el sitio de tu casamiento, armá tu lista de regalos y organizá tus invitados, todo en un solo lugar. {TRIAL_DAYS} días para crear gratis, sin tarjeta.</p><div className="hero-actions"><SeedLink pill to="/crear/cuenta">Crear mi evento</SeedLink><Button variant="seedLink" asChild><Link to="/ejemplo"><span>Ver ejemplo</span><ArrowRight size={15}/></Link></Button></div></div></div>
    </section>
    <section className="products-section" id="products"><div className="section-inner">
      <div className="feat-head"><h2>Todo para compartir su casamiento.</h2><div className="feat-head-side"><p>Una forma simple de reunir los regalos, la información del evento y las confirmaciones de sus invitados.</p><div className="feat-cta"><SeedLink to="/crear/cuenta">Crear mi evento</SeedLink></div></div></div>
      <div className="feat-grid">{features.map((f)=><Link to="/crear/cuenta" className="feat-card is-link" key={f.title}><span className="feat-stage fd-stage" aria-hidden="true">{f.icon}</span><h3>{f.title}</h3><p>{f.note}</p></Link>)}</div>
    </div></section>
    {/* Regalos: arranca directo en «Sin comisión» (sin título de sección) y el botón va dentro del último bloque (pedido de la dueña, 2026-11-03). */}
    <section className="duo-section" id="regalos" aria-label="Lista de regalos"><div className="duo-split is-path"><div className="duo-panel"><GiftFeatures level={2} label="Lista de regalos" endCta={<SeedLink pill to="/crear/cuenta">Crear mi lista de regalos</SeedLink>} /></div></div></section>
    <section className="viacap-section" id="por-que-weda"><div className="section-inner">{testimonials.length > 0 ? <Testimonials/> : <Benefits/>}</div></section>
    <LandingPlans />
    {/* Cierre antes del pie: una frase grande con la acción principal y el acceso para invitados. */}
    <section className="closing-section" aria-labelledby="closing-title"><div className="section-inner closing-inner">
      <h2 id="closing-title">Weda reúne la lista de regalos, el sitio y las confirmaciones de tu casamiento.</h2>
      <div className="closing-actions"><SeedLink pill to="/crear/cuenta">Crear mi evento</SeedLink></div>
    </div></section>
    </main>
    <SiteFooter />
  </>;
}
