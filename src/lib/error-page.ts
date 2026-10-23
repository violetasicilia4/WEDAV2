export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>No se pudo cargar esta página</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, Arial, sans-serif; background: #ecede7; color: #3b3c3a; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.75rem; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 0.75rem; }
      p { color: #575757; margin: 0 0 2rem; }
      .actions { display: flex; gap: 0.75rem 1.5rem; justify-content: center; align-items: center; flex-wrap: wrap; }
      a, button { font: inherit; font-size: 15px; font-weight: 500; cursor: pointer; text-decoration: none; }
      button { height: 48px; padding: 0 24px; border: 0; border-radius: 999px; }
      .primary { background: #1b3a1a; color: #f7f6f1; }
      .secondary { background: none; color: #3b3c3a; border-bottom: 1px solid currentColor; padding-bottom: 4px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>No se pudo cargar esta página</h1>
      <p>Algo salió mal de nuestro lado. Probá actualizar o volvé al inicio.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Reintentar</button>
        <a class="secondary" href="/">Ir al inicio</a>
      </div>
    </div>
  </body>
</html>`;
}
