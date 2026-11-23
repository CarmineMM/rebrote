# ADR-0025: Sobrecarga y tope de enemigos a la vez

- **Estado:** Aceptada
- **Fecha:** 2026-11-23

## Contexto

El brote 4 (Morris, T-042) es la inundación: muchos enemigos a la vez, y un jefe que no para de soltar gusanos mientras vive. Trae dos cosas que no había:

- **La sobrecarga**, el rasgo del brote (MR-02 a MR-05): una barra que se llena con los enemigos vivos en el césped y, llena, los acelera a todos menos al jefe hasta que baja del 60 %.
- **Un tope de enemigos a la vez** (MR-10): el juego se usa mucho en móvil, y "en masa" puede ser más de lo que aguanta uno flojo. El presupuesto de rendimiento medido en T-002 son 60 enemigos y 20 plantas.

Había que decidir dónde vive cada cosa, qué se guarda y cómo se mezcla con lo que ya existía (el acelerado de las rondas antes del jefe, el hielo, las copias, los refuerzos del jefe y el fin de la ronda).

## Decisión

**La sobrecarga (`src/game/core/combat.ts`, con test en `morris.test.ts`):**
- La tiene un brote si lo dice su guion (`overload: true` en `OUTBREAKS`); hoy, solo el 4. En los demás no hay barra y nada cambia.
- Lo llena que está la barra no se guarda: sale de los enemigos (`overloadFill`, con `overloadCount`: vivos, en el césped y sin el jefe). Solo se guarda si está encendida (`MatchState.overload`), porque con el margen de MR-04 la misma barra puede estar encendida o apagada.
- `stepCombat` la enciende o la apaga al final de cada paso (`nextOverload`) y lo cuenta con el evento `overloaded`. `stepRound` la apaga al acabar la ronda.
- Encendida, multiplica lo que avanza cada enemigo (`overloadHaste`), igual que su acelerado (`Enemy.haste`) y antes del hielo: todo se combina multiplicando, y nada más cambia (mordiscos, escupitajos y versos van igual).
- La escena manda la barra al HUD por `EventBus` (`overloadChanged`, `OverloadInfo`), y React la pinta (`OverloadBar`).

**El tope (`src/game/core/rounds.ts`, con su número en `CROWD` de `balance.ts`):**
- Vale para todos los brotes. Lo aplica `stepRound`, que es quien saca enemigos por los agujeros: si ya hay `CROWD.max`, lo que toca salir espera en `RoundState.waiting`, en orden, con el nivel y el paso que le tocaron, y sale en cuanto hay sitio, antes que lo nuevo.
- El jefe sale siempre: si esperara, la ronda podría darse por ganada sin él (`bossFallen`).
- Las copias salen siempre (las de un Copycat y las de Creeper): nacen en `stepCombat` de alguien que ya estaba en el tablero, ocupando su sitio o casi.
- La ronda no acaba mientras alguien espera fuera. Si cae el jefe, lo que esperaba ya no sale.

**Los gusanos de Morris (`stepBrood` en `rounds.ts`):** también los saca `stepRound`, por los agujeros, como unos refuerzos que no se acaban; pasan por el mismo tope. Su reloj (`RoundState.brood`) corre desde que Morris sale y no depende de su estado, así que frenado sigue soltándolos (MR-07).

Lo nuevo de la partida (`MatchState.overload`, `RoundState.waiting` y `RoundState.brood`) se guarda con ella: `SAVE_VERSION` 13, sin migración (ADR-0014).

## Alternativas descartadas

- **Guardar lo llena que está la barra:** se puede calcular siempre de los enemigos, y guardarlo daría dos verdades.
- **Que la sobrecarga cambie `Enemy.haste`:** se perdería el acelerado propio de cada enemigo al apagarse, y la ficha no sabría distinguirlos.
- **Un tope solo para el brote 4:** el riesgo es de rendimiento, no de diseño. En los brotes 1 a 3 los bots nunca pasan de 25 enemigos a la vez, así que no cambia nada.
- **Descartar lo que no cabe:** la carrera contra Morris se pararía justo cuando más aprieta, y la ronda tendría menos enemigos de los que dice su guion.
- **Que los gusanos de Morris salgan de su cuerpo, en su carril:** solo llenarían un carril, y saldrían ya dentro del jardín, delante de las plantas. Salen por los agujeros; la vista anima que se le sueltan.

## Consecuencias

- Un brote nuevo con sobrecarga solo pone `overload: true`; su umbral es de todos (`OVERLOAD`). Si un brote necesitara otro, habría que llevarlo a su guion.
- Una regla nueva que mueva enemigos tiene que usar su paso con la sobrecarga (`pace` en `substep`), como el andar y el salto.
- Una forma nueva de sacar enemigos por los agujeros tiene que pasar por la cola de `stepRound`. Lo que nace dentro del tablero de otro enemigo (copias) no.
- El rendimiento con el tope lleno se mide en un móvil con la calidad más baja: en este equipo, sin GPU, solo se puede medir el JavaScript.
