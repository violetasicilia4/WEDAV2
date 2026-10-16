import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { duo, routine, unboxing } from '@/assets/images';
import { GiftDemo, SiteDemo, RsvpDemo } from '@/components/feature-demos';
import { FloatNav } from '@/components/float-nav';

// URL pública del sitio. Los metadatos sociales y el canonical necesitan una URL absoluta: se toma de VITE_SITE_URL
// (por ejemplo "https://weda.example"). Si no está definida quedan rutas relativas, que es lo único honesto sin dominio.
const SITE_URL = ((import.meta.env['VITE_SITE_URL'] as string | undefined) ?? '').replace(/\/$/, '');
const absolute = (path: string) => `${SITE_URL}${path}`;

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Weda • Organizá tu casamiento en un solo lugar' },
      { name: 'description', content: 'Creá tu lista de regalos, gestioná invitados y compartí toda la información de tu evento. Weda, la plataforma para organizar casamientos.' },
      { property: 'og:title', content: 'Weda • Organizá tu casamiento en un solo lugar' },
      { property: 'og:description', content: 'Creá tu lista de regalos, gestioná invitados y compartí toda la información de tu evento.' },
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
const plans = [
  { name: 'Regalos', sub: 'Para empezar con lo esencial.', items: ['Lista de regalos'] },
  { name: 'Completo', sub: 'Para organizar todo con tus invitados.', items: ['Lista de regalos', 'Confirmación de asistencia', 'Sitio de casamiento'] },
  { name: 'Premium', sub: 'La experiencia completa de tu casamiento.', items: ['Todo lo del plan Completo', 'Sitio de casamiento premium'] },
];
const features = [
  { title: 'Lista de regalos', note: 'Regalos simbólicos y fondos para los sueños que quieren compartir.', icon: <GiftDemo /> },
  { title: 'Sitio del casamiento', note: 'Su historia, los detalles del gran día y toda la información para compartir con sus invitados.', icon: <SiteDemo /> },
  { title: 'Confirmación de asistencia', note: 'Invitaciones y confirmaciones para saber quiénes van a compartir ese día con ustedes.', icon: <RsvpDemo /> },
];
function SeedLogo() { return <a href="/" className="seed-logo" aria-label="Weda, inicio">Weda<i aria-hidden="true" /></a>; }
// CTA de la landing. Cada uno tiene un destino real (una sección de esta página o una ruta existente);
// si todavía no hay una pantalla a la que llevar (registro, pago), se muestra como botón inactivo.
type SeedLinkProps = { children: React.ReactNode; pill?: boolean; href?: string; to?: '/ejemplo' | '/ejemplo/regalos'; disabled?: boolean };
function SeedLink({ children, pill = false, href, to, disabled }: SeedLinkProps) {
  const content = pill ? children : <><span>{children}</span><ArrowRight size={15} /></>;
  const variant = pill ? 'seed' : 'seedLink';
  if (disabled) return <Button variant={variant} type="button" disabled>{content}</Button>;
  if (to) return <Button variant={variant} asChild><Link to={to}>{content}</Link></Button>;
  return <Button variant={variant} asChild><a href={href}>{content}</a></Button>;
}
// TESTIMONIOS DE EJEMPLO: textos y nombres provisorios para maquetar el carrusel. Reemplazarlos por testimonios reales antes de publicar.
const testimonials = [
  { quote: 'Armamos la lista de regalos en una tarde y nuestros invitados pudieron aportar a la luna de miel sin complicaciones.', who: 'Camila y Lucas' },
  { quote: 'Dejamos de perseguir confirmaciones por mensaje: todas las respuestas llegaban en un solo lugar.', who: 'Valentina y Mariano' },
  { quote: 'El sitio con nuestra historia hizo que todos llegaran sabiendo exactamente dónde y cuándo.', who: 'Julieta y Franco' },
  { quote: 'Recibir el dinero directamente nos permitió empezar la casa que soñábamos.', who: 'Sofía y Tomás' },
];
function Testimonials() {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const go = (n: number) => {
    const el = track.current; if (!el) return;
    const t = (n + testimonials.length) % testimonials.length;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: t * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <div className="tm" role="region" aria-roledescription="carrusel" aria-label="Testimonios">
      <p className="eyebrow">● Testimonios</p>
      <div className="tm-track" ref={track} onScroll={e => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); }} tabIndex={0} aria-live="off">
        {testimonials.map((t, n) => (
          <figure className="tm-slide" key={t.who} role="group" aria-roledescription="diapositiva" aria-label={`${n + 1} de ${testimonials.length}`}>
            <blockquote>“{t.quote}”</blockquote>
            <figcaption>{t.who}</figcaption>
          </figure>
        ))}
      </div>
      <div className="tm-controls">
        <div className="tm-dots" role="group" aria-label="Elegir testimonio">
          {testimonials.map((t, n) => <button type="button" key={t.who} className={n === i ? 'on' : ''} aria-label={`Ir al testimonio ${n + 1}`} aria-current={n === i} onClick={() => go(n)} />)}
        </div>
        <div className="tm-arrows">
          <button type="button" aria-label="Testimonio anterior" onClick={() => go(i - 1)}><ArrowLeft size={20} /></button>
          <button type="button" aria-label="Testimonio siguiente" onClick={() => go(i + 1)}><ArrowRight size={20} /></button>
        </div>
      </div>
    </div>
  );
}
function Index() {
  const heroVideo = useRef<HTMLVideoElement>(null);
  // Respeta prefers-reduced-motion: el video de fondo queda en pausa.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { const v = heroVideo.current; if (!v) return; if (mq.matches) v.pause(); else v.play().catch(() => {}); };
    sync(); mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return <>
    <a className="skip-link" href="#main">Ir al contenido</a>
    <Link to="/encontrar" className="announcement">¿Invitado? Encontrá una lista de regalos <ArrowRight size={11} className="ml-1"/></Link>
    <FloatNav onLanding />
    <section className="seed-hero" id="top">
      <video className="hero-image" src="/hero.mp4" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" ref={heroVideo}/>
      <main id="main" className="hero-inner"><div className="hero-copy"><h1>Tu gran día empieza acá.</h1><p>Creá tu lista de regalos, gestioná invitados y compartí toda la información de tu evento.</p><div className="hero-actions"><SeedLink pill href="#planes">Crear mi evento</SeedLink><Button variant="seedLink" asChild><Link to="/ejemplo"><span>Ver ejemplo</span><ArrowRight size={15}/></Link></Button></div></div></main>
    </section>
    <section className="products-section" id="products"><div className="section-inner">
      <div className="feat-head"><h2>Todo para su gran día.</h2><div className="feat-head-side"><p>Una lista de regalos para sus próximos sueños, un sitio para compartir su historia y una forma simple de organizar a quienes los acompañan.</p><div className="feat-cta"><SeedLink href="#planes">Crear mi evento</SeedLink></div></div></div>
      <div className="feat-grid">{features.map((f)=><div className="feat-card" key={f.title}><span className="feat-stage fd-stage" aria-hidden="true">{f.icon}</span><h3>{f.title}</h3><p>{f.note}</p></div>)}</div>
    </div></section>
    <section className="duo-section" id="regalos"><div className="section-inner duo-layout"><div className="duo-copy"><p className="eyebrow">Regalos</p><h2>Creá una lista de regalos simbólica que se adapte a ustedes</h2><p>Tus invitados eligen qué regalar y vos recibís el dinero directamente.</p><SeedLink pill href="#planes">Crear mi lista de regalos</SeedLink></div><div className="duo-media"><img className="duo-main" src={duo.url} alt="Ollas y cacerolas esmaltadas de una lista de regalos" loading="lazy"/><div className="duo-thumbnails">{[routine,unboxing].map((im,i)=><img key={im.url} src={im.url} alt={['Mesa de madera de una lista de regalos','Lámpara de mesa de una lista de regalos'][i]} loading="lazy"/>)}</div></div></div></section>
    <section className="viacap-section" id="testimonios"><div className="section-inner"><Testimonials/></div></section>
    <section className="plans-section" id="planes"><div className="section-inner">
      <div className="plans-head"><h2>Elegí el plan para tu casamiento.</h2><p>Pago único, pagás solo al publicar.</p></div>
      <div className="plans-grid">{plans.map(pl=><article className="plan-card" key={pl.name}><h3>{pl.name}</h3><p className="plan-sub">{pl.sub}</p><ul>{pl.items.map(it=><li key={it}><Check size={18} strokeWidth={1.6} aria-hidden="true"/><span>{it}</span></li>)}</ul><SeedLink pill disabled>Elegir experiencia</SeedLink></article>)}</div>
    </div></section>
    <footer className="seed-footer"><div className="section-inner">
      <div className="footer-top">
        <div><SeedLogo/><p className="footer-mission">Tu historia, a tu manera.</p></div>
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
