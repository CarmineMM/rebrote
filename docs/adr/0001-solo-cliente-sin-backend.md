# ADR-0001: Solo cliente, sin backend por ahora

- **Estado:** Aceptada
- **Fecha:** 2026-11-19

## Contexto

La idea inicial era React + Laravel. El juego es de un jugador y toda su lógica corre en el navegador. Todavía no sabemos si la mecánica divierte.

## Decisión

El prototipo no tiene backend. El progreso, si hace falta guardarlo, va en `localStorage`.

## Consecuencias

- A favor: cero infraestructura, se despliega como sitio estático, todo el tiempo va al juego.
- En contra: no hay cuentas, ni progreso entre dispositivos, ni ranking.
- Riesgo: si algún día hay ranking o compras, el cliente no es fuente de confianza y habrá que validar en servidor.

## Cuándo se revisa

Cuando haga falta alguna de estas: cuentas, progreso en la nube, ranking o pagos. En ese momento Laravel entra como API y se documenta en un ADR nuevo.
