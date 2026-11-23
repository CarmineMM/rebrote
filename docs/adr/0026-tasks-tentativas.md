# ADR-0026: Tasks tentativas

- **Estado:** Aceptada
- **Fecha:** 2026-11-23

## Contexto

Las tasks se escriben con el contexto verificado en el código del momento. A veces Carmine quiere dejar escrita una idea (por ejemplo, el brote 1 en 9 rondas) sin ponerla aún en la cola. Si pasa tiempo, el código cambia y las rutas, líneas y números de la task dejan de ser ciertos.

## Decisión

Decidido por Carmine el 23 nov 2026:

- Existe un tipo de task, la **tentativa** (en inglés, *tentative*), en `docs/tasks/tentative/`, con su propia numeración `TT-xxx` y su tabla en `docs/tasks/tentative/README.md`.
- Tiene el mismo contenido que una task normal. Su estado es "Tentativa".
- **Antes de pasar a task normal hay que revisar el código:** se comprueba todo lo que cita y se corrige. Entonces recibe el siguiente número `T-`, se mueve a `docs/tasks/` en estado "Pendiente" y cambia de tabla, en el mismo commit.
- Una task tentativa no se ejecuta.
- El texto va en español; los términos del código y los nombres conocidos en inglés se quedan en inglés (regla 6).

## Consecuencias

- Las ideas se pueden escribir enteras sin comprometer la cola ni gastar números `T-`.
- Pasarla a normal cuesta una revisión, pero evita ejecutar una task con un contexto que ya no vale.
