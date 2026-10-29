# Mapa del recorrido (estado real del código, 2026-10-28)

## Pareja: de la landing a la página publicada

```
Landing (/)
 ├─ «Crear mi evento» ──► /crear/cuenta  (correo + clave; registro o ingreso)
 │                          ├─ sin servidor (backend_unavailable) ─► sigue sin cuenta, datos solo en este navegador
 │                          └─ ok ─► /crear (nombres) ─► /crear/fecha (fecha o «todavía no tenemos fecha») ─► /crear/foto (foto o «después») ─► /panel
 ├─ «Ver ejemplo» ──► /ejemplo (invitación de ejemplo; regalos y confirmación solo en la sesión)
 └─ «¿Invitado? Encontrá una lista de regalos» ──► /encontrar
/crear/plan ──► redirige a /panel (el plan se elige al publicar)

/panel (Inicio)
 ├─ Pasos: 1 Lista de regalos · 2 Diseño del sitio · 3 Publicación (el paso actual se calcula con los datos)
 ├─ /panel/regalos  ─ Mis regalos · Catálogo y packs · Aportes recibidos · Datos de cobro (alias/CBU)
 ├─ /panel/sitio    ─ «Tu invitación» (secciones en orden, subir/bajar/quitar) + «Para agregar» + vista previa en vivo (Celular/Compu)
 ├─ /panel/invitados ─ lista, alta, edición, importar Excel/CSV, exportar, mesas y grupos
 ├─ /panel/vista-previa ─ la página pública real en formato celular
 ├─ /panel/perfil ─ datos del casamiento y cuenta
 └─ «Publicar» (barra superior) ─► diálogo:
        elegir producto (Regalos · Celebración · Celebración Plus, con precio)
        └─► revisar (qué se publica, qué queda vacío, qué queda como borrador, recomendaciones, precio)
              ├─ sin cuenta ─► «Crear cuenta para publicar» ─► /crear/cuenta (lo armado pasa a la cuenta)
              └─ con cuenta ─► «Publicar» ─► servidor publica ─► «¡Tu página está publicada!» + link + copiar
                                              └─ error del servidor ─► vuelve a «revisar» con el error; nada queda publicado
        Con publicación: «Tu publicación» ─► ver link · copiar · mejorar plan · bajar la página (confirmación) · volver a publicar
```

**Puntos de decisión:** crear cuenta al principio (obligatorio para el camino principal); fecha (se puede dejar sin fecha); foto (se puede saltear); qué publicar (producto/plan) recién al final.

**Estados de error y recuperación observados:**
- Registro: correo inválido, clave débil, correo ya registrado → mensaje en el campo, el formulario conserva lo escrito.
- Guardado con cuenta que falla → aviso «No pudimos guardar tus últimos cambios» + «Reintentar ahora»; los cambios quedan en el navegador.
- Conflicto de edición en dos dispositivos → aviso y recarga desde el servidor.
- Publicar falla → error en el diálogo, no se marca como publicada.

## Invitado: de WhatsApp a confirmar y regalar

```
Link /sitio/:slug ─► Portada ─► Save the date (+ «Guardar la fecha» .ics) ─► Eventos (mapa «Cómo llegar») ─► Regalos ─► Confirmá tu asistencia ─► ... ─► Cierre
   ├─ «Confirmar asistencia» ─► pop-up: nombre, apellido, correo, asiste/no, menú ─► revisar ─► Enviar (servidor) ─► «¡Gracias!»
   └─ /sitio/:slug/regalos ─► elegir uno o varios ─► Continuar ─► alias (copiar) ─► comprobante (obligatorio) + nombre, apellido, correo + mensaje ─► Enviar ─► «Gracias por tu regalo»
         └─ correo con constancia (si hay proveedor) ─► /comprobante?aporte&token para cambiarlo
Sitio dado de baja o inexistente ─► aviso «Este sitio no está disponible»
```

## Rutas que no forman parte del camino principal
- `/comprobante` (desde el correo), `/privacidad` (borrador), `/api/unsubscribe` (baja de novedades).
