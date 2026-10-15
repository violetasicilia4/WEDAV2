// Imágenes de relleno. Reemplaza cada `url` por la ruta de tu propia foto
// (por ejemplo "/mi-foto.jpg" guardada en la carpeta public/).
const base = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23dcdcd6'/%3E%3C/svg%3E";
const placeholder = (name: string) => ({ url: `${base}#${name}` });

export const hero = placeholder("hero");
export const duo = { url: "/lista-de-regalos-olla.jpg" };
export const routine = { url: "/lista-de-regalos-mesa.jpg" };
export const unboxing = { url: "/lista-de-regalos-lampara.jpg" };
export const capsule = placeholder("capsule");
export const microbiome = placeholder("microbiome");
export const story1 = placeholder("story1");
export const story2 = placeholder("story2");
export const alice = placeholder("alice");
export const community1 = placeholder("community1");
export const community2 = placeholder("community2");
export const community3 = placeholder("community3");
export const labsBg = placeholder("labsBg");
export const gutBg = placeholder("gutBg");
export const labs = placeholder("labs");
export const awaken = placeholder("awaken");
