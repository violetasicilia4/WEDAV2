import { createFileRoute, redirect } from '@tanstack/react-router';

/* Los grupos y las mesas son parte de Invitados: esta dirección vieja lleva a esa solapa. */
export const Route = createFileRoute('/panel/mesas')({
  beforeLoad: () => { throw redirect({ to: '/panel/invitados', search: { vista: 'mesas' }, replace: true }); },
});
