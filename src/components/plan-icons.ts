// Íconos de los planes: los usan el diálogo de publicar y la sección de planes de la landing (una sola fuente).
import { CalendarCheck, CalendarHeart, Check, CreditCard, Gift, Globe, HandHeart, Images, Link2, Music, PartyPopper, ReceiptText, Users, type LucideIcon } from 'lucide-react';
import type { HighlightIcon } from '@/lib/weda/plans';
import type { PlanId } from '@/lib/weda/types';

export const HIGHLIGHT_ICON: Record<HighlightIcon, LucideIcon> = { gift: Gift, card: CreditCard, receipt: ReceiptText, link: Link2, globe: Globe, check: CalendarCheck, users: Users, music: Music, photos: Images, heart: Check };
export const PLAN_ICON: Record<PlanId, LucideIcon> = { regalos: HandHeart, invitacion: CalendarHeart, completo: PartyPopper };
