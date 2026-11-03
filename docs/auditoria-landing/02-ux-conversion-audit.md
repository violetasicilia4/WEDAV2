# 02 · Auditoría de UX y conversión

Mirada de una pareja que llega desde Instagram al celular y no conoce Weda. No hay datos de analítica: **todo impacto comercial es una hipótesis razonada**.

## Las 12 preguntas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Entiendo en segundos qué ofrece Weda? | **Sí, por la bajada**: «Creá el sitio de tu casamiento, armá tu lista de regalos y organizá tus invitados.» El título es emocional y no dice qué es; se apoya en la bajada. |
| 2 | ¿Entiendo el diferencial? | **No en la primera pantalla.** «Sin comisión» y la lista como protagonista aparecen en el bloque Regalos, a unos 2.400 px en 390×844 (tercera pantalla). En el hero, la lista es el segundo ítem de la bajada. |
| 3 | ¿Me queda claro cómo funciona? | Parcialmente. Las demos muestran qué se ve, pero no hay un «cómo funciona» en pasos: los cuatro pasos de Regalos se reemplazaron por las tres ventajas. La FAQ que lo explica vive solo en `/lista-de-regalos`. |
| 4 | ¿Entiendo que recibo regalos sin comisión? | Sí, cuando llego a Regalos: «Tus invitados transfieren directo al alias o CBU que cargaste. Weda no cobra ni mueve el dinero de los regalos.» Es claro y verdadero. |
| 5 | ¿Entiendo cómo elijo y organizo los regalos? | Bastante: demo de la lista, filtros por monto y «Regalos recibidos» con nombres. Falta decir que hay sets armados o que se pueden crear regalos propios; eso está solo en `/lista-de-regalos`. |
| 6 | ¿Me atrae registrarme? | Sí, en lo visual. Hay 8 CTA hacia el registro, todos con el mismo destino. |
| 7 | ¿Sé qué pasa al tocar cada CTA? | Casi siempre. «Crear mi evento» lleva al registro, bien. «Iniciar sesión» lleva a una pantalla titulada «Crear mi evento • Weda» con el título «¡Bienvenidos!» (F-14). Las tarjetas de demo llevan al registro aunque parecen «Regalar» (F-22). |
| 8 | ¿Encuentro obstáculos antes de empezar? | **Sí, en producción**: el registro no crea la cuenta y no lo dice (F-01). En local, el registro pide dos campos y es corto. |
| 9 | ¿Tengo elementos para confiar? | Algunos: testimonios reales con foto, la frase honesta sobre el dinero, precios a la vista, términos y privacidad. Faltan quién está detrás de Weda, contacto, una FAQ en la landing y qué pasa si algo sale mal con una transferencia. |
| 10 | ¿Los planes se entienden? | Sí: tres planes acumulativos, «pago único», con «Ver lo que incluye». Dos problemas de contenido: «tarjeta» (F-02) y «Publicada 6 meses», que contradice la decisión vigente de 12 meses (F-25). |
| 11 | ¿Puedo decidir sin releer? | Sí, aunque los planes no tienen acción (F-12) y obligan a bajar hasta el cierre. |
| 12 | ¿Hay un momento en que pierdo interés? | Hipótesis: las tres hojas de Regalos ocupan tres pantallas enteras con espacio vacío (F-19). Después vienen Testimonios y Planes sin acción. Entre Regalos y el cierre, solo el pie de Regalos ofrece registrarse. |

## Inventario de CTA (medido: 24 links en la landing, todos responden 200 o son anclas existentes)

| CTA | Lugar | Destino | Observación |
|---|---|---|---|
| «Crear mi evento» | Barra (compu y celular) | `/crear/cuenta` | Bien. Precarga del registro en reposo. |
| «Iniciar sesión» | Barra (compu); menú (celular) | `/crear/cuenta?modo=ingresar` | Destino correcto. El título de la pestaña dice «Crear mi evento». En celular queda escondido en el menú. |
| «Crear mi evento» | Hero | `/crear/cuenta` | Verde, 44 px. Contraste 3,08:1 (F-08). |
| «Ver ejemplo» | Hero | `/ejemplo` | Bien: el sitio de ejemplo navegable es una gran prueba. |
| Tarjetas «Lista / Sitio / Confirmación» | «Todo para compartir» | `/crear/cuenta` | Toda la tarjeta es un link (F-22). |
| «Crear mi evento →» | Pie de «Todo para compartir» | `/crear/cuenta` | Bien centrado en celular. |
| «Crear mi lista de regalos» | Última hoja de Regalos | `/crear/cuenta` | Bien. |
| «Ver lo que incluye» | Planes | Diálogo | Funciona (test). Sin acción después (F-12). |
| «Crear mi evento» / «Encontrá una lista de regalos» | Cierre | `/crear/cuenta`, `/encontrar` | Bien. |
| «¿Invitado? Encontrá una lista de regalos» | Barra superior | `/encontrar` | Bien: separa al invitado temprano. |
| Pie: «Lista de regalos», «Sitio del casamiento», «Confirmación de asistencia», «Ver ejemplo» | Pie | `/lista-de-regalos`, `/ejemplo`, `/#products`, `/ejemplo` | «Sitio del casamiento» y «Ver ejemplo» van al mismo lugar (F-23). |

- **Doble clic y estados de carga:** el botón «Registrarme» se deshabilita mientras espera la respuesta (`busy` en `crear.cuenta.tsx`). Bien.
- **Enlaces sin destino o botones falsos:** no hay links rotos ni con `href="#"`. «Registrarme con Google» es un botón visible que no inicia sesión (F-13).

## Fricción de registro

- **Cantidad de pasos:**
  - Registro: correo y clave (2 campos).
  - Onboarding: 3 pantallas (nombres; fecha y lugar; foto).
  - La clave exige 8 caracteres con mayúscula, minúscula y número, y la regla se muestra debajo del campo. Bien.
- **Continuidad visual:** el registro aparece sobre la landing oscurecida, pero esa landing es otra copia cargada en un `iframe` (F-03).

## Hallazgos

### F-01 · En producción no se pueden crear cuentas ni iniciar sesión, y la interfaz sigue como si nada
| Campo | Detalle |
|---|---|
| Categoría | Funcional / conversión / datos |
| Severidad | **P0** |
| Página / componente | `/crear/cuenta` (registro e ingreso); API `/api/*` |
| Dispositivo | Todos, en `weda-v2.vercel.app` y `www.weda.app` |
| Problema | La API del sitio publicado no tiene base de datos. Ante eso, el registro **continúa al onboarding sin crear la cuenta** y sin avisar en pantalla. «Iniciar sesión» entra por la misma rama. |
| Evidencia | `GET https://weda-v2.vercel.app/api/me` → `503 {"error":"backend_unavailable"}`; lo mismo en `www.weda.app/api/me` y en `/api/public/*`. Solo `/api/health` responde 200. En `src/routes/crear.cuenta.tsx:66-70`, si el código es `backend_unavailable`, guarda el correo localmente, llama a `setNotice(...)` y sigue con `next()`. El aviso solo se muestra en `src/routes/panel.tsx`, no en el onboarding. Reproducido en local respondiendo 503 desde la prueba, sin crear datos: después de «Registrarme» aparece «Conozcámonos. ¿Cómo se llaman?» sin ningún mensaje. `PRODUCT.md` confirma que no hay hosting de producción (DP-14). |
| Impacto en el usuario | La pareja cree que tiene cuenta. Su casamiento queda solo en ese navegador. Si cambia de dispositivo, borra datos o vuelve a «Iniciar sesión», no hay cuenta. |
| Impacto comercial | Hipótesis: todo registro que entre por publicidad se pierde, y además se genera desconfianza. |
| Recomendación | (a) Habilitar la base de datos en el hosting de producción (decisión DP-14). (b) Mientras no exista: no ofrecer «Registrarme» ni «Iniciar sesión» como si funcionaran. Decir antes del formulario que las cuentas todavía no están disponibles y que el armado queda guardado en este navegador, o mostrar el aviso en la primera pantalla del onboarding. (c) Nunca tratar un login fallido como exitoso. |
| Esfuerzo | (a) M–L de infraestructura · (b) S |
| Dependencias | Decisión de hosting (DP-14). |
| Criterio de aceptación | En producción, `GET /api/me` responde 200 o 401. Si responde 503, la persona ve un mensaje explícito antes o en el momento del registro, y «Iniciar sesión» nunca la deja pasar. |

### F-02 · El plan Regalos promete «tarjeta» y la tarjeta no existe
| Campo | Detalle |
|---|---|
| Categoría | Contenido / confianza / legal |
| Severidad | **P1** |
| Página / componente | Planes (`src/lib/weda/plans.ts:51`, ítems del plan Regalos) |
| Dispositivo | Todos |
| Problema | La tarjeta del plan Regalos dice «Alias y tarjeta para recibir» y en «Ver lo que incluye» aparece «Alias y tarjeta como medios para recibir regalos». No hay cobro con tarjeta: la página de regalos muestra «El pago con tarjeta todavía no está disponible». La FAQ de `/lista-de-regalos` dice «Todavía no». |
| Evidencia | `plans.ts:51` y los ítems. `PRODUCT.md`: «El plan Regalos menciona "tarjeta", que no existe (DP-18, DP-20)». |
| Impacto en el usuario | Expectativa falsa en el momento de pagar. |
| Impacto comercial | Riesgo de reclamo por publicidad engañosa (el propio código cita la Ley 24.240 para los testimonios) y pérdida de confianza. |
| Recomendación | Cambiar el texto a «Alias o CBU para recibir» hasta que exista la tarjeta. Es un cambio de contenido, no de reglas de negocio. |
| Esfuerzo | S |
| Dependencias | Confirmación de la dueña (DP-18). |
| Criterio de aceptación | Ningún texto público menciona tarjeta como medio disponible. |

### F-03 · El registro y el inicio de sesión desmontan la landing (detalle en `07-functional-audit.md`)
Severidad **P1**. La causa raíz y la alternativa recomendada están en 07.

### F-07 · El diferencial no aparece en la primera pantalla
| Campo | Detalle |
|---|---|
| Categoría | Propuesta de valor |
| Severidad | P2 |
| Página / componente | Hero |
| Dispositivo | Sobre todo celular |
| Problema | La lista de regalos sin comisión, que es el diferencial comercial, recién aparece en la tercera pantalla del celular. El hero lo menciona como uno de tres ítems. |
| Evidencia | `#regalos` empieza a unos 2.400 px en 390×844. La bajada del hero pone «el sitio» primero. |
| Impacto en el usuario | Se entiende «otra web de casamientos» antes que «la lista de regalos que no cobra comisión». |
| Impacto comercial | Hipótesis: menor diferenciación frente a otras listas que sí cobran comisión. |
| Recomendación | Sin tocar el título ni su posición, sumar una línea bajo los botones o ajustar la bajada para nombrar el diferencial («Lista de regalos sin comisión: el dinero va directo a tu cuenta»). Validar con la dueña, porque el texto del hero fue fijado por ella. |
| Esfuerzo | S |
| Dependencias | Decisión de copy de la dueña. |
| Criterio de aceptación | «Sin comisión» o equivalente visible en la primera pantalla de 390×844. |

### F-12 · Los planes no tienen una acción al lado
| Campo | Detalle |
|---|---|
| Categoría | Conversión |
| Severidad | P2 |
| Página / componente | Planes |
| Dispositivo | Todos |
| Problema | Se sacaron los «Empezar gratis» de las tarjetas (2026-11-03). La decisión de precio queda sin acción contigua; la siguiente está en el cierre. |
| Evidencia | `landing-plans.tsx`: las tarjetas terminan en «Ver lo que incluye». En celular la sección mide 1464 px, y para llegar a un CTA desde el primer plan hay que bajar unos 1500 px. |
| Impacto en el usuario | Llegado el «¿cuál me conviene?», no hay un «empezar» cerca. |
| Impacto comercial | Hipótesis: es el momento de mayor intención, y no tiene acción. |
| Recomendación | Un único CTA bajo la grilla («Empezar gratis, elegís el plan al publicar»), que respeta la decisión de no poner un botón por tarjeta, o reponer los botones. Consultar con la dueña. |
| Esfuerzo | S |
| Dependencias | Decisión de la dueña. |
| Criterio de aceptación | Hay un CTA a menos de una pantalla del último plan en 390×844. |

### F-13 · «Registrarme con Google» parece funcionar, pero no
| Campo | Detalle |
|---|---|
| Categoría | Confianza / fricción |
| Severidad | P2 |
| Página / componente | `/crear/cuenta` |
| Dispositivo | Todos |
| Problema | El botón tiene el logo de colores y el mismo peso que el principal. Al tocarlo avisa que todavía no está habilitado. |
| Evidencia | `crear.cuenta.tsx` (`googleSoon`), comentario de la auditoría del 2026-10-28. |
| Impacto en el usuario | Quien prefiere Google toca, recibe un «todavía no» y tiene que volver a decidir. |
| Impacto comercial | Hipótesis: abandono en el primer contacto. |
| Recomendación | Ocultar el botón hasta que exista OAuth, o mostrarlo deshabilitado con «Próximamente» bien visible. |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | No hay controles activos que no hagan lo que dicen. |

### F-24 · Falta manejo de objeciones en la landing
| Campo | Detalle |
|---|---|
| Categoría | Confianza |
| Severidad | P2 |
| Página / componente | Landing |
| Dispositivo | Todos |
| Problema | Las dudas típicas («¿y si un invitado no transfiere?», «¿mis datos?», «¿quién está detrás?», «¿puedo probar sin pagar?») no tienen respuesta en la landing. Existen 9 preguntas frecuentes solo en `/lista-de-regalos`. |
| Evidencia | Recorrido de la landing; `src/routes/lista-de-regalos.tsx` tiene `faqs`. |
| Impacto en el usuario | Para resolver dudas tiene que salir de la landing, y la página de FAQ solo se enlaza desde el pie. |
| Impacto comercial | Hipótesis: las parejas indecisas se van. |
| Recomendación | Una FAQ corta de 3–4 preguntas en la landing, antes del cierre, que reutilice las de `/lista-de-regalos` (el mismo dato y el mismo `FAQPage`). |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | Las 3 dudas principales se responden en la landing. |

### F-25 · «Publicada 6 meses» contra la decisión vigente de 12 meses
| Campo | Detalle |
|---|---|
| Categoría | Contenido |
| Severidad | P2 |
| Página / componente | Planes |
| Dispositivo | Todos |
| Problema | `PUBLICATION_TERM = '6 meses'`, pero `PRODUCT.md` registra que la decisión vigente es de 12 meses con «pagar = activar + publicar» (2026-10-30), todavía sin implementar. |
| Evidencia | `src/lib/weda/plans.ts`, `PRODUCT.md` §Capabilities. |
| Impacto en el usuario | Si se publica con 12 meses, la landing promete menos de lo que se da. Si se mantiene en 6, el documento interno está desactualizado. |
| Impacto comercial | Bajo, pero es un compromiso de precio. |
| Recomendación | Confirmar la duración y alinear el código y el documento. |
| Esfuerzo | S |
| Dependencias | Decisión DP-17. |
| Criterio de aceptación | El código y `PRODUCT.md` dicen lo mismo. |

### F-14 · «Iniciar sesión» abre una pantalla titulada «Crear mi evento»
| Campo | Detalle |
|---|---|
| Categoría | Claridad |
| Severidad | P3 |
| Página / componente | `/crear/cuenta?modo=ingresar` |
| Dispositivo | Todos |
| Problema | El título de la pestaña es «Crear mi evento • Weda» y el título de la pantalla es «¡Bienvenidos!», igual que en el registro. |
| Evidencia | Recorrido de links: `/crear/cuenta?modo=ingresar` → título «Crear mi evento • Weda», `h1` «¡Bienvenidos!». |
| Impacto en el usuario | Quien vuelve no ve confirmado que está «ingresando». |
| Impacto comercial | Bajo. |
| Recomendación | Título «Ingresá a Weda» y título de pestaña acorde en modo ingreso. |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | Título y pestaña distintos en cada modo. |

### F-23 · El pie repite destinos
P3. «Sitio del casamiento» y «Ver ejemplo» llevan los dos a `/ejemplo`. Se puede quitar uno o diferenciarlos. Criterio de aceptación: cada link del pie va a un destino distinto.
