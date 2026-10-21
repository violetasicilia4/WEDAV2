// Quién provee los datos de la página pública:
//  - DemoSite: /ejemplo (Ignacio & Martina). Los regalos elegidos duran lo que dure la sesión del navegador.
//  - AppSite: /sitio/$slug y la vista previa. Lee y escribe el estado local de la pareja (lista, invitados, respuestas).
import { useMemo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useSessionState } from '@/lib/demo-session';
import { applyRsvp, slugify } from '@/lib/weda/logic';
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

export function AppSite({ slug, children }: { slug: string; children: ReactNode }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const mine = state.onboarded && slugify(state.couple.first, state.couple.second) === slug;
  const data = useMemo(() => {
    if (!mine) return null;
    const as = readPlanOverride();
    return siteFromState(as ? { ...state, planId: as } : state);
  }, [mine, state]);
  const actions = useMemo<SiteActions>(() => ({
    given: state.gifts.given,
    recordGift: (gs, who) => update(s => ({
      ...s, gifts: { ...s.gifts, given: [...s.gifts.given.filter(x => !gs.some(g => g.id === x.id)), ...gs.map(g => ({ id: g.id, name: who.name, message: who.message, how: who.how, giftName: g.name, amount: g.amount, at: Date.now() }))] },
    })),
    recordRsvp: people => update(s => applyRsvp(s, people)),
  }), [state.gifts.given]);
  if (!hydrated) return <div className="dm-root"><p className="site-loading" role="status">Cargando…</p></div>;
  if (!data) return <Notice title="Este sitio no está disponible" text="Esta es una demostración: los sitios se guardan solo en el navegador de quien los creó. Podés crear el tuyo o recorrer el ejemplo." to="/crear/cuenta" cta="Crear mi evento" />;
  return <SiteProvider data={data} actions={actions}><SiteShell>{children}</SiteShell></SiteProvider>;
}
