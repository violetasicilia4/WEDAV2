// Carga local de imágenes: no se sube nada a ningún servidor. El archivo se lee en el navegador, se reduce y se guarda
// como data URL en localStorage. LIMITACIÓN: localStorage tiene ~5 MB por sitio, por eso cada imagen se reduce a un máximo
// de lado y se comprime (≈100–250 KB). Con una API real, la imagen se subiría a un bucket y se guardaría solo su URL.
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Ese formato no sirve. Subí una foto JPG, PNG o WebP.';
  if (file.size > MAX_FILE_BYTES) return 'La foto pesa más de 8 MB. Elegí una más liviana.';
  return null;
}

export async function readImage(file: File, maxSide = 1400): Promise<{ src: string; name: string }> {
  const problem = checkImageFile(file);
  if (problem) throw new Error(problem);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No pudimos leer esa foto. Probá con otra.'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Tu navegador no pudo procesar la foto.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { src: canvas.toDataURL('image/jpeg', 0.82), name: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}
