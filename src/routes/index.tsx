import { useEffect, useRef } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, BellRing, Gift, UserPlus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      { property: 'og:image', content: absolute('/og-weda.png') },
      { property: 'og:image:alt', content: 'Weda, la plataforma para casamientos' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: absolute('/og-weda.png') },
    ],
    links: [
      ...(SITE_URL ? [{ rel: 'canonical', href: `${SITE_URL}/` }] : []),
    ],
  }),
  component: Index,
});
const features = [
  { title: 'Lista de regalos', note: 'Creen su lista con regalos y proyectos que quieran compartir con sus invitados.', icon: <GiftDemo /> },
  { title: 'Sitio del casamiento', note: 'Compartan la fecha, los lugares, las fotos y todos los detalles del evento.', icon: <SiteDemo /> },
  { title: 'Confirmación de asistencia', note: 'Reciban las respuestas de sus invitados y organicen quiénes los acompañarán.', icon: <RsvpDemo /> },
];
const giftSteps = [
  { title: 'Creá tu cuenta y armá tu sitio', Icon: UserPlus },
  { title: 'Armá tu lista de regalos', Icon: Gift },
  { title: 'Vinculá tu alias', Icon: Wallet },
  { title: 'Seguí los regalos de tus invitados', Icon: BellRing },
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
  // Tres testimonios a la vista: uno al lado del otro en pantallas grandes y uno debajo del otro en celular (sin carrusel ni scroll).
  return (
    <div className="tg">
      <div className="tm-head">
        <p className="eyebrow">● Testimonios</p>
        <h2>Lo que dicen las parejas</h2>
      </div>
      <ul className="tg-grid" aria-label="Testimonios">
        {testimonials.slice(0, 3).map(t => (
          <li key={t.who}>
            <figure className="tg-card">
              <blockquote>{t.quote}</blockquote>
              <figcaption><img src={t.photo} alt="" width={48} height={48} loading="lazy" /><strong>{t.who}</strong></figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
function Index() {
  // Tipografía del micrositio (solo para la maqueta del bloque «Sitio del casamiento», más abajo): se pide con la página ya cargada,
  // en vez de bloquear el primer render con una hoja de estilos externa.
  useEffect(() => {
    if (document.getElementById('cormorant-font')) return;
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const add = () => {
      const l = document.createElement('link');
      l.id = 'cormorant-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap';
      document.head.appendChild(l);
    };
    const go = () => { if (ric) ric.call(window, add, { timeout: 4000 }); else window.setTimeout(add, 1500); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    return () => window.removeEventListener('load', go);
  }, []);
  const heroVideo = useRef<HTMLVideoElement>(null);
  // El video (3,6 MB) se pide recién cuando la página terminó de cargar y el navegador está libre: la portada (póster) es lo primero que se ve
  // y no compite con el resto. Con movimiento reducido, ahorro de datos o conexión lenta no se descarga: queda el póster.
  useEffect(() => {
    const v = heroVideo.current;
    if (!v) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const lean = () => mq.matches || conn?.saveData === true || /^(slow-2g|2g|3g)$/.test(conn?.effectiveType ?? '');
    let started = false;
    const start = () => {
      if (started || lean()) return;
      started = true;
      v.src = '/hero.mp4';
      v.play().catch(() => {});
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const idle = () => { if (ric) ric.call(window, start, { timeout: 2500 }); else window.setTimeout(start, 800); };
    if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });
    // Si el usuario activa movimiento reducido con la página abierta, se pausa.
    const onChange = () => { if (mq.matches) v.pause(); else if (started) v.play().catch(() => {}); };
    mq.addEventListener('change', onChange);
    return () => { window.removeEventListener('load', idle); mq.removeEventListener('change', onChange); };
  }, []);
  return <>
    <a className="skip-link" href="#main">Ir al contenido</a>
    <Link to="/encontrar" className="announcement">¿Invitado? Encontrá una lista de regalos <ArrowRight size={11} className="ml-1"/></Link>
    <FloatNav onLanding />
    <main id="main">
    <section className="seed-hero" id="top">
      <video className="hero-image" poster="/hero-poster.jpg" muted loop playsInline preload="none" aria-hidden="true" ref={heroVideo}/>
      <div className="hero-inner"><div className="hero-copy"><h1>Tu casamiento empieza antes del gran día.</h1><p>Creá el sitio de tu casamiento, armá tu lista de regalos y organizá las confirmaciones de tus invitados.</p><div className="hero-actions"><SeedLink pill to="/crear/cuenta">Crear mi evento</SeedLink><Button variant="seedLink" asChild><Link to="/ejemplo"><span>Ver ejemplo</span><ArrowRight size={15}/></Link></Button></div></div></div>
    </section>
    <section className="products-section" id="products"><div className="section-inner">
      <div className="feat-head"><h2>Todo para compartir su casamiento.</h2><div className="feat-head-side"><p>Una forma simple de reunir los regalos, la información del evento y las confirmaciones de sus invitados.</p><div className="feat-cta"><SeedLink to="/crear/cuenta">Crear mi evento</SeedLink></div></div></div>
      <div className="feat-grid">{features.map((f)=><div className="feat-card" key={f.title}><span className="feat-stage fd-stage" aria-hidden="true">{f.icon}</span><h3>{f.title}</h3><p>{f.note}</p></div>)}</div>
    </div></section>
    <section className="duo-section" id="regalos"><div className="duo-split"><div className="duo-photo"><img src="/landing-regalos.webp" alt="Un novio cargando a su novia en un campo al atardecer" loading="lazy" decoding="async"/></div><div className="duo-panel"><p className="eyebrow">Regalos</p><h2>Una lista de regalos hecha para ustedes.</h2><ol className="duo-steps">{giftSteps.map(({ title, Icon }, i) => <li key={title}><span className="duo-step-n" aria-hidden="true">{i + 1}</span><Icon className="duo-step-ico" size={22} strokeWidth={1.4} aria-hidden="true" /><b>{title}</b></li>)}</ol><div className="duo-cta"><SeedLink pill to="/crear/cuenta">Crear mi lista de regalos</SeedLink></div></div></div></section>
    <section className="viacap-section" id="testimonios"><div className="section-inner"><Testimonials/></div></section>
    <LandingPlans />
    </main>
    <footer className="seed-footer"><div className="section-inner">
      <div className="footer-top">
        <div><SeedLogo/><p className="footer-mission">Tu casamiento empieza antes del gran día.</p></div>
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
