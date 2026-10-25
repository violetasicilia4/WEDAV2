import {
  Outlet,
  Link,
  createRootRoute,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, pageMeta } from "@/lib/site";

import appCss from "../styles.css?url";
import typographyCss from "../typography.css?url";

// Pantallas de ruta inexistente y de error: usan el botón de la landing (.seed-button) para conservar la identidad y el contraste.
function NotFoundComponent() {
  // El <head> del servidor lo arma la ruta raíz y no sabe que es un 404: el título correcto se pone al hidratar. El 404 real y el noindex ya salen del servidor.
  useEffect(() => { document.title = "Página no encontrada • Weda"; }, []);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-foreground" aria-hidden="true">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscás no existe o se movió.
        </p>
        <div className="mt-6">
          <Button variant="seed" asChild><Link to="/">Ir al inicio</Link></Button>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No se pudo cargar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo salió mal de nuestro lado. Probá actualizar o volvé al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="seed" type="button" onClick={() => { router.invalidate(); reset(); }}>Reintentar</Button>
          <Button variant="seedLink" asChild><a href="/">Ir al inicio</a></Button>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => {
    const { meta } = pageMeta({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION });
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        ...meta,
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:locale", content: "es_AR" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "preload", href: "/fonts/geist/geist-latin-wght-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: typographyCss },
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.svg?v=3", type: "image/svg+xml" },
        { rel: "icon", href: "/favicon.ico?v=3", sizes: "any" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=3" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // Required: nested routes render here. Removing <Outlet /> breaks all child routes.
  return <Outlet />;
}
