/* Ícono del botón que abre y cierra el menú lateral: tres rayitas (hamburguesa), con el mismo trazo que los íconos del menú (24 px, 1.5). */
export function SideMenuIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
