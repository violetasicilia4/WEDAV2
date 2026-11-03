import { Link } from '@tanstack/react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatNav } from '@/components/float-nav';
import { GiftDemo } from '@/components/feature-demos';
import { SiteFooter } from '@/components/site-footer';
import { GiftFeatures } from '@/components/gift-features';
import { faqs } from '@/lib/gift-list-faqs';
import { useReveal } from '@/lib/reveal';
// Los estilos de esta página viajan con su código (no con la landing, auditoría F-06).
import '@/lista-regalos.css';

const Cta = ({ children = 'Crear mi lista de regalos' }: { children?: string }) => (
  <Button variant="seed" asChild><Link to="/crear/cuenta">{children}</Link></Button>
);

export function GiftListPage() {
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
