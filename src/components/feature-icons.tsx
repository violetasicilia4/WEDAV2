// Iconos lineales de las tres funcionalidades: misma grilla (48x48), mismo trazo y mismo color (currentColor).
const base = { viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function GiftIcon() {
  return (
    <svg {...base}>
      <rect x="9" y="21" width="30" height="19" rx="2.5" />
      <rect x="6" y="14" width="36" height="7" rx="2" />
      <path d="M24 14v26" />
      <path d="M24 14c-2.5-5.5-9.5-6-9.5-2.5S21 14 24 14Z" />
      <path d="M24 14c2.5-5.5 9.5-6 9.5-2.5S27 14 24 14Z" />
    </svg>
  );
}

export function SiteIcon() {
  return (
    <svg {...base}>
      <rect x="5" y="10" width="38" height="28" rx="3" />
      <path d="M5 18h38" />
      <path d="M10.5 14h.01M14.5 14h.01M18.5 14h.01" />
      <path d="M13 26h14M13 31h22" />
    </svg>
  );
}

export function RsvpIcon() {
  return (
    <svg {...base}>
      <rect x="7" y="11" width="34" height="29" rx="3" />
      <path d="M7 19h34" />
      <path d="M16 7v7M32 7v7" />
      <path d="m18 29.5 4.5 4.5L31 25" />
    </svg>
  );
}
