// Quién provee los datos de la página pública:
//  - DemoSite: /ejemplo (Ignacio & Martina). Los regalos elegidos duran lo que dure la sesión del navegador.
//  - AppSite: /sitio/$slug y la vista previa. Lee y escribe el estado local de la pareja (lista, invitados, respuestas).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { sendGift, sendRsvp } from '@/lib/weda/public-api';
import type { PublicLookup } from '@/lib/weda/public-site';
import { useSessionState } from '@/lib/demo-session';
import { applyRsvp, siteSlug } from '@/lib/weda/logic';
import { isLive } from '@/lib/weda/payments';
import { isPlanId } from '@/lib/weda/plans';
import { demoSiteData, siteFromState, SiteProvider, type SiteActions } from '@/lib/weda/site-model';
import { update, useAppState, useHydrated } from '@/lib/weda/store';
import type { GivenGift, PlanId } from '@/lib/weda/types';
import { SiteShell } from './site-shell';
import '@/demo.css';
import '@/ejemplo.css';
import '@/invitacion.css';

export function DemoSite({ children }: { children: ReactNode }) {
  const [given, setGiven] = useSessionState<GivenGift[]>('gifts-given', []);
  const actions = useMemo<SiteActions>(() => ({
    given,
    recordGift: (gs, who) => setGiven(c => [...c.filter(x => !gs.some(g => g.id === x.id)), ...gs.map(g => ({ id: g.id, name: who.name, message: who.message }))]),
    recordRsvp: () => {},
  }), [given, setGiven]);
  return <SiteProvider data={demoSiteData} actions={actions}><SiteShell>{children}</SiteShell></SiteProvider>;
}

function Notice({ title, text, to, cta }: { title: string; text: string; to: string; cta: string }) {
  return (
    <div className="dm-root"><main id="main" className="site-notice">
      <h1>{title}</h1>
      <p>{text}</p>
      <Link to={to as never} className="dm-solid">{cta}</Link>
    </main></div>
  );
}

/* Vista previa «cómo queda con este plan»: el panel carga la página en un iframe con `?plan=…` y la página se arma como se vería con ese plan, SIN tocar el plan guardado (solo cambia lo que se muestra). Se lee una sola vez, al abrir: queda en el contexto del iframe aunque la navegación interna (Invitación ↔ Regalos) pierda el parámetro. Fuera del navegador no hay nada que leer. */
let planOverride: PlanId | null | undefined;
function readPlanOverride(): PlanId | null {
  if (typeof window === 'undefined') return null;
  if (planOverride === undefined) {
    const v = new URLSearchParams(window.location.search).get('plan');
    planOverride = isPlanId(v) ? v : null;
  }
  return planOverride;
}

/** La vista previa del panel (iframe, «cómo queda con este plan» o «borrador») muestra el borrador local; el resto del mundo ve lo publicado en el servidor. */
const isPreviewSearch = (search: string) => { const q = new URLSearchParams(search); return q.has('ventana') || q.has('plan') || q.has('borrador'); };
// Una vez que la página se abrió como vista previa sigue siéndolo aunque la navegación interna (Invitación ↔ Regalos) pierda el parámetro.
let stickyPreview = false;

/* Sitio publicado en el servidor: lo ve cualquier invitado, sin sesión y sin depender del navegador de la pareja. Los envíos son reales. */
function PublishedSite({ slug, lookup, children }: { slug: string; lookup: Extract<PublicLookup, { status: 'live' }>; children: ReactNode }) {
  const [taken, setTaken] = useState<string[]>(lookup.takenGiftIds);
  const actions = useMemo<SiteActions>(() => ({
    remote: true,
    given: [],
    recordRsvp: (people, contact) => sendRsvp(slug, people, contact),
    recordGift: async (gs, who, extra) => {
      if (!extra) throw new Error('No pudimos completar el envío. Probá de nuevo en un rato.');
      await sendGift(slug, gs, who, extra);
      setTaken(t => [...new Set([...t, ...gs.map(g => g.id)])]);
    },
  }), [slug, taken]);
  // Los regalos que otro invitado ya eligió se ven como «Ya elegido».
  const data = useMemo(() => ({ ...lookup.site, gifts: lookup.site.gifts.map(g => (taken.includes(g.id) ? { ...g, taken: true } : g)) }), [lookup.site, taken]);
  return <SiteProvider data={data} actions={actions}><SiteShell>{children}</SiteShell></SiteProvider>;
}

export function AppSite({ slug, remote, children }: { slug: string; remote?: PublicLookup | undefined; children: ReactNode }) {
  const search = useRouterState({ select: s => s.location.searchStr });
  const preview = isPreviewSearch(search) || stickyPreview;
  if (preview && typeof window !== 'undefined') stickyPreview = true;
  if (remote?.status === 'live' && !preview) return <PublishedSite slug={slug} lookup={remote}>{children}</PublishedSite>;
  if (remote?.status === 'unpublished' && !preview) return <Notice title="Esta página no está publicada" text="Sus dueños la bajaron por ahora. Volvé a probar más tarde." to="/" cta="Ir a Weda" />;
  return <LocalSite slug={slug}>{children}</LocalSite>;
}

function LocalSite({ slug, children }: { slug: string; children: ReactNode }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const mine = state.onboarded && siteSlug(state) === slug;
  const data = useMemo(() => {
    if (!mine) return null;
    const as = readPlanOverride();
    return siteFromState(as ? { ...state, planId: as } : state);
  }, [mine, state]);
  const actions = useMemo<SiteActions>(() => ({
    given: state.gifts.given,
    recordGift: (gs, who) => update(s => ({
      ...s, gifts: { ...s.gifts, given: [...s.gifts.given.filter(x => !gs.some(g => g.id === x.id)), ...(() => { const ref = `env-${Date.now().toString(36)}`; return gs.map(g => ({ id: g.id, name: who.name, message: who.message, how: who.how, giftName: g.name, amount: g.amount, at: Date.now(), email: who.email, ref })); })()] },
    })),
    recordRsvp: people => update(s => applyRsvp(s, people)),
  }), [state.gifts.given]);
  // Los datos de la pareja solo existen en este navegador: el título con sus nombres se pone recién al hidratar (el HTML del servidor es genérico).
  const heading = data ? `${state.couple.first} y ${state.couple.second}`.trim() : '';
  useEffect(() => {
    if (!heading) return;
    const before = document.title;
    document.title = `${heading} • Casamiento`;
    return () => { document.title = before; };
  }, [heading]);
  if (!hydrated) return <div className="dm-root"><p className="site-loading" role="status">Cargando…</p></div>;
  // Página dada de baja: solo la ve su dueño dentro de la vista previa del panel (iframe o «cómo queda con este plan»).
  const takenDown = mine && !!state.publication && !isLive(state) && !readPlanOverride() && !(typeof window !== 'undefined' && window.self !== window.top);
  if (takenDown) return <Notice title="Esta página no está publicada" text="Su dueño la bajó por ahora. Volvé a probar más tarde." to="/" cta="Ir a Weda" />;
  if (!data) return <Notice title="Este sitio no está disponible" text="Puede que el link esté mal escrito o que la página todavía no esté publicada. Podés crear la tuya o recorrer el ejemplo." to="/crear/cuenta" cta="Crear mi evento" />;
  return <SiteProvider data={data} actions={actions}><SiteShell>{children}</SiteShell></SiteProvider>;
}
