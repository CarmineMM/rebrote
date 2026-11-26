import type { Ctx } from '../canvasKit';

/**
 * Suelo del tablero (T-050): lo que se pinta en las 5 x 9 casillas donde se siembra, dentro de la textura fija del terreno
 * (`TEX.land`, que pinta `paintLand` una sola vez). Sin Phaser: lo usan las texturas, la galeria de propuestas
 * (`/proposals/suelo.html`) y los tests.
 *
 * Cada suelo pinta en coordenadas del mundo con la camara inclinada (`boardCanvas.ts`): de (0, 0) a (columnas, carriles),
 * y lo que quiera por encima del borde delantero. Alrededor siguen el camino, el seto, el bancal, el suelo corrupto y el
 * corte de tierra: no los toca. El juego usa uno solo, `FLOOR` en `boardFloor.ts`; los demas quedan guardados aqui para
 * compararlos y volver a ellos.
 */

/**
 * Cuanto dibuja el suelo las columnas (SU-03). Los carriles siempre se leen de un vistazo; las columnas, segun esto:
 * `hinted`, apenas insinuadas (la casilla exacta ya se resalta al sembrar, `drawCell`); `shown`, siempre a la vista.
 */
export type FloorGrid = 'hinted' | 'shown';

export const FLOOR_GRIDS: readonly FloorGrid[] = ['hinted', 'shown'];

export interface FloorDesign {
  /** Clave corta: va en el nombre de la textura del terreno que lo lleva (`landTexture`). */
  readonly id: string;
  /**
   * Pinta el suelo en el sitio del cesped (despues del suelo corrupto y antes del corte de tierra). `rand` es el del
   * terreno: el suelo de siempre lo usa tal cual, asi que el terreno sale igual que antes de que el suelo fuera una pieza.
   */
  paint(ctx: Ctx, rand: () => number, grid: FloorGrid): void;
  /** Lo que el suelo pinta sobre el corte de tierra, delante del tablero (despues de `paintFrontCut`). */
  paintFront?(ctx: Ctx, rand: () => number, grid: FloorGrid): void;
  /**
   * El suelo en pequeno, donde no cabe el dibujo entero: la loma de la foto de la ficha (`portrait.ts`, T-010). Claro
   * arriba y oscuro abajo y, si lo lleva, una linea que la cruza (la raiz de las raices) con su contorno. Los dibujos de los
   * tours (`.tour-pic` en `styles.css`) repiten a mano los colores del suelo del juego.
   */
  readonly swatch: { readonly light: string; readonly dark: string; readonly line?: { readonly body: string; readonly outline: string } };
}
