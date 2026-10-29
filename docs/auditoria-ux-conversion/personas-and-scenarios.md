# Personas y escenarios

Auditoría del 2026-10-28. 20 personas × 5 variantes (feliz, falla, interrupción, eficiencia, borde) = **100 escenarios**. El estado sale de la ejecución real: **E2E** = resultado de esa prueba en la corrida final de Playwright (`test-results.md`); **Vitest** = prueba unitaria (todas pasan en la corrida final); **Manual** = verificado en el navegador o leyendo el código durante la auditoría; **No ejecutado** = con el motivo.

## Resumen

| Estado | Escenarios |
|---|---|
| Pasa | 89 |
| Pasa (tras reintento) | 4 |
| No ejecutado | 7 |
| **Total** | **100** |

Ejecutados = todos menos «No ejecutado» y «Bloqueado».


## Persona A · Apurada

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| A-01 | Feliz | Compu 1280×800 | Registrarse y llegar al panel | landing → registro → nombres → fecha vacía → foto omitida | Llega al panel con su portada | E2E · «landing → registro → nombres → fecha y lugar vacíos» | **Pasa** |  |
| A-02 | Falla | Compu 1280×800 | Registrarse con datos mal | correo inválido y clave corta | Mensajes claros, foco al primer error, nada guardado | E2E · «correo y clave: errores claros» | **Pasa** |  |
| A-03 | Interrupción | Compu 1280×800 | Volver atrás en el alta | cargar nombres, volver, salir a la landing y regresar | Retoma sin pérdida | E2E · «a mitad del alta: volver atrás conserva» | **Pasa** |  |
| A-04 | Eficiencia | Celular 390×844 | Publicar lo más rápido posible | camino mínimo contado | ≤ 12 acciones sin decisiones obligatorias extra | E2E · «K-01: de la landing a la página publicada» | **Pasa** |  |
| A-05 | Borde | Compu 1280×800 | Saltear todo lo opcional | sin fecha, sin lugar, sin foto | El panel no se rompe y dice qué falta | E2E · «sin fecha ni lugar: portada del panel, editor» | **Pasa** |  |

## Persona B · Diseño

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| B-01 | Feliz | Compu 1280×800 | Editar y ver el cambio al instante | abrir sección, editar texto | La vista previa refleja el cambio | E2E · «el texto de la portada y los nombres se ven en la vista previa» | **Pasa** |  |
| B-02 | Falla | Celular 390×844 | Texto muy largo | escribir texto largo en una sección | Se ve en la ventana y en «Cómo queda» | E2E · «un texto largo se ve en la ventana» | **Pasa** |  |
| B-03 | Interrupción | Celular 390×844 | Recargar en medio de la edición | editar y recargar | Conserva lo escrito | E2E · «recargar en medio de la edición conserva» | **Pasa (tras reintento)** | falló en la corrida completa; pasó al reintentarla (ver test-results.md: intermitente o prueba desactualizada corregida) |
| B-04 | Eficiencia | Compu 1280×800 | Editar con la vista previa al lado | abrir secciones en compu | Dos columnas, tocar la vista previa abre la sección | E2E · «abrir una sección la marca en la vista previa» | **Pasa** |  |
| B-05 | Borde | Celular 390×844 | Bloques centrados en la invitación | medir aire arriba/abajo en 375/871/1440 | Diferencia ≤ 1 px | Manual (navegador/código) | **Pasa** | Medido en el navegador: 0–1 px de diferencia en los 4 bloques y en /ejemplo |

## Persona C · Regalos primero

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| C-01 | Feliz | Celular 390×844 | Armar la lista con un pack | Inicio → Regalos → catálogo → pack | El pack queda en la lista sin perder nada | E2E · «Flujo 1: Inicio → Regalos → catálogo → pack» | **Pasa** |  |
| C-02 | Falla | Compu 1280×800 | Regalo propio con monto inválido | monto vacío/negativo | Validación clara, nada se guarda | E2E · «un regalo propio: validación del monto» | **Pasa** |  |
| C-03 | Interrupción | Celular 390×844 | Saltear el cobro y volver | Regalos → cobro → volver sin alias | Se puede seguir sin alias | E2E · «Flujo 2: Regalos → cobro (opcional)» | **Pasa** |  |
| C-04 | Eficiencia | Celular 390×844 | Entender cómo se reciben los regalos | Ayuda → preguntas frecuentes | Respuesta: alias, transferencia directa, comprobante | Manual (navegador/código) | **Pasa** | Ayuda muestra 7 preguntas desplegables con esa respuesta |
| C-05 | Borde | Compu 1280×800 | Pack agregado aparece en la página pública | agregar pack, ver pública, quitar regalo | Aparece y desaparece en la pública | E2E · «un pack se agrega, aparece en la página pública» | **Pasa** |  |

## Persona D · Solo celular

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| D-01 | Feliz | Celular 390×844 | Editar un evento en el celular | Tu página → Eventos → editar → vista previa | Sin perder datos | E2E · «Flujo 3: Tu página → elegir Eventos» | **Pasa** |  |
| D-02 | Falla | Celular 390×844 | Campo enfocado con teclado abierto | pasar de campo en el editor | El campo no queda tapado | E2E · «con un campo enfocado» | **Pasa** |  |
| D-03 | Interrupción | Celular 390×844 | Barra fija con formulario largo | editar sección larga | «Volver» y «Listo» siempre visibles | E2E · «al editar una sección larga, volver y «Listo» siguen a la vista» | **Pasa** |  |
| D-04 | Eficiencia | Celular 390×844 | Hojas de diálogo con botones a la vista | abrir diálogos del panel | Botones visibles sin scroll | E2E · «Publicar: tres productos con precio y «Ver link»» | **Pasa** |  |
| D-05 | Borde | 320–1440 | Sin scroll lateral en 7 medidas | recorrer páginas públicas y panel | scrollWidth ≤ clientWidth | E2E · «D-05 · » | **Pasa** |  |

## Persona E · Compu

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| E-01 | Feliz | Compu 1280×800 | Dos columnas editor/vista previa | abrir Tu página | Anchos útiles, sin scroll lateral | E2E · «dos columnas: editor y vista previa a la vez» | **Pasa (tras reintento)** | falló en la corrida completa; pasó al reintentarla (ver test-results.md: intermitente o prueba desactualizada corregida) |
| E-02 | Falla | Compu 1280×800 | Guardado de cuenta que falla | cortar la red al guardar | Avisa, reintenta, no aparenta éxito | E2E · «un guardado que falla NO aparenta éxito» | **Pasa** |  |
| E-03 | Interrupción | Compu 1280×800 | Atrás/adelante y recarga en el panel | navegar con el navegador | Recorre secciones y conserva todo | E2E · «en el panel: atrás y adelante» | **Pasa** |  |
| E-04 | Eficiencia | Compu 1280×800 | Pasar de celular a compu con sección abierta | cambiar el ancho | La sección sigue abierta | E2E · «pasar de celular a compu con una sección abierta» | **Pasa** |  |
| E-05 | Borde | Compu 1280×800 | Abrir en otro dispositivo | misma cuenta, segundo navegador | Ve el mismo casamiento; otra pareja no | E2E · «el casamiento se guarda en la cuenta y se abre desde otro dispositivo» | **Pasa** |  |

## Persona F · Indecisa

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| F-01 | Feliz | Compu 1280×800 | Cambiar nombres y fecha | Datos del casamiento | Se refleja en Inicio, estado y vista previa | E2E · «cambiar los nombres y la fecha desde «Datos del casamiento»» | **Pasa** |  |
| F-02 | Falla | Compu 1280×800 | Comparar planes y volver | elegir plan, volver, elegir otro | No publica nada hasta confirmar; nunca «Pagar» | E2E · «elegir un plan, volver atrás y elegir otro» | **Pasa** |  |
| F-03 | Interrupción | Compu 1280×800 | Reabrir el diálogo de publicar | cerrar y abrir | Vuelve a la elección de producto | E2E · «elegir un plan, volver atrás y elegir otro» | **Pasa** |  |
| F-04 | Eficiencia | Compu 1280×800 | Siguiente paso único en el Inicio | abrir el Inicio | Un solo paso destacado, nada obligatorio antes de publicar | E2E · «el siguiente paso del Inicio es único» | **Pasa** |  |
| F-05 | Borde | Celular 390×844 | Reordenar secciones y recargar | subir/bajar y recargar | Orden conservado en la pública | E2E · «Flujo 4b: reordenar secciones» | **Pasa** |  |

## Persona G · Datos incompletos

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| G-01 | Feliz | Compu 1280×800 | Seguir sin fecha | dejar la fecha vacía | Se avanza; el panel lo indica | E2E · «sin fecha ni lugar: el panel lo dice» | **Pasa** |  |
| G-02 | Falla | Compu 1280×800 | Fecha pasada o inexistente | escribir 2020-01-01 | Se explica y no avanza | E2E · «fecha pasada o inexistente» | **Pasa** |  |
| G-03 | Interrupción | Celular 390×844 | Evento con nombre pero sin lugar | tildar «Mostrar», escribir solo el nombre | Aparece con «Lugar a confirmar» | Vitest · «aparece apenas tiene nombre» | **Pasa** |  |
| G-04 | Eficiencia | Celular 390×844 | Con un evento alcanza | un evento completo y otros vacíos | No quedan pendientes | Vitest · «con un solo evento completo alcanza» | **Pasa** |  |
| G-05 | Borde | Celular 390×844 | Save the date sin fecha | sin fecha | Queda en la lista esperando la fecha, no aparece en la pública | E2E · «sin fecha, «Save the date» queda en la lista» | **Pasa** |  |

## Persona H · Errores

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| H-01 | Feliz | Compu 1280×800 | Corregir nombres inválidos | vacíos o con números | Mensaje y se corrige | E2E · «nombres: vacíos o con números se rechazan» | **Pasa** |  |
| H-02 | Falla | Compu 1280×800 | Nombres con emoji/HTML/40+ letras | pegar valores raros | Se rechazan sin cambiar nada | E2E · «nombres con emoji, etiquetas HTML» | **Pasa** |  |
| H-03 | Interrupción | Celular 390×844 | Foto que no es foto | subir un PDF como foto | Explica el motivo, no cambia nada | E2E · «un archivo que no es una foto» | **Pasa** |  |
| H-04 | Eficiencia | Compu 1280×800 | Doble envío de confirmación | enviar dos veces | No duplica a la persona | E2E · «la confirmación hecha en el sitio público llega a la lista» | **Pasa** |  |
| H-05 | Borde | Compu 1280×800 | Texto con HTML en un regalo | regalo propio con <script> y emoji | Se muestra como texto | E2E · «el texto libre (un regalo propio con HTML y emoji)» | **Pasa** |  |

## Persona I · Abandona y vuelve

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| I-01 | Feliz | Celular 390×844 | Registrarse con el evento empezado | nombres cargados → registro | Se conserva el progreso | E2E · «4. onboarding empezado» | **Pasa** |  |
| I-02 | Falla | Compu 1280×800 | Guardado corrupto | localStorage inválido | No rompe: vuelve al alta | E2E · «un guardado corrupto o de una versión desconocida» | **Pasa** |  |
| I-03 | Interrupción | Celular 390×844 | Ingresar con evento guardado | evento completo → ingresar | Va al panel sin repetir el alta | E2E · «5. evento completo → ingresar» | **Pasa** |  |
| I-04 | Eficiencia | Celular 390×844 | Registro con evento completo | evento → registrarse | Se conserva y sigue al panel | E2E · «1. evento completo → registrarse con correo» | **Pasa** |  |
| I-05 | Borde | Compu 1280×800 | Conflicto entre dos pestañas/dispositivos | editar en dos lugares | Aviso y recarga desde el servidor | — | **No ejecutado** | no hay prueba automatizada del conflicto de revisión desde la interfaz; está cubierto en el servidor (test unitario de revisión optimista) |

## Persona J · Poca experiencia digital

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| J-01 | Feliz | Compu 1280×800 | Entender que hay que crear cuenta para publicar | publicar sin cuenta | Pide cuenta; nada se muestra como publicado | E2E · «Flujo 7: sin cuenta, publicar pide crear la cuenta» | **Pasa (tras reintento)** | falló en la corrida completa; pasó al reintentarla (ver test-results.md: intermitente o prueba desactualizada corregida) |
| J-02 | Falla | Compu 1280×800 | Creer que pagó sin pagar | publicar con cuenta | Nunca «Pagar/Pagaste/Total pagado» | E2E · «publicar con el plan Celebración: link, estado «Publicada»» | **Pasa** |  |
| J-03 | Interrupción | Celular 390×844 | Texto del paso de foto sin jerga | leer el paso | Sin «microsite», «slug», «RSVP» | E2E · «el texto del paso es claro» | **Pasa** |  |
| J-04 | Eficiencia | Compu 1280×800 | Registrarse con Google sin que exista | buscar el botón | No hay botón que prometa algo que no hace | E2E · «2. no hay botones de Google ni Apple» | **Pasa** |  |
| J-05 | Borde | Celular 390×844 | Ayuda y contacto | abrir Ayuda | Preguntas frecuentes + hola@weda.app | Manual (navegador/código) | **Pasa** | Verificado en el navegador |

## Persona K · Publicar ya

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| K-01 | Feliz | Celular 390×844 | Camino mínimo a publicada | contar acciones | 12 acciones | E2E · «K-01: de la landing a la página publicada» | **Pasa** |  |
| K-02 | Falla | Celular 390×844 | Publicar con pendientes | publicar sin regalos ni fecha | Recomendaciones, no bloqueos | E2E · «sin fecha ni lugar: el panel lo dice» | **Pasa** |  |
| K-03 | Interrupción | Celular 390×844 | Despublicar y volver a publicar | bajar y publicar | La pública se cierra y se abre | E2E · «despublicar cierra el sitio» | **Pasa** |  |
| K-04 | Eficiencia | Celular 390×844 | Otro dispositivo ve la publicación | abrir en otro navegador | No vuelve a pedir publicar | E2E · «otro dispositivo ve que la página ya está publicada» | **Pasa** |  |
| K-05 | Borde | Celular 390×844 | «Ver link» de cada producto | abrir «Ver link» en Publicar | Muestra la sección de regalos cuando corresponde | E2E · «Publicar → «Ver link» de Celebración» | **Pasa** |  |

## Persona L · Casamiento grande

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| L-01 | Feliz | Celular 390×844 | Mosaico de 1 a 8 fotos | cargar fotos | Sin superponerse | E2E · «Mosaico de fotos» | **Pasa** |  |
| L-02 | Falla | Celular 390×844 | Importar planilla con errores | filas mezcladas | Indica filas con error, no cambia hasta confirmar | E2E · «importar una planilla con errores» | **Pasa** |  |
| L-03 | Interrupción | Celular 390×844 | Mesas: borrar una mesa | asignar y borrar la mesa | La persona queda sin mesa, no se borra | E2E · «crear una mesa, asignarle una persona» | **Pasa** |  |
| L-04 | Eficiencia | Celular 390×844 | Varios eventos con lugar | tres eventos con dirección y mapa | «Cómo llegar» a Maps por evento | E2E · «Flujo 4c: dirección corta con «Cómo llegar»» | **Pasa (tras reintento)** | falló en la corrida completa; pasó al reintentarla (ver test-results.md: intermitente o prueba desactualizada corregida) |
| L-05 | Borde | — | 500 invitados y 100 regalos | cargar listas grandes | Sin trabas | — | **No ejecutado** | no hay fixture de volumen; queda como prueba de rendimiento pendiente |

## Persona M · Cambia de idea

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| M-01 | Feliz | Celular 390×844 | Quitar y volver a agregar una sección | quitar, agregar | Vuelve con lo cargado | E2E · «Flujo 4: quitar y volver a agregar una sección» | **Pasa** |  |
| M-02 | Falla | Celular 390×844 | Quitar un regalo de nombre largo | quitar y «Deshacer» | «Deshacer» visible y devuelve | E2E · «quitar un regalo de nombre largo» | **Pasa** |  |
| M-03 | Interrupción | Celular 390×844 | Eliminar un invitado y deshacer | eliminar y «Deshacer» | Lo devuelve | E2E · «Invitados: se elimina desde la hoja de edición» | **Pasa** |  |
| M-04 | Eficiencia | Celular 390×844 | Save the date opcional | quitar y volver a agregar | Desaparece de la pública y vuelve | E2E · ««Save the date» es opcional» | **Pasa** |  |
| M-05 | Borde | Celular 390×844 | Mover el save the date y recargar | subir/bajar y recargar | Se conserva | E2E · «el lugar elegido se conserva al recargar» | **Pasa** |  |

## Persona N · Lista para pagar

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| N-01 | Feliz | Compu 1280×800 | Ver precio y qué se publica | Publicar → elegir producto | Precio, duración (6 meses), qué se publica | E2E · «elegir un plan, volver atrás y elegir otro» | **Pasa** |  |
| N-02 | Falla | — | Pagar con tarjeta real | checkout | Cobro confirmado por proveedor | — | **No ejecutado** | no existe proveedor de pagos (backend-dependencies D1); no se hicieron pagos |
| N-03 | Interrupción | — | Pago rechazado | simular rechazo | No se marca pagado ni publicado | — | **No ejecutado** | sin proveedor no hay estado de rechazo que probar (D1) |
| N-04 | Eficiencia | Compu 1280×800 | Precios iguales en landing y publicar | comparar | Mismos precios (desde plans.ts) | E2E · «planes: precios intactos» | **Pasa** |  |
| N-05 | Borde | Compu 1280×800 | Confirmación de publicación | publicar | Título «¡Tu página está publicada!», link y copiar | E2E · «publicar con el plan Celebración: link, estado «Publicada»» | **Pasa** |  |

## Persona O · Pago interrumpido

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| O-01 | Feliz | — | Cerrar la ventana de pago | checkout externo | Orden pendiente, no publicada | — | **No ejecutado** | sin checkout externo (D1) |
| O-02 | Falla | Compu 1280×800 | Doble clic en Publicar | tocar dos veces | Un solo envío (botón deshabilitado mientras publica) | Manual (navegador/código) | **Pasa** | El botón se deshabilita en «Publicando…» y pay() ignora clics mientras step = paying |
| O-03 | Interrupción | Compu 1280×800 | Recargar durante la publicación | recargar a mitad | No queda publicada a medias: la verdad es el servidor | — | **No ejecutado** | no automatizado (requiere cortar la red en el momento justo) |
| O-04 | Eficiencia | Compu 1280×800 | Servidor falla al publicar | error del servidor | Error en el diálogo, nada publicado | E2E · «un guardado que falla NO aparenta éxito» | **Pasa** |  |
| O-05 | Borde | Celular 390×844 | Publicación local vieja sin cuenta | estado local con publication | No se muestra como «Publicada» | Manual (navegador/código) | **Pasa** | Revisado en código: sin cuenta, pub = null y la cabecera dice «Publicar»; cubierto por Flujo 7 |

## Persona P · Invitado (pública)

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| P-01 | Feliz | Celular 390×844 | Abrir la invitación y ver todo | abrir /sitio/:slug | Fecha, eventos, mapa, regalos, confirmar | E2E · «un invitado sin sesión abre el sitio, confirma» | **Pasa** |  |
| P-02 | Falla | Celular 390×844 | Llegar a /encontrar sin link | escribir nombres | Explica que pegue el link | E2E · «P-02/P-05» | **Pasa** |  |
| P-03 | Interrupción | Celular 390×844 | Sitio dado de baja | abrir sitio despublicado | Aviso «no disponible» | E2E · «despublicar cierra el sitio» | **Pasa** |  |
| P-04 | Eficiencia | Celular 390×844 | Títulos sin cortes ni scroll lateral | 320–430 px | Sin cortes ni scroll | E2E · «Tipografía: en la página pública ningún título» | **Pasa** |  |
| P-05 | Borde | Celular 390×844 | Link de invitación inexistente | pegar link a slug inexistente | Aviso «Este sitio no está disponible» | E2E · «P-02/P-05» | **Pasa** |  |

## Persona Q · Invitado confirma

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| Q-01 | Feliz | Celular 390×844 | Confirmar asistencia | completar y enviar | Llega al panel | E2E · «un invitado sin sesión abre el sitio, confirma» | **Pasa** |  |
| Q-02 | Falla | Celular 390×844 | Sin red al confirmar | cortar la red | No simula el envío; reintentar no duplica | E2E · «un invitado sin sesión abre el sitio, confirma» | **Pasa** |  |
| Q-03 | Interrupción | Compu 1280×800 | Cambiar la respuesta | confirmar y luego declinar | Actualiza a la misma persona | Vitest · «cambiar la respuesta actualiza a la misma persona» | **Pasa** |  |
| Q-04 | Eficiencia | Compu 1280×800 | Confirmar dos veces | enviar dos veces | No duplica | E2E · «la confirmación hecha en el sitio público llega a la lista» | **Pasa** |  |
| Q-05 | Borde | Celular 390×844 | Correo inválido al confirmar | correo mal escrito | «Escribí un correo válido.» | Manual (navegador/código) | **Pasa** | Validación del formulario (isEmail); el servidor ignora correos inválidos (test unitario del servidor) |

## Persona R · Importa invitados

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| R-01 | Feliz | Celular 390×844 | Importar y exportar | importar planilla válida y exportar | Alta y exportación | E2E · «Flujo 5: invitados → alta manual → importar» | **Pasa** |  |
| R-02 | Falla | Compu 1280×800 | Filas con errores | planilla mixta | Muestra filas con error | E2E · «importar una planilla con errores» | **Pasa** |  |
| R-03 | Interrupción | Compu 1280×800 | Reintentar la importación | corregir y reimportar | Se puede reintentar | E2E · «importar una planilla con errores» | **Pasa** |  |
| R-04 | Eficiencia | Celular 390×844 | Duplicados | planilla con duplicados | Los detecta | E2E · «Flujo 5: invitados → alta manual → importar (duplicados» | **Pasa** |  |
| R-05 | Borde | Celular 390×844 | Nombre largo al borrar | eliminar invitado de 38+38 letras | «Deshacer» visible | E2E · «eliminar un invitado de nombre largo» | **Pasa** |  |

## Persona S · Gestiona regalos

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| S-01 | Feliz | Celular 390×844 | Agregar y quitar desde el catálogo | tarjeta del catálogo | Se agrega y se quita | E2E · «Regalos: un regalo individual del catálogo» | **Pasa** |  |
| S-02 | Falla | — | Regalar sin comprobante (invitado) | enviar sin archivo | No se registra (receipt_required) | Vitest · «sin comprobante no se registra el regalo» | **Pasa** |  |
| S-03 | Interrupción | — | Corte de red al regalar | abortar el envío y reintentar | No queda regalo sin comprobante; no duplica | E2E · «un regalo queda «pendiente de revisión»» | **Pasa** |  |
| S-04 | Eficiencia | Celular 390×844 | Pack marcado «En tu lista» | agregar pack | Se marca y se edita en «Mis regalos» | E2E · «Regalos: un pack agregado se marca» | **Pasa** |  |
| S-05 | Borde | — | Confirmar aporte sin comprobante | confirmar uno viejo sin archivo | 409 receipt_required | Vitest · «sin comprobante no se registra el regalo, y no se puede confirmar» | **Pasa** |  |

## Persona T · Publicada, vuelve a editar

| ID | Tipo | Dispositivo | Objetivo | Acciones | Esperado | Cómo se ejecutó | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| T-01 | Feliz | Compu 1280×800 | Despublicar y republicar | bajar y volver a publicar | Se cierra y se abre | E2E · «despublicar cierra el sitio» | **Pasa** |  |
| T-02 | Falla | — | Editar después de publicar | cambiar el lugar con la página publicada | Se ve recién al volver a publicar (snapshot) | E2E · «T-02: lo editado después de publicar» | **Pasa** |  |
| T-03 | Interrupción | Compu 1280×800 | Link estable | publicar dos veces | Mismo slug | E2E · «publicar con el plan Celebración: link, estado «Publicada»» | **Pasa** |  |
| T-04 | Eficiencia | — | Ver regalos recibidos con comprobante | Aportes recibidos | Quién, regalos, monto, fecha, mensaje, comprobante | Vitest · «del servidor: comprobante para ver o «falta»» | **Pasa** |  |
| T-05 | Borde | — | Vencimiento de la publicación | pasar 6 meses | La pública dice vencida | — | **No ejecutado** | el servidor no aplica vencimiento (D7) |
