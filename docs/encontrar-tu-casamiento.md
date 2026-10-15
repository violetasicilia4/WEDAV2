# Encontrá tu casamiento (`/encontrar`)

Pantalla para que un invitado identifique el casamiento al que fue invitado buscando por los nombres de la pareja y
reconociendo la fotografía del evento.

## Alcance actual: solo demostración

- La búsqueda opera **únicamente** sobre los eventos ficticios de `src/lib/encontrar/data.ts`, que viven en el frontend.
- No hay backend, no se consulta ninguna base de datos ni se expone información personal real.
- No existe un directorio público de usuarios. Los nombres, fechas y fotos son inventados.
- Seleccionar un casamiento **no vincula ninguna cuenta**. Es solo un estado visual de la pantalla.
- Gancho de prueba: buscar la palabra `error` simula una falla del servicio.

## Estructura

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/encontrar/data.ts` | Tipo `DemoWedding`, datos ficticios y formato de fecha. |
| `src/lib/encontrar/search.ts` | Lógica de búsqueda pura (`normalize`, `checkQuery`, `matchWeddings`) y `searchWeddings` (punto de integración). |
| `src/components/find-wedding.tsx` | Interfaz y estados. Solo depende de la firma de `searchWeddings`. |
| `src/routes/encontrar.tsx` | Ruta, metadatos y marco de la página. |
| `src/encontrar.css` | Estilos, con los mismos tokens que la landing. |
| `src/test/find-wedding.test.ts` | Pruebas de la búsqueda y de los datos. |

## Cómo busca

Cada palabra buscada debe ser el comienzo de algún nombre de la misma pareja. Se ignoran mayúsculas, tildes, signos y
espacios de más, y los conectores `y`, `e`, `&`, `and`, `con`. El orden no importa: `Martina Ignacio` y
`Ignacio & Martina` dan el mismo resultado. Hacen falta al menos dos letras.

## Estados

Inicial, búsqueda en curso, resultados, ningún resultado, consulta inválida o vacía, evento seleccionado y error simulado.

## Selección y puntos de integración

- Si el evento tiene `route` (hoy solo el casamiento de ejemplo, `/ejemplo`), la confirmación ofrece ir a esa ruta real.
- Los demás eventos solo muestran el estado de selección. **Integración futura:** en `Selected` (`find-wedding.tsx`),
  navegar al espacio real del evento cuando exista esa ruta (por ejemplo `/evento/$id`).
- **Integración futura de la búsqueda:** reemplazar el cuerpo de `searchWeddings` por una llamada a la API, manteniendo
  la firma `(query, { signal }) => Promise<DemoWedding[]>`.

## Privacidad (obligatorio en producción)

En producción la búsqueda debe conectarse a un servicio que **controle qué eventos puede encontrar cada persona y qué
información puede mostrar**: por ejemplo, solo eventos que la pareja haya hecho descubribles, con datos mínimos
(nombres, fecha y portada), límites de frecuencia y sin enumeración masiva. Nada de este frontend debe tratarse como
un directorio público.
