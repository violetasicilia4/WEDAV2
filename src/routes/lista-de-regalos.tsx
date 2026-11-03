import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatNav } from '@/components/float-nav';
import { GiftDemo } from '@/components/feature-demos';
import { SiteFooter } from '@/components/site-footer';
import { absolute, pageMeta, SITE_NAME } from '@/lib/site';
import { PLANS, PRICE_UNIT } from '@/lib/weda/plans';
import { GiftFeatures } from '@/components/gift-features';
import { useReveal } from '@/lib/reveal';
import '@/lista-regalos.css';

/* Página informativa de la lista de regalos (estructura de la página de registro de The Knot: portada, ventajas y
   preguntas frecuentes). No figura en el menú de arriba: se llega desde el pie y desde buscadores.
   SEO y GEO: un solo h1, un párrafo inicial que define qué es, preguntas con respuestas cortas y autosuficientes, y los datos estructurados
   FAQPage generados desde el mismo contenido que se ve. Todo lo que dice sale del producto real (PRODUCT.md): el regalo es una
   transferencia al alias de los novios con comprobante, Weda no cobra ni mueve dinero y el pago con tarjeta todavía no existe. */

const giftPlan = PLANS.find(p => p.id === 'regalos');
const price = giftPlan ? `$ ${giftPlan.price.toLocaleString('es-AR')}` : '';


const faqs = [
  { q: '¿Qué es una lista de regalos de casamiento online?', a: 'Es una página con los regalos que los novios eligieron, que se comparte con un link. Los invitados eligen uno y lo pagan desde el celular. En Weda cada regalo se paga por transferencia al alias de los novios.' },
  { q: '¿Cómo reciben el dinero los novios?', a: 'Por transferencia, directo a la cuenta cuyo alias cargaron en Weda. El invitado transfiere y sube el comprobante; los novios lo revisan y confirman el regalo.' },
  { q: '¿Weda se queda con un porcentaje de los regalos?', a: 'No. Weda no cobra ni mueve el dinero de los regalos: la transferencia va de la cuenta del invitado a la de los novios.' },
  { q: '¿Los invitados pueden pagar con tarjeta?', a: 'Todavía no. Por ahora los regalos se hacen por transferencia al alias de los novios.' },
  { q: '¿Qué regalos puedo poner en mi lista?', a: 'Podés elegir de los sets de Weda (Luna de miel, Hogar, Experiencias, Proyectos futuros, Para el primer hogar y Escapada de a dos) o crear tus propios regalos con el nombre y el monto que quieras.' },
  { q: '¿Cómo sé quién me hizo un regalo?', a: 'En tu panel ves cada regalo recibido con el nombre de quien lo hizo, su mensaje y el comprobante de la transferencia. Así tenés el registro para agradecer.' },
  { q: '¿Cómo encuentran mi lista los invitados?', a: 'Con el link que les compartís. También pueden buscarla en Weda por el nombre de los novios.' },
  { q: '¿Cuánto cuesta la lista de regalos?', a: `Armarla es gratis: pagás recién al publicarla.${giftPlan ? ` El plan ${giftPlan.name} cuesta ${price}, ${PRICE_UNIT}.` : ''} Si además querés el sitio del casamiento y la confirmación de asistencia, están en los planes Celebración.` },
  { q: '¿Puedo tener la lista de regalos y el sitio del casamiento juntos?', a: 'Sí. Con los planes Celebración la lista de regalos vive en el mismo sitio que la fecha, los lugares y la confirmación de asistencia.' },
];

const PATH = '/lista-de-regalos';
const TITLE = 'Lista de regalos de casamiento online • Weda';
const DESCRIPTION = 'Armá la lista de regalos de tu casamiento, vinculá tu cuenta y recibí los regalos por transferencia, con el comprobante y el nombre de quien te regaló.';

export const Route = createFileRoute('/lista-de-regalos')({
  head: () => {
    const { meta, links } = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH });
    const faqLd = {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    };
    const pageLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: TITLE, description: DESCRIPTION, url: absolute(PATH), isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absolute('/') } };
    return {
      meta, links,
      scripts: [faqLd, pageLd].map(d => ({ type: 'application/ld+json', children: JSON.stringify(d) })),
    };
  },
  component: GiftListPage,
});

const Cta = ({ children = 'Crear mi lista de regalos' }: { children?: string }) => (
  <Button variant="seed" asChild><Link to="/crear/cuenta">{children}</Link></Button>
);

function GiftListPage() {
  useReveal();
  return <>
    <a className="skip-link" href="#main">Ir al contenido</a>
    <FloatNav />
    <main id="main" className="lr">
      <section className="lr-hero" aria-labelledby="lr-title">
        <div className="lr-inner lr-hero-grid">
          <div className="lr-hero-copy">
            <p className="eyebrow">Lista de regalos</p>
            <h1 id="lr-title">La lista de regalos de tu casamiento, directo a tu cuenta.</h1>
            <p className="lr-lead">Una lista de regalos online es una página con los regalos que eligieron, que se comparte con un link. En Weda la armás gratis, vinculás tu cuenta y tus invitados regalan por transferencia, con el comprobante y su mensaje.</p>
            <div className="lr-actions"><Cta /><Button variant="seedLink" asChild><Link to="/ejemplo/regalos"><span>Ver una lista de ejemplo</span><ArrowRight size={15} /></Link></Button></div>
          </div>
          <div className="lr-hero-demo" aria-hidden="true"><span className="fd-stage"><GiftDemo /></span></div>
        </div>
      </section>

      <section className="lr-features" aria-label="Cómo funciona la lista de regalos">
        <div className="lr-inner">
          <GiftFeatures withCta />
        </div>
      </section>

      <section className="lr-faq" aria-labelledby="lr-faq-title">
        <div className="lr-inner lr-faq-inner">
          <h2 id="lr-faq-title">Preguntas frecuentes sobre la lista de regalos</h2>
          <div className="lr-faq-list">
            {faqs.map(f => (
              <details key={f.q}><summary><h3>{f.q}</h3><Plus className="lr-faq-ico" size={18} strokeWidth={1.6} aria-hidden="true" /></summary><p>{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-section" aria-labelledby="lr-closing-title"><div className="section-inner closing-inner">
        <h2 id="lr-closing-title">Armá tu lista de regalos gratis y pagá recién al publicarla.</h2>
        <div className="closing-actions"><Cta /><Link to="/encontrar" className="closing-link">Encontrá una lista de regalos</Link></div>
      </div></section>
    </main>
    <SiteFooter />
  </>;
}
