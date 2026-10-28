import type { Page } from '@playwright/test';
import { expect, nav, onboard, stored, test } from './helpers';

/* Buscador de lugares (Google Places) en los eventos de «Tu página». La API real no se llama en las pruebas: se simula
   google.maps.importLibrary('places') con dos resultados, igual que la «Places API (New)» (AutocompleteSuggestion + toPlace().fetchFields). */
async function fakeGoogle(page: Page) {
  await page.addInitScript(() => {
    const places = [
      { placeId: 'p1', main: 'Parroquia San Isidro Labrador', secondary: 'Av. del Libertador 16200, San Isidro, Provincia de Buenos Aires', url: 'https://maps.google.com/?cid=111' },
      { placeId: 'p2', main: 'Catedral de San Isidro', secondary: 'Av. Centenario 1, San Isidro, Provincia de Buenos Aires', url: 'https://maps.google.com/?cid=222' },
    ];
    const lib = {
      AutocompleteSessionToken: class {},
      AutocompleteSuggestion: {
        fetchAutocompleteSuggestions: async ({ input }: { input: string }) => ({
          suggestions: places.filter(p => (p.main + ' ' + p.secondary).toLowerCase().includes(String(input).toLowerCase())).map(p => ({
            placePrediction: {
              placeId: p.placeId, text: { text: `${p.main}, ${p.secondary}` }, mainText: { text: p.main }, secondaryText: { text: p.secondary },
              toPlace: () => ({ displayName: p.main, formattedAddress: p.secondary, googleMapsURI: p.url, fetchFields: async () => undefined }),
            },
          })),
        }),
      },
    };
    (window as unknown as { google: unknown }).google = { maps: { importLibrary: async () => lib } };
  });
}

test.describe('Eventos: buscar el lugar con Google', () => {
  test('se escribe, aparece la lista, se elige con el teclado y queda confirmado con su punto en el mapa', async ({ page }) => {
    await fakeGoogle(page);
    await onboard(page);
    await nav(page, 'Tu página').click();
    await page.getByRole('button', { name: /^Editar Eventos/ }).click();
    if ((await page.locator('#sec-ceremonia').getAttribute('aria-expanded')) !== 'true') await page.locator('#sec-ceremonia').click();
    // Ya no hay campo para pegar un enlace ni texto sobre lo que muestra la tarjeta.
    await expect(page.getByLabel('Enlace de Google Maps')).toHaveCount(0);
    await expect(page.getByText(/En la tarjeta se ve/)).toHaveCount(0);

    const box = page.getByRole('combobox', { name: 'Ubicación' });
    await box.fill('san isidro');
    const options = page.getByRole('listbox', { name: 'Lugares encontrados' }).getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Parroquia San Isidro Labrador');
    await box.press('ArrowDown');                       // la segunda
    await box.press('Enter');
    // El campo queda con la dirección corta (no el enlace) y avisa que «Cómo llegar» abre ese lugar.
    await expect(box).toHaveValue('Av. Centenario 1');
    await expect(page.getByText(/Ubicación confirmada/)).toBeVisible();
    await expect(page.getByText(/google\.com\/maps/)).toHaveCount(0);
    const url = 'https://www.google.com/maps/search/?api=1&query=Catedral%20de%20San%20Isidro%2C%20Av.%20Centenario%201%2C%20San%20Isidro%2C%20Provincia%20de%20Buenos%20Aires&query_place_id=p2';
    await expect.poll(async () => (await stored(page)).site.events[0]).toMatchObject({ name: 'Catedral de San Isidro', address: 'Av. Centenario 1, San Isidro, Provincia de Buenos Aires', mapsUrl: url });
    // El nombre se puede retocar; «Cómo llegar» de la invitación abre el lugar elegido.
    await expect(page.getByLabel('Nombre del lugar')).toHaveValue('Catedral de San Isidro');
    await expect(page.frameLocator('.lc-frame').locator('#dia a', { hasText: /Cómo llegar/i }).first()).toHaveAttribute('href', url);

    // Volver a escribir busca de nuevo; Escape deja el lugar que estaba.
    await box.fill('parro');
    await expect(options).toHaveCount(1);
    await box.press('Escape');
    await expect(box).toHaveValue('Av. Centenario 1');
  });

  test('si no encuentra el lugar, lo dice y no cambia nada', async ({ page }) => {
    await fakeGoogle(page);
    await onboard(page);
    await nav(page, 'Tu página').click();
    await page.getByRole('button', { name: /^Editar Eventos/ }).click();
    if ((await page.locator('#sec-ceremonia').getAttribute('aria-expanded')) !== 'true') await page.locator('#sec-ceremonia').click();
    await page.getByRole('combobox', { name: 'Ubicación' }).fill('zzzz');
    await expect(page.getByText('No encontramos ese lugar.', { exact: false })).toBeVisible();
    expect((await stored(page)).site.events[0].mapsUrl).toBe('');
  });
});
