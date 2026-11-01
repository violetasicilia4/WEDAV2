# Specs de Weda

Una spec dice **qué** tiene que cumplir una funcionalidad y **cómo se verifica**. El plan dice **cómo** se construye. Es una adaptación liviana de Spec-Driven Development (etapa 1, aprobada el 2026-11-01): no se usa la herramienta Spec Kit.

## Cuándo se escribe una

| Tamaño | Ejemplos | ¿Spec? |
|---|---|---|
| **Chica** | Textos, ajustes de interfaz, bugs, documentación, ajustes de pruebas | **No.** Rama, PR y pruebas, como siempre |
| **Mediana** | Una funcionalidad nueva sobre reglas ya decididas (GIFT-09) | `spec.md` + `plan.md` |
| **Crítica** | Dinero, permisos, esquema de la base, privacidad (multiusuario, archivo, pagos) | Igual que la mediana, y la spec se aprueba **antes** que el plan |

## Estructura

```
specs/
  _plantilla/spec.md      plantilla
  _plantilla/plan.md      plantilla
  <ID>-<slug>/spec.md     qué y cómo se verifica (ID del inventario, por ejemplo GIFT-09)
  <ID>-<slug>/plan.md     solución técnica aprobada
```

No hay `tasks.md`: los pasos viven en la sesión de trabajo.

## Reglas
- **El Product Blueprint manda.** La spec **cita** reglas y decisiones por ID (BR-xx, DP-xx, DA-xx, Qx, IDs del inventario) y no copia su texto. Si una regla citada cambia, cambia en el Blueprint.
- **Lo pendiente sigue pendiente.** Si la funcionalidad necesita una decisión que no existe, se anota en «Preguntas abiertas» y se registra en `docs/product-blueprint/03-open-decisions-and-risks.md`. No se resuelve en la spec ni en el plan.
- **El plan no crea decisiones de producto.** Documenta la solución técnica de lo que ya está decidido.
- **Antes de construir:** revisión de consistencia. Toda referencia existe, está decidida y no contradice otra. Si algo falla, se frena.
- **Al cerrar:** cada criterio de aceptación se marca con su evidencia (prueba o recorrido) y la spec pasa a **cerrada**. A partir de ahí es un registro histórico: no se reescribe. Lo que siga vigente vive en el Blueprint o en `docs/ux-flows.md`.
- **Breve.** Si una sección no aporta, se omite.

**Estados de una spec:** borrador → aprobada → en construcción → cerrada.
