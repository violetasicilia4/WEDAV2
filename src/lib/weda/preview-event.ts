// Pedido de abrir la vista previa (la página pública vista por un invitado). Lo escucha el panel; lo puede disparar cualquier pantalla.
// `anchor`: id de la sección de la página a la que llevarla ('' o sin dato = arriba de todo).
export type PreviewPage = 'home' | 'gifts';
export const OPEN_PREVIEW = 'weda:open-preview';
export type PreviewRequest = { page: PreviewPage; anchor?: string | undefined };
export const openPreview = (page: PreviewPage, anchor?: string) => window.dispatchEvent(new CustomEvent<PreviewRequest>(OPEN_PREVIEW, { detail: { page, anchor } }));
