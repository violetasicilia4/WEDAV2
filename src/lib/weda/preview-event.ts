// Pedido de abrir la vista previa (la página pública vista por un invitado). Lo escucha el panel; lo puede disparar cualquier pantalla.
export type PreviewPage = 'home' | 'gifts';
export const OPEN_PREVIEW = 'weda:open-preview';
export const openPreview = (page: PreviewPage) => window.dispatchEvent(new CustomEvent<{ page: PreviewPage }>(OPEN_PREVIEW, { detail: { page } }));
