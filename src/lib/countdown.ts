// Cuenta regresiva de la demo. Nunca devuelve valores negativos: si la fecha ya pasó, `past` es true.
export type Countdown = { past: boolean; days: number; hours: number; minutes: number; seconds: number };

export function getCountdown(targetIso: string, nowMs: number): Countdown {
  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) return { past: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const diff = target - nowMs;
  if (diff <= 0) return { past: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const s = Math.floor(diff / 1000);
  return { past: false, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
