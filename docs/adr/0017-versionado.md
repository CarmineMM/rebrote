# ADR-0017: Versionado del juego

- **Estado:** Aceptada
- **Fecha:** 2026-11-21

## Contexto

El juego tiene una versión en `package.json` (hoy `0.1.0`) que se muestra en el menú de inicio (`__APP_VERSION__`, T-011). Desde que se puso no se ha tocado, aunque se han cerrado veinte tasks. No había ningún criterio para subirla.

El juego está publicado y lo prueba gente, se publica varias veces al día y va a poder instalarse (T-029): hace falta saber de un vistazo qué versión tiene cada uno.

## Decisión

Versión con tres números, `MAYOR.MENOR.PARCHE`, decidida por Carmine el 21 nov 2026:

| Número | Cuándo sube | Quién lo decide |
|---|---|---|
| Mayor | Solo cuando Carmine lo indica | Carmine |
| Menor | Con cada brote, cada personaje o cada unidad nueva que cambie el modo de juego | Quien cierra la task |
| Parche | Con cada cambio mínimo de diseño o cada ajuste | Quien cierra la task |

Cómo se aplica:
- La versión vive en `package.json` y es la que enseña el menú de inicio.
- Se sube al cerrar una task, en el mismo commit en que la task pasa a "Completada".
- Al subir el número menor, el parche vuelve a 0.
- La versión con la que se cerró una task se anota en su cabecera, junto a la fecha, y en `CHANGELOG.md`.

## Consecuencias

- Una task cerrada es, como mínimo, un parche.
- La versión mayor 1 marca el fin del desarrollo. Hasta entonces no se escriben migraciones de datos guardados (ADR-0014).
- Con el juego instalable (T-029), la versión de la portada es la forma de comprobar que llegó una actualización.

## Decisiones cerradas el 21 nov 2026

| # | Pregunta | Decisión | Decide |
|---|---|---|---|
| VS-01 | Lo que no es brote, personaje ni unidad pero da al jugador algo nuevo que hacer (tienda, poderes, perfiles, instalar el juego), ¿es menor o parche? | Menor si el jugador puede hacer algo que antes no podía; parche si mejora lo que ya había | Carmine |
| VS-02 | ¿Se recalcula la versión por todo lo hecho hasta ahora? | No. Lo hecho hasta T-030 se queda en `0.1.0` y se cuenta desde ahí | Carmine |
| VS-03 | ¿Se lleva una lista de cambios por versión? | Sí: `CHANGELOG.md` en la raíz, una línea por task cerrada, lo más nuevo arriba | Carmine |

## Lista de cambios

- `CHANGELOG.md` es para personas: dice qué trae cada versión.
- Una línea por task cerrada, con la versión, la fecha, el número de task y una frase.
- Lo más nuevo va arriba. Para añadir una línea basta con leer el principio del archivo.
- No está entre lo que hay que leer antes de empezar una task: no se consulta para trabajar, solo se le añade una línea al cerrar.
