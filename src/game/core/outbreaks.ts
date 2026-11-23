import { OUTBREAKS } from '../config/balance';
import type { BossKind, EnemyKind } from './combat';
import type { Presenter, RoundScript } from './rounds';

/**
 * Brotes (T-018, ADR-0015): cada campana que acaba en un jefe ("Brote 1: Creeper"). Cada brote trae su guion de rondas,
 * su jefe y su saldo inicial; la lista, en orden, es `OUTBREAKS` de `balance.ts`. Anadir un brote es anadir sus datos
 * ahi (y su nombre a `OutbreakId`, sus avisos de ronda en `round.notices` de `src/i18n/`): las escenas no cambian.
 *
 * Decidido el 21 nov 2026 (B-01 a B-04):
 * - Lo desbloqueado en los brotes anteriores llega desbloqueado desde la ronda 1 (B-01): cada brote solo ensena lo suyo.
 * - Entre brotes no pasa nada de la partida (B-02): tablero vacio y el saldo inicial del brote.
 * - El nombre del jefe se ve siempre, tambien antes de llegar a el (B-03).
 * - Para entrar en un brote hay que haber vencido al jefe del anterior (B-04).
 */

/**
 * Nombre de cada brote: el de su jefe. Al anadir un brote, su nombre va aqui. El brote 2, de Elk Cloner, existio desde
 * T-024 en preparacion (sin jefe) hasta que T-026 trajo a su jefe y su guion de verdad. El 3, de Brain, lo estuvo desde
 * T-037 hasta T-039. El 4, de Morris, lo esta desde T-041 hasta que T-042 traiga a su jefe.
 */
export type OutbreakId = 'creeper' | 'elkCloner' | 'brain' | 'morris';

export interface OutbreakScript {
  /**
   * Nombre estable del brote. Con el se guarda la partida (ADR-0010) y se apunta el jefe vencido en el progreso
   * permanente (ADR-0014), asi que no cambia aunque cambie el orden de la lista.
   */
  readonly id: OutbreakId;
  /**
   * Jefe del brote: sale en su ultima ronda y al vencerlo se gana la partida. Null mientras no esta en el juego (T-024: el
   * brote 2 trajo el escudo antes que a Elk Cloner, T-026): el brote esta en preparacion (`isOutbreakReady`).
   */
  readonly boss: BossKind | null;
  /** Saldo con el que empieza la partida (B-02: no se trae nada del brote anterior). */
  readonly startingBalance: number;
  /** Guion de rondas, en orden: cuantas hay, que desbloquea cada una y que enemigos saca. */
  readonly rounds: readonly RoundScript[];
  /**
   * Quien presenta en "¡YA LO TIENES!" lo nuevo que traen sus rondas (T-032): Boxer en el brote 1 (lo da el, VT-02) y
   * Patty en los siguientes, que traen plantas y piezas que crea ella (VT-03). Una ronda puede decir otro
   * (`RoundScript.presenter`). Sin decirlo, la regla de la historia (`unlockPresenter`); un tope de nivel sin nada nuevo
   * lo cuenta siempre Boxer.
   */
  readonly presenter?: Presenter;
  /**
   * Recluta tropas de los brotes anteriores (T-041): las que su guion saca de un brote de antes salen con la variante de
   * color de este brote (`troopVariant` en `variants.ts`), con su nombre, sus reglas y sus valores base. Desde el brote 4.
   */
  readonly recruits?: boolean;
}

/** Brote con el que empieza el juego: el primero de la lista. */
export const FIRST_OUTBREAK: OutbreakId = OUTBREAKS[0].id;

/** Posicion del brote en la lista, desde 0. */
export function outbreakIndex(id: OutbreakId): number {
  const index = OUTBREAKS.findIndex((outbreak) => outbreak.id === id);
  if (index < 0) throw new Error(`Brote desconocido: ${id}`);
  return index;
}

export function outbreakScript(id: OutbreakId): OutbreakScript {
  return OUTBREAKS[outbreakIndex(id)];
}

/** Numero del brote para el jugador, desde 1 ("Brote 1: Creeper"). */
export function outbreakNumber(id: OutbreakId): number {
  return outbreakIndex(id) + 1;
}

/** Rondas del brote. */
export function roundCount(id: OutbreakId): number {
  return outbreakScript(id).rounds.length;
}

/** Es el nombre de un brote de este juego (una partida guardada o un progreso pueden traer otro). */
export function isOutbreakId(value: unknown): value is OutbreakId {
  return OUTBREAKS.some((outbreak) => outbreak.id === value);
}

/**
 * Brote que pide un parametro de la direccion (`?brote=2` o `?brote=elkCloner`), o null si no es ninguno. Solo para
 * desarrollo (T-024): asi se juega un brote en preparacion, que la ruta aun no deja elegir.
 */
export function outbreakFromParam(value: string | null): OutbreakId | null {
  if (value === null || value === '') return null;
  if (isOutbreakId(value)) return value;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= OUTBREAKS.length ? OUTBREAKS[number - 1].id : null;
}

/** Brotes que van antes que `id`, en orden (B-01: lo que desbloquearon llega ya desbloqueado). */
export function outbreaksBefore(id: OutbreakId): readonly OutbreakScript[] {
  return OUTBREAKS.slice(0, outbreakIndex(id));
}

/** Brote cuyo jefe es `kind`, o null si no es jefe de ninguno. */
export function outbreakOfBoss(kind: EnemyKind): OutbreakId | null {
  return OUTBREAKS.find((outbreak) => outbreak.boss === kind)?.id ?? null;
}

/**
 * ¿Esta el brote terminado? Uno sin jefe aun (T-024) esta en preparacion: sus rondas existen para probar lo nuevo, pero el
 * jugador no lo puede jugar y la ruta lo da por "Proximamente" (`routeStops`). Solo se juega en desarrollo.
 */
export function isOutbreakReady(id: OutbreakId): boolean {
  return outbreakScript(id).boss !== null;
}

/**
 * Se puede jugar el brote `id` (B-04): el primero siempre; los demas, si ya se vencio al jefe del anterior. Uno en
 * preparacion (`isOutbreakReady`), nunca. `defeated` son los brotes vencidos del progreso permanente (`Progress.defeated`).
 */
export function isOutbreakOpen(id: OutbreakId, defeated: readonly string[]): boolean {
  if (!isOutbreakReady(id)) return false;
  const index = outbreakIndex(id);
  return index === 0 || defeated.includes(OUTBREAKS[index - 1].id);
}
