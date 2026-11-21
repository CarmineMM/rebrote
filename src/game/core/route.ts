import { OUTBREAKS } from '../config/balance';
import { FIRST_OUTBREAK, isOutbreakOpen, roundCount, type OutbreakId } from './outbreaks';
import { levelCapAt, unlockedAt, type Feature } from './rounds';

/**
 * Ruta de brotes e Invernadero (T-019, ADR-0016): que brotes ve el jugador fuera de la partida y cual le toca. Reglas
 * puras sobre los brotes vencidos del progreso permanente (`Progress.defeated`, ADR-0014); React las pinta.
 *
 * Decidido el 21 nov 2026 (R-01 a R-04, con la recomendacion):
 * - El Invernadero aparece al vencer a Creeper, el jefe del primer brote (R-01): un jugador nuevo va directo a jugar.
 * - La ruta ensena los brotes vencidos, los que se pueden jugar, el siguiente en sombra y el destino final a lo lejos
 *   (R-03): no compromete un numero de brotes.
 */

/** Como esta un brote para el jugador: vencido, abierto (se puede jugar y aun no se vencio) o cerrado. */
export type OutbreakStanding = 'defeated' | 'open' | 'locked';

/** Un lugar de la ruta, en orden. */
export type RouteStop =
  | {
      readonly kind: 'outbreak';
      readonly id: OutbreakId;
      readonly standing: OutbreakStanding;
      /** Es el brote que toca jugar (`currentOutbreak`): el lugar que destaca. */
      readonly current: boolean;
    }
  /** El siguiente brote aun no esta en el juego: un lugar en sombra, "Proximamente". `number` es el que tendra. */
  | { readonly kind: 'soon'; readonly number: number }
  /** El destino final, a lo lejos: el jefe que recrea a todos los anteriores, aun sin nombre. */
  | { readonly kind: 'final' };

/** El Invernadero se abre al vencer al jefe del primer brote (R-01). `defeated` son los brotes vencidos del progreso. */
export function isGreenhouseOpen(defeated: readonly string[]): boolean {
  return defeated.includes(FIRST_OUTBREAK);
}

export function outbreakStanding(id: OutbreakId, defeated: readonly string[]): OutbreakStanding {
  if (defeated.includes(id)) return 'defeated';
  return isOutbreakOpen(id, defeated) ? 'open' : 'locked';
}

/** Lo que el jugador ya tiene fuera de la partida: lo que se pinta en el jardin del Invernadero. */
export interface Owned {
  /** Lo desbloqueado en todas las rondas hasta el ultimo brote vencido (con los de antes, B-01). */
  readonly features: ReadonlySet<Feature>;
  /** Tope de nivel de las disparadoras al acabar ese brote: hasta donde puede llegar una. */
  readonly levelCap: number;
}

/**
 * Lo que ya es del jugador para siempre: lo que desbloquea el brote vencido mas avanzado de la lista, contando los de
 * antes (B-01). Lo que una partida a medias desbloqueo aun no cuenta. Sin brotes vencidos, nada.
 */
export function ownedSoFar(defeated: readonly string[]): Owned {
  const furthest = OUTBREAKS.filter((outbreak) => defeated.includes(outbreak.id)).at(-1);
  if (!furthest) return { features: new Set(), levelCap: 1 };
  const last = roundCount(furthest.id) - 1;
  return { features: unlockedAt(furthest.id, last), levelCap: levelCapAt(furthest.id, last) };
}

/** Se puede elegir en la ruta: vencido (se vuelve a jugar) o abierto. */
export function isPlayable(standing: OutbreakStanding): boolean {
  return standing !== 'locked';
}

/**
 * Brote que toca jugar ("Siguiente brote" en el Invernadero): el primero, en el orden de `OUTBREAKS`, que se puede jugar
 * y aun no se vencio. Null si ya se vencieron todos los que hay en el juego.
 */
export function currentOutbreak(defeated: readonly string[]): OutbreakId | null {
  return OUTBREAKS.find((outbreak) => outbreakStanding(outbreak.id, defeated) === 'open')?.id ?? null;
}

/**
 * Lugares de la ruta, en orden (R-03): los brotes vencidos y los abiertos; despues, el primero cerrado en sombra (los
 * siguientes no se ensenan) o, si ya no queda ninguno en el juego, uno por llegar ("Proximamente"); y al final, el
 * destino final. Nunca esta vacia: el primer brote siempre esta abierto o vencido.
 */
export function routeStops(defeated: readonly string[]): RouteStop[] {
  const current = currentOutbreak(defeated);
  const stops: RouteStop[] = [];
  let shadowed = false;
  for (const { id } of OUTBREAKS) {
    const standing = outbreakStanding(id, defeated);
    stops.push({ kind: 'outbreak', id, standing, current: id === current });
    if (standing === 'locked') {
      shadowed = true;
      break;
    }
  }
  if (!shadowed) stops.push({ kind: 'soon', number: OUTBREAKS.length + 1 });
  stops.push({ kind: 'final' });
  return stops;
}
