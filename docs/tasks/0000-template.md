# [Área] Título corto de la task

<!-- Estado: "En curso" al empezar; "Completada (fecha, versión)" al cerrar (CLAUDE.md). Se cambia también en la tabla de README.md. -->

- **Estado:** En curso
- **Prioridad:** Media
- **Tamaño estimado:** S (orientativo)
- **Depende de:** ninguna
- **Bloquea a:** ninguna
- **Origen:** de dónde sale (conversación de diseño del <fecha>, tentativa TT-xxx...)

<!--
Esta plantilla vale también para las tasks tentativas (tentative/, ADR-0026), con estas diferencias:
- Archivo `tentative/TT-<número>-<nombre>.md`; la numeración TT- es propia y no gasta números T-.
- Estado: "Tentativa". Una tentativa no se ejecuta.
- Lleva "## 2. Factibilidad técnica" justo después de Contexto (las siguientes se numeran a partir de ahí).
- Para pasarla a task normal: primero se revisa el código y se corrige lo que haya cambiado; luego recibe su número T- y se mueve a docs/tasks/ en el mismo commit. Pasos en tentative/README.md.
-->

## 1. Contexto

Por qué se hace, en un párrafo corto.

Hoy (comprobado el <fecha>, en <versión>):

- Una pieza del estado verificado por viñeta, con su archivo y línea (`src/...:N`).
- ...

## 2. Objetivos

- ...

## 3. Alcance

**Incluye:** ...

**No incluye:** ...

## 4. Decisiones pendientes

<!-- No se implementa por intuición: se pregunta. Al cerrar una, su celda de Opciones empieza por "**Cerrada (fecha):**" y Recomendación pasa a "Cerrada". -->

| # | Pregunta | Opciones | Recomendación | Decide |
|---|---|---|---|---|
| XX-01 | ¿...? | a) ...; b) ... | a) ... | Carmine |

## 5. Criterios de aceptación

### Regla

- [ ] ...

### Calidad

- [ ] `npm test` y `npm run build` pasan.
- [ ] Versión subida (regla 12) y línea nueva en `CHANGELOG.md`.

<!-- Si hacen falta al cerrar, aquí van "## Cómo quedó (fecha)" o "## Añadido durante la task", numeradas en orden. -->

## 6. Casos límite y riesgos

- ...

## 7. Objetivo final con ejemplos

- ...

## 8. Cómo probarlo (QA)

1. ...
