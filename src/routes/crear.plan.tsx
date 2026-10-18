import { createFileRoute, redirect } from '@tanstack/react-router';

// El plan ya no se elige al crear el evento sino al publicar (diálogo de planes del panel). Esta ruta solo redirige los enlaces viejos.
export const Route = createFileRoute('/crear/plan')({ beforeLoad: () => { throw redirect({ to: '/panel', replace: true }); } });
