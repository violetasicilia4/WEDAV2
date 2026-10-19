import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { duo, routine, unboxing } from '@/assets/images';
import { GiftDemo, SiteDemo, RsvpDemo } from '@/components/feature-demos';
import { FloatNav } from '@/components/float-nav';
import { LandingPlans } from '@/components/landing-plans';

// URL pública del sitio. Los metadatos sociales y el canonical necesitan una URL absoluta: se toma de VITE_SITE_URL
// (por ejemplo "https://weda.example"). Si no está definida quedan rutas relativas, que es lo único honesto sin dominio.
const SITE_URL = ((import.meta.env['VITE_SITE_URL'] as string | undefined) ?? '').replace(/\/$/, '');
const absolute = (path: string) => `${SITE_URL}${path}`;

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Weda • Lista de regalos y sitio para tu casamiento' },
      { name: 'description', content: 'Creá tu lista de regalos, compartí el sitio de tu casamiento y organizá las confirmaciones de tus invitados, todo en un solo lugar. Weda, la plataforma para casamientos.' },
      { property: 'og:title', content: 'Weda • Lista de regalos y sitio para tu casamiento' },
      { property: 'og:description', content: 'Creá tu lista de regalos, compartí el sitio de tu casamiento y organizá las confirmaciones de tus invitados, todo en un solo lugar.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'es_AR' },
      { property: 'og:image', content: absolute('/pareja-portada.jpg') },
      { property: 'og:image:alt', content: 'Una pareja abrazada, imagen de Weda' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: absolute('/pareja-portada.jpg') },
    ],
    links: [
      ...(SITE_URL ? [{ rel: 'canonical', href: `${SITE_URL}/` }] : []),
      // Tipografía del micrositio, solo para la maqueta del bloque "Sitio del casamiento".
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' as const },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap' },
    ],
  }),
  component: Index,
});
const features = [
  { title: 'Lista de regalos', note: 'Creen su lista con regalos y proyectos que quieran compartir con sus invitados.', icon: <GiftDemo /> },
  { title: 'Sitio del casamiento', note: 'Compartan la fecha, los lugares, las fotos y todos los detalles del evento.', icon: <SiteDemo /> },
  { title: 'Confirmación de asistencia', note: 'Reciban las respuestas de sus invitados y organicen quiénes los acompañarán.', icon: <RsvpDemo /> },
];
function SeedLogo() { return <a href="/" className="seed-logo" aria-label="Weda, inicio">Weda<i aria-hidden="true" /></a>; }
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
// Parejas ficticias de la demo (nombres y fotos inventados); los textos son los testimonios aportados.
const testimonials = [
  { quote: 'Weda nos ayudó a tener todo mucho más ordenado. Pudimos ver quiénes nos habían hecho un regalo y llevar un registro para no olvidarnos de agradecerle a nadie.', who: 'Camila & Lucas', photo: '/parejas/camila-lucas.jpg' },
  { quote: 'Nos re sirvió tener todo en la página. Más de uno nos preguntó cómo llegar o a qué hora era cada cosa, y les pasábamos el link directamente. Tenían el mapa, los horarios y toda la info ahí, así que no tuvimos que estar respondiendo mil mensajes el día del casamiento.', who: 'Valentina & Mariano', photo: '/parejas/valentina-mariano.jpg' },
  { quote: 'Nos divertimos un montón armando la lista porque pudimos elegir regalos que tenían que ver con nosotros y con esta nueva etapa. Más allá del regalo en sí, nos gustaba pensar que cada persona estaba aportando a algo que queríamos hacer juntos.', who: 'Julieta & Franco', photo: '/parejas/julieta-franco.jpg' },
  { quote: 'Nos sirvió para organizarnos con los invitados. Cada uno podía confirmar desde la página y nosotros ir viendo las respuestas sin tener que revisar todos los chats.', who: 'Mica & Agus', photo: '/parejas/mica-agus.jpg' },
];
function Testimonials() {
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [i, setI] = useState(0);
  const n = testimonials.length;
  // Tres copias de la lista: al llegar a una punta se salta (sin que se note) a la copia del medio, así el carrusel no tiene fin.
  const slides = [...testimonials, ...testimonials, ...testimonials];
  const left = (c: HTMLElement, el: HTMLElement) => c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2;
  const nearest = (el: HTMLElement) => {
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0, dist = Infinity;
    Array.from(el.children).forEach((c, k) => { const d = Math.abs((c as HTMLElement).offsetLeft + (c as HTMLElement).offsetWidth / 2 - mid); if (d < dist) { dist = d; best = k; } });
    return best;
  };
  const scrollToAbs = (k: number, smooth: boolean) => {
    const el = track.current; const card = el?.children[k] as HTMLElement | undefined; if (!el || !card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: left(card, el), behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };
  const step = (d: number) => { const el = track.current; if (el) scrollToAbs(nearest(el) + d, true); };
  useEffect(() => { scrollToAbs(n, false); }, []);
  // Al terminar de desplazarse: actualizar el punto activo y volver a la copia del medio si hace falta.
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onScroll = (el: HTMLDivElement) => {
    setI(nearest(el) % n);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => { const k = nearest(el); if (k < n || k >= 2 * n) scrollToAbs((k % n) + n, false); }, 140);
  };
  // Avanza solo cada 7 s; se detiene al pasar el mouse, al tocar, con el foco adentro, con la pestaña oculta o con movimiento reducido.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!paused.current && !document.hidden) step(1); }, 7000);
    return () => clearInterval(t);
  }, []);
  const hold = (v: boolean) => () => { paused.current = v; };
  return (
    <div className="tm" role="region" aria-roledescription="carrusel" aria-label="Testimonios" onMouseEnter={hold(true)} onMouseLeave={hold(false)} onTouchStart={hold(true)} onFocus={hold(true)} onBlur={hold(false)}>
      <div className="tm-head">
        <p className="eyebrow">● Testimonios</p>
        <h2>Lo que dicen las parejas</h2>
      </div>
      <div className="tm-track" ref={track} onScroll={e => onScroll(e.currentTarget)} tabIndex={0} aria-live="off" aria-label="Testimonios, usá las flechas para cambiar" onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } }}>
        {slides.map((t, k) => (
          <figure className={`tm-slide${k % n === i ? ' is-on' : ''}`} key={k} role="group" aria-roledescription="diapositiva" aria-label={`${(k % n) + 1} de ${n}`} aria-hidden={k < n || k >= 2 * n ? true : undefined}>
            <div className="tm-top">
              <img src={t.photo} alt={k >= n && k < 2 * n ? `${t.who}, pareja` : ''} width={48} height={48} loading="lazy" />
              <figcaption><strong>{t.who}</strong></figcaption>
              <span className="tm-mark" aria-hidden="true">“</span>
            </div>
            <blockquote>{t.quote}</blockquote>
          </figure>
        ))}
      </div>
      <div className="tm-dots" role="group" aria-label="Elegir testimonio">
        {testimonials.map((t, k) => <button type="button" key={k} className={k === i ? 'on' : ''} aria-label={`Ir al testimonio ${k + 1}`} aria-current={k === i} onClick={() => scrollToAbs(n + k, true)} />)}
      </div>
    </div>
  );
}
function Index() {
  const heroVideo = useRef<HTMLVideoElement>(null);
  // Respeta prefers-reduced-motion: el video de fondo queda en pausa.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Movimiento reducido o ahorro de datos: el video queda en pausa y se ve el poster.
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const sync = () => { const v = heroVideo.current; if (!v) return; if (mq.matches || saveData) v.pause(); else v.play().catch(() => {}); };
    sync(); mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return <>
    <a className="skip-link" href="#main">Ir al contenido</a>
    <Link to="/encontrar" className="announcement">¿Invitado? Encontrá una lista de regalos <ArrowRight size={11} className="ml-1"/></Link>
    <FloatNav onLanding />
    <main id="main">
    <section className="seed-hero" id="top">
      <video className="hero-image" src="/hero.mp4" poster="/hero-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" ref={heroVideo}/>
      <div className="hero-inner"><div className="hero-copy"><h1>Tu gran día empieza acá.</h1><p>Creá tu lista de regalos, compartí tu sitio y organizá las confirmaciones de tus invitados.</p><div className="hero-actions"><SeedLink pill to="/crear/cuenta">Crear mi evento</SeedLink><Button variant="seedLink" asChild><Link to="/ejemplo"><span>Ver ejemplo</span><ArrowRight size={15}/></Link></Button></div></div></div>
    </section>
    <section className="products-section" id="products"><div className="section-inner">
      <div className="feat-head"><h2>Todo para compartir su casamiento.</h2><div className="feat-head-side"><p>Una forma simple de reunir los regalos, la información del evento y las confirmaciones de sus invitados.</p><div className="feat-cta"><SeedLink to="/crear/cuenta">Crear mi evento</SeedLink></div></div></div>
      <div className="feat-grid">{features.map((f)=><div className="feat-card" key={f.title}><span className="feat-stage fd-stage" aria-hidden="true">{f.icon}</span><h3>{f.title}</h3><p>{f.note}</p></div>)}</div>
    </div></section>
    <section className="duo-section" id="regalos"><div className="section-inner duo-layout"><div className="duo-copy"><p className="eyebrow">Regalos</p><h2>Una lista de regalos hecha para ustedes.</h2><p>Desde ese viaje que sueñan hasta las cosas que quieren para su casa. Creen una lista a su manera y reciban los aportes directamente.</p><SeedLink pill to="/crear/cuenta">Crear mi lista de regalos</SeedLink></div><div className="duo-media"><img className="duo-main" src={duo.url} alt="Ollas y cacerolas esmaltadas de una lista de regalos" loading="lazy"/><div className="duo-thumbnails">{[routine,unboxing].map((im,i)=><img key={im.url} src={im.url} alt={['Mesa de madera de una lista de regalos','Lámpara de mesa de una lista de regalos'][i]} loading="lazy"/>)}</div></div></div></section>
    <section className="viacap-section" id="testimonios"><div className="section-inner"><Testimonials/></div></section>
    <LandingPlans />
    </main>
    <footer className="seed-footer"><div className="section-inner">
      <div className="footer-top">
        <div><SeedLogo/><p className="footer-mission">Tu gran día empieza acá.</p></div>
        <nav className="footer-nav" aria-label="Secciones de Weda">
          <a href="#regalos">Lista de regalos</a>
          <Link to="/ejemplo">Sitio del casamiento</Link>
          <a href="#products">Confirmación de asistencia</a>
          <Link to="/ejemplo">Ver ejemplo</Link>
        </nav>
      </div>
      <div className="footer-bottom"><span>© 2026 Weda</span></div>
    </div></footer>
  </>;
}
