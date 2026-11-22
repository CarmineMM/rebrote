import { LEVEL_MILESTONES } from '../config/balance';

/**
 * Regla de los niveles (T-035): todo lo que tiene nivel (disparadoras, enemigos, poderes y el nivel base) da premio cada
 * `LEVEL_MILESTONES.every` niveles. Lo que da cada premio es de cada cosa; aqui solo se dice cuales lo dan y cuantos se
 * llevan, para que nadie escriba la lista 5, 10, 15, 20 a mano.
 */

/** ¿Da premio llegar al nivel `level`? El 5, el 10, el 15, el 20... */
export function isMilestone(level: number): boolean {
  return Number.isInteger(level) && level >= LEVEL_MILESTONES.every && level % LEVEL_MILESTONES.every === 0;
}

/** ¿Es el nivel `level` dos premios a la vez? El 10, el 20... (la cadencia de las disparadoras da mas en ellos). */
export function isDoubleMilestone(level: number): boolean {
  return isMilestone(level) && level % (2 * LEVEL_MILESTONES.every) === 0;
}

/** Cuantos niveles con premio ha alcanzado algo de nivel `level`: 0 antes del 5, 1 del 5 al 9, 2 del 10 al 14... */
export function milestonesReached(level: number): number {
  return Math.max(0, Math.floor(level / LEVEL_MILESTONES.every));
}

/**
 * Crecimiento compuesto (T-035): lo que multiplica el nivel `level` lo del nivel 1. Cada nivel del 2 en adelante multiplica
 * lo del anterior por 1 + `perLevel`, y los niveles con premio por 1 + `perMilestone` en su lugar. Nivel 1, por 1.
 */
export function compoundGrowth(level: number, perLevel: number, perMilestone: number): number {
  let factor = 1;
  for (let reached = 2; reached <= level; reached++) factor *= 1 + (isMilestone(reached) ? perMilestone : perLevel);
  return factor;
}
