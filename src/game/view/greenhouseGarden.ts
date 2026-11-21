import type { Cell } from '../core/board';
import type { CannonCount, ElementType } from '../core/plants';
import type { Owned } from '../core/route';
import type { Feature } from '../core/rounds';
import type { CoverCast, Nudge, PlantSpot } from './titleCover';

/**
 * Jardin del Invernadero (T-019): en vez de la batalla de la portada, solo las plantas que el jugador ya tiene, en calma
 * y sin enemigos. Lo monta la misma `TitleCover` con este reparto: sin enemigos las disparadoras no disparan (solo
 * disparan con un gusano en su carril), al clic dan su saltito y las minas se arman, explotan y vuelven a brotar.
 *
 * Cada pieza sale si el jugador tiene lo que hace falta para hacerla en una partida (`ownedSoFar`), y tiene su sitio
 * fijo: una casilla para las reglas y, para la vista, un poco corrida de su centro (`nudge`), porque en el Invernadero
 * no hay casillas y las plantas estan sembradas a mano. Con todo lo del brote 1 quedan repartidas por las columnas 0 a 4,
 * a la izquierda del panel (tambien en el movil mas pequeno).
 */

interface Exhibit {
  /** Lo que hace falta tener para que salga. */
  readonly needs: readonly Feature[];
  readonly cell: Cell;
  /** Sembrada a mano, no en el centro de una casilla: cuanto se corre, en casillas. */
  readonly nudge: Nudge;
}

interface ShooterExhibit extends Exhibit {
  readonly kind: 'shooter';
  readonly cannons: CannonCount;
  readonly element: ElementType | null;
  /** Con subir de nivel: el tope que ya se alcanza (con su medallita y su jardincito). */
  readonly leveled?: boolean;
}

interface MineExhibit extends Exhibit {
  readonly kind: 'mine';
  readonly element: ElementType;
}

/** Las piezas del jardin, en orden, cada una con lo que necesita y su casilla. */
const EXHIBITS: ReadonlyArray<ShooterExhibit | MineExhibit> = [
  { kind: 'shooter', needs: ['shooter'], cell: { lane: 1, col: 0 }, nudge: { x: 0.15, y: -0.1 }, cannons: 1, element: null },
  { kind: 'shooter', needs: ['shooter', 'levelUp'], cell: { lane: 2, col: 2 }, nudge: { x: -0.25, y: 0.12 }, cannons: 1, element: null, leveled: true },
  { kind: 'shooter', needs: ['shooter', 'fuse'], cell: { lane: 0, col: 1 }, nudge: { x: 0.3, y: 0.05 }, cannons: 2, element: null },
  { kind: 'shooter', needs: ['shooter', 'fuse'], cell: { lane: 3, col: 3 }, nudge: { x: -0.1, y: -0.15 }, cannons: 3, element: null },
  { kind: 'shooter', needs: ['shooter', 'fireInfuse'], cell: { lane: 3, col: 0 }, nudge: { x: 0.25, y: 0.18 }, cannons: 1, element: 'fire' },
  { kind: 'shooter', needs: ['shooter', 'iceInfuse'], cell: { lane: 1, col: 3 }, nudge: { x: 0.2, y: -0.05 }, cannons: 1, element: 'ice' },
  { kind: 'mine', needs: ['fireMine'], cell: { lane: 4, col: 1 }, nudge: { x: 0.35, y: -0.1 }, element: 'fire' },
  { kind: 'mine', needs: ['iceMine'], cell: { lane: 0, col: 4 }, nudge: { x: -0.2, y: 0.15 }, element: 'ice' },
];

/** Reparto del jardin del Invernadero para lo que el jugador ya tiene: plantas y minas, sin un solo enemigo. */
export function greenhouseCast(owned: Owned): CoverCast {
  const shown = EXHIBITS.filter((exhibit) => exhibit.needs.every((feature) => owned.features.has(feature)));
  const plants: PlantSpot[] = [];
  const mines: CoverCast['mines'] = [];
  for (const exhibit of shown) {
    if (exhibit.kind === 'mine') {
      mines.push({ cell: exhibit.cell, nudge: exhibit.nudge, element: exhibit.element });
      continue;
    }
    const level = exhibit.leveled ? Math.max(1, owned.levelCap) : 1;
    plants.push({ cell: exhibit.cell, nudge: exhibit.nudge, cannons: exhibit.cannons, element: exhibit.element, level });
  }
  return { plants, mines, enemies: [] };
}
