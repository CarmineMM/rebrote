import { OUTBREAKS } from '../config/balance';
import type { EnemyKind } from './combat';
import type { OutbreakId } from './outbreaks';

/**
 * Tropas que vuelven en otro brote (T-041). Desde el brote 4 (Morris) los brotes reutilizan tropas de los anteriores en vez
 * de traer las suyas (`docs/specs/03-ruta-de-brotes.md`). Vuelven con el mismo nombre, las mismas reglas y los mismos
 * valores base (MT-03 y MT-04): solo cambia su color, que es el del brote que las recluta (MT-01: un tinte por brote, igual
 * para todas sus tropas), y el nivel con que salen, que es cosa del guion.
 *
 * Cada tropa es de un brote, su brote de origen (`troopHome`): el primero cuyo guion la saca. En su brote de origen se ve
 * como siempre. Un brote que declara `recruits` en `OUTBREAKS` saca con su variante (`troopVariant`) las tropas de los
 * brotes anteriores, y las suyas propias, si las tuviera, como siempre. La variante va con el enemigo (`Enemy.variant`): la
 * hereda la copia de un Copycat y se conserva al guardar la partida. Puro y sin Phaser: el color lo pone la vista
 * (`src/game/view/troopVariants.ts`).
 */

/** Las tropas que saca un grupo de un guion, o el jefe del brote: lo que hace que una tropa sea de ese brote. */
function appearsIn(outbreak: (typeof OUTBREAKS)[number], kind: EnemyKind): boolean {
  return outbreak.boss === kind || outbreak.rounds.some((round) => round.groups.some((group) => group.kind === kind));
}

/** ¿Es el jefe de algún brote? Un jefe nunca vuelve con otro color: no se recluta. */
function isOutbreakBoss(kind: EnemyKind): boolean {
  return OUTBREAKS.some((outbreak) => outbreak.boss === kind);
}

/**
 * Brote de origen de una tropa: el primero de la ruta cuyo guion la saca (o cuyo jefe es). Null si no sale en ninguno (las
 * copias del Creeper son gusanos, acorazados y escupidores, que salen en el brote 1). Un test vigila que todas tengan uno.
 */
export function troopHome(kind: EnemyKind): OutbreakId | null {
  return OUTBREAKS.find((outbreak) => appearsIn(outbreak, kind))?.id ?? null;
}

/**
 * Variante con la que sale una tropa de tipo `kind` en una partida del brote `outbreak` (T-041): el propio brote si recluta
 * (`recruits`) y la tropa es de un brote anterior; si no, null, y se ve como siempre. Rejugar el brote 1 después de vencer
 * el 4 saca los gusanos con su color: la variante depende del brote de la partida, no de lo vencido. Los jefes, nunca.
 */
export function troopVariant(kind: EnemyKind, outbreak: OutbreakId): OutbreakId | null {
  const index = OUTBREAKS.findIndex((o) => o.id === outbreak);
  if (index < 0 || !OUTBREAKS[index].recruits || isOutbreakBoss(kind)) return null;
  const home = OUTBREAKS.findIndex((o) => appearsIn(o, kind));
  return home >= 0 && home < index ? outbreak : null;
}

/** Brotes que reclutan tropas de los anteriores y las pintan con su variante, en el orden de la ruta. */
export function recruitingOutbreaks(): readonly OutbreakId[] {
  return OUTBREAKS.filter((outbreak) => outbreak.recruits).map((outbreak) => outbreak.id);
}
