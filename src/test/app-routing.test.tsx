import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches the event creation flow, the panel and the couple's public site", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const path of [
      "/crear", "/crear/cuenta", "/crear/foto", "/crear/plan", "/panel", "/panel/regalos", "/panel/invitados", "/panel/mesas", "/panel/sitio", "/panel/vista-previa",
      "/sitio/tomas-y-martina", "/sitio/tomas-y-martina/regalos", "/ejemplo", "/ejemplo/regalos", "/encontrar",
    ]) {
      expect(router.matchRoutes(path).at(-1)?.routeId, path).not.toBe(rootRouteId);
    }
  });
});
