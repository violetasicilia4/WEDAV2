import { createFileRoute } from '@tanstack/react-router';
import { GiftsPage } from '@/components/site/gifts-page';

export const Route = createFileRoute('/sitio/$slug/regalos')({ component: GiftsPage });
