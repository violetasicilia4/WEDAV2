// Búsqueda de lugares con Google Places (API «Places (New)» de la Maps JavaScript API), sin dependencias.
// La clave es una clave de navegador de Google Cloud (restringila por dominio en la consola de Google): va en VITE_GOOGLE_MAPS_KEY
// (.env.local en desarrollo, variable de entorno al compilar en producción). Sin clave, `placesEnabled()` es falso y el editor
// muestra los campos de siempre, sin buscador.

/** `hits`: tramos de `main` que coinciden con lo escrito (para resaltarlos), como [inicio, fin). */
export type PlaceSuggestion = { id: string; main: string; secondary: string; hits: [number, number][]; select: () => Promise<PickedPlace> };
export type PickedPlace = { name: string; address: string; mapsUrl: string };

/* Tipos mínimos de lo que se usa de google.maps.places (la librería no trae tipos y no se agrega @types solo por esto). */
type FormattableText = { text: string; matches?: { startOffset?: number; endOffset: number }[] };
type PlacePrediction = { placeId: string; text: FormattableText; mainText?: FormattableText | null; secondaryText?: FormattableText | null; toPlace: () => GPlace };
type GPlace = { formattedAddress?: string | null; fetchFields: (o: { fields: string[] }) => Promise<unknown> };
type PlacesLib = {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: { fetchAutocompleteSuggestions: (req: Record<string, unknown>) => Promise<{ suggestions: { placePrediction?: PlacePrediction | null }[] }> };
};
type GoogleMaps = { maps?: { importLibrary?: (name: string) => Promise<unknown> } };

const KEY = (import.meta.env['VITE_GOOGLE_MAPS_KEY'] as string | undefined)?.trim() ?? '';

/** ¿Hay clave de Google configurada? (o una versión de prueba ya cargada en la página, para los tests) */
export const placesEnabled = () => KEY !== '' || (typeof window !== 'undefined' && !!(window as unknown as { google?: GoogleMaps }).google?.maps?.importLibrary);

let loading: Promise<PlacesLib> | null = null;

/** Carga la Maps JavaScript API una sola vez y devuelve la librería de lugares. */
function loadPlaces(): Promise<PlacesLib> {
  if (loading) return loading;
  loading = new Promise<PlacesLib>((resolve, reject) => {
    const w = window as unknown as { google?: GoogleMaps; __wedaMapsReady?: () => void };
    const ready = () => {
      const imp = w.google?.maps?.importLibrary;
      if (!imp) { reject(new Error('Google Maps no cargó')); return; }
      imp('places').then(lib => resolve(lib as PlacesLib), reject);
    };
    if (w.google?.maps?.importLibrary) { ready(); return; }
    if (!KEY) { reject(new Error('Falta VITE_GOOGLE_MAPS_KEY')); return; }
    w.__wedaMapsReady = ready;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&libraries=places&language=es&region=AR&callback=__wedaMapsReady`;
    s.async = true;
    s.onerror = () => { loading = null; reject(new Error('No se pudo conectar con Google Maps')); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Una sesión de búsqueda (Google cobra por sesión: muchas letras + una elección = una sola sesión). */
export function placesSession() {
  let token: object | null = null;
  return {
    async suggest(input: string): Promise<PlaceSuggestion[]> {
      const q = input.trim();
      if (q.length < 3) return [];
      const lib = await loadPlaces();
      token ??= new lib.AutocompleteSessionToken();
      const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: q, sessionToken: token, language: 'es', region: 'ar', includedRegionCodes: ['ar', 'uy'] });
      return suggestions.flatMap(s => {
        const p = s.placePrediction;
        if (!p) return [];
        return [{
          id: p.placeId,
          main: p.mainText?.text ?? p.text.text,
          secondary: p.secondaryText?.text ?? '',
          hits: (p.mainText?.matches ?? []).map(m => [m.startOffset ?? 0, m.endOffset] as [number, number]),
          select: async () => {
            // Solo la dirección: es un campo «Essentials» (el más barato). El nombre ya viene en la sugerencia y el enlace de Google Maps
            // se arma con el id del lugar (formato oficial de URL de Maps), así no se piden campos «Pro» como displayName o googleMapsURI.
            const place = p.toPlace();
            await place.fetchFields({ fields: ['formattedAddress'] });
            token = null; // la elección cierra la sesión
            const name = p.mainText?.text ?? p.text.text;
            const address = place.formattedAddress ?? p.secondaryText?.text ?? '';
            const query = encodeURIComponent([name, address].filter(Boolean).join(', '));
            return { name, address, mapsUrl: `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(p.placeId)}` };
          },
        }];
      });
    },
  };
}
