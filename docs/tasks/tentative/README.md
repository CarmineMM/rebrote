# Tasks tentativas (tentative)

Tasks propuestas que aún no se han confirmado contra el código (ADR-0026). Tienen el mismo formato que las normales (`../README.md`): contexto, objetivos, alcance, decisiones pendientes, criterios de aceptación, casos límite, ejemplos y QA. La única diferencia es que **antes de pasarlas a task normal hay que revisar el código**.

Una task tentativa no se ejecuta: primero se pasa a normal.

| # | Task | Estado | Tamaño | Depende de | Bloqueada por decisión |
|---|---|---|---|---|---|

## Cómo se escribe
- Archivo en esta carpeta: `TT-<número>-<nombre>.md`. La numeración `TT-` es propia y no gasta números `T-`.
- Cabecera igual que una task normal, con `**Estado:** Tentativa`, y debajo el aviso de que es tentativa.
- Se escribe en español; el código, los identificadores y los nombres más conocidos en inglés (Creeper, Copycat...) se citan en inglés, como en el resto del proyecto (regla 6).
- El contexto dice en qué versión y fecha se comprobó.

## Cómo pasa a task normal
1. **Revisar el código:** cada ruta, línea, función, número y comportamiento que cite la task se comprueba en el código actual. Lo que haya cambiado se corrige en la task.
2. Se revisa que sus criterios de aceptación sigan teniendo sentido con lo que se ha hecho desde que se escribió y que no choquen con otra task.
3. Se le da el siguiente número `T-` libre y se mueve a `docs/tasks/` como `T-<número>-<nombre>.md`, con `**Estado:** Pendiente` y en el origen "Tentativa TT-<número>, revisada el <fecha>". Se quita el aviso de tentativa.
4. Se borra su fila de esta tabla y se añade a la de `../README.md`, en el mismo commit.
