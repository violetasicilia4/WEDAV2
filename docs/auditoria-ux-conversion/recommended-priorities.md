# Próximas 10 prioridades

Ordenadas por impacto en la persona, relevancia para la conversión, esfuerzo y dependencias. Esfuerzo: S (≤ 1 día), M (2–5 días), L (> 1 semana).

| # | Mejora | Por qué | Esfuerzo | Depende de |
|---|---|---|---|---|
| 1 | **Proveedor de pagos** (Mercado Pago), orden `pending → paid` por webhook y `WEDA_REQUIRE_PAID_ORDER=true` | Hoy publicar no cobra: no hay negocio. La interfaz ya no simula el pago | L | Cuenta del proveedor, decisión de reembolsos |
| 2 | **Recuperar la clave** («¿Olvidaste tu clave?») | Quien no recuerda la clave hoy no tiene salida | M | Proveedor de correo (3) |
| 3 | **Configurar el correo** (Resend + dominio verificado) | Constancias, recordatorios, recuperar clave | S | Cuenta de Resend, DNS |
| 4 | **Términos de uso y política de privacidad definitivos** | El registro los menciona; requisito legal y de confianza | M | Abogado |
| 5 | **Aviso de «cambios sin publicar»** en el panel | Hoy la pareja tiene que acordarse de «Publicar los cambios» | S–M | Que el servidor exponga la fecha del borrador y la de lo publicado |
| 6 | **Testimonios reales** o quitarlos | Confianza y riesgo de publicidad engañosa | S | Clientes reales con consentimiento |
| 7 | **Analítica mínima del embudo** (11 eventos de `conversion-and-friction.md`) | Para medir dónde abandonan en vez de suponerlo | M | Herramienta (Plausible o PostHog con privacidad) |
| 8 | **Vencimiento real de la publicación** (6 meses) en el servidor | La interfaz promete una duración que el servidor no aplica | S | — |
| 9 | **Almacenamiento de fotos** fuera del borrador | Con varias fotos se llega al límite de 6 MB; sin cuenta, al del navegador | M | Almacenamiento de archivos |
| 10 | **Unir nombres y fecha en una pantalla** del alta | Una pantalla y una acción menos; medir antes con analítica (7) | S | (7) para validar |
