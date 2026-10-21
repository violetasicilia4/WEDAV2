# Rutas

TanStack Start usa **rutas por archivo**: cada `.tsx` de esta carpeta es una ruta. `src/routeTree.gen.ts` se genera solo (no se edita a mano; se versiona). El layout raíz es `__root.tsx`.

| Archivo | URL | Qué es |
| --- | --- | --- |
| `index.tsx` | `/` | Landing. |
| `crear.tsx` + `crear.*.tsx` | `/crear`, `/crear/cuenta`, `/crear/fecha`, `/crear/foto`, `/crear/plan` | Alta: registro, nombres, fecha y lugar, foto, plan. |
| `panel.tsx` + `panel.*.tsx` | `/panel`, `/panel/regalos`, `/panel/sitio`, `/panel/invitados`, `/panel/vista-previa`, `/panel/perfil` | Panel de la pareja (`panel.mesas.tsx` redirige a Invitados > Mesas). |
| `sitio.$slug*.tsx` | `/sitio/:slug`, `/sitio/:slug/regalos` | Página pública de cada pareja. |
| `ejemplo*.tsx` | `/ejemplo`, `/ejemplo/regalos` | Página pública de muestra. |
| `encontrar.tsx` | `/encontrar` | Buscador de invitados (demo). |

Convención de nombres: `padre.hijo.tsx` anida la ruta bajo `padre.tsx` (que renderiza un `<Outlet />`); `$param` es un segmento dinámico.
