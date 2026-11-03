import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Al apoyar el dedo o pasar el mouse sobre un enlace se baja la pantalla de destino: al tocar ya está lista.
    defaultPreload: 'intent',
  });

  return router;
};
