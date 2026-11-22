import { COSTS, FUSION, LEVELING, LIMITS, SHIELD, SHOOTER } from '../config/balance';
import { compoundGrowth, isDoubleMilestone, isMilestone } from './levels';

/** Elementos que, sembrados solos, son una mina (T-004, T-005). */
export type MineElement = 'fire' | 'ice';

/**
 * Lo que se suelta sobre una disparadora para infundirla: fuego, hielo o escudo (T-024). Una planta tiene como mucho uno
 * (no hay mezclas). Sembrado solo, el fuego y el hielo son una mina, y el escudo, un muro.
 */
export type ElementType = MineElement | 'shield';

/** ¿Es un elemento de mina (fuego o hielo)? El escudo, sembrado solo, es un muro. */
export function isMineElement(element: ElementType): element is MineElement {
  return element !== 'shield';
}
export type CannonCount = 1 | 2 | 3;

export interface Shooter {
  element: ElementType | null;
  cannons: CannonCount;
  level: number;
}

/** Disparadora recien sembrada: un canon, sin elemento y en el nivel `level` (el nivel base de la partida, T-023). */
export function createShooter(level = 1): Shooter {
  return { element: null, cannons: 1, level };
}

/** Por que no se pueden fusionar dos disparadoras: otra variante o mas canones de los permitidos. */
export type FuseBlocker = 'variant' | 'max-cannons';

/** Motivo por el que no se pueden fusionar `a` y `b`, o null si se puede. */
export function fuseBlocker(a: Shooter, b: Shooter): FuseBlocker | null {
  if (a.element !== b.element) return 'variant';
  if (a.cannons + b.cannons > LIMITS.maxCannons) return 'max-cannons';
  return null;
}

/** Fusionar: misma variante (normal, fuego, hielo o escudo, T-024 E-03) y sin pasar del maximo de canones. */
export function canFuse(a: Shooter, b: Shooter): boolean {
  return fuseBlocker(a, b) === null;
}

/** El resultado suma canones y se queda con el nivel mas bajo de las dos. */
export function fuse(a: Shooter, b: Shooter): Shooter {
  if (!canFuse(a, b)) {
    throw new Error('Estas plantas no se pueden fusionar');
  }
  return {
    element: a.element,
    cannons: (a.cannons + b.cannons) as CannonCount,
    level: Math.min(a.level, b.level),
  };
}

/** Infundir: solo sobre una disparadora que todavia no tiene elemento (no hay mezclas: tampoco de escudo, T-024). */
export function canInfuse(plant: Shooter): boolean {
  return plant.element === null;
}

/** Infundir una planta de N canones cuesta N elementos (tambien el escudo, T-024 E-04). */
export function infusionCost(plant: Shooter, element: ElementType): number {
  return COSTS[element] * plant.cannons;
}

export function infuse(plant: Shooter, element: ElementType): Shooter {
  if (!canInfuse(plant)) {
    throw new Error('Esta planta ya tiene un elemento');
  }
  return { ...plant, element };
}

/** Subir de nivel: hasta el tope de `LIMITS.maxLevel`. */
export function canLevelUp(plant: Shooter): boolean {
  return plant.level < LIMITS.maxLevel;
}

/**
 * Lo que cuesta subirla un nivel (D-05): `baseCost` de nivel 1 a 2 y `costStep` mas por cada nivel siguiente,
 * por canon, como infundir. Null si ya esta en el maximo.
 */
export function levelUpCost(plant: Shooter): number | null {
  if (!canLevelUp(plant)) return null;
  return (LEVELING.baseCost + (plant.level - 1) * LEVELING.costStep) * plant.cannons;
}

/** La misma planta un nivel mas arriba. No cambia canones ni elemento. */
export function levelUp(plant: Shooter): Shooter {
  if (!canLevelUp(plant)) {
    throw new Error('Esta planta ya esta en el nivel maximo');
  }
  return { ...plant, level: plant.level + 1 };
}

/** ¿Da premio llegar al nivel `level`? Cada 5 niveles (`LEVEL_MILESTONES`, T-035): el 5, el 10, el 15, el 20... */
export function isMilestoneLevel(level: number): boolean {
  return isMilestone(level);
}

/** Cuantos niveles con premio ha alcanzado una planta de nivel `level` (0 antes del 5, 4 en el 20). */
export { milestonesReached } from './levels';

/** Lo que da llegar a un nivel o a otro, en fracciones (0,2 = un 20 % mas). */
export interface LevelBonus {
  readonly damage: number;
  readonly fireRate: number;
  readonly hp: number;
}

/** Cuanto vale la cadencia de llegar al nivel `level` respecto a un nivel normal: 1, o su premio (x1,5, o x2 en el 10 y el 20). */
function fireRateWeight(level: number): number {
  if (isDoubleMilestone(level)) return LEVELING.fireRateDoubleMilestone;
  return isMilestone(level) ? LEVELING.fireRateMilestone : 1;
}

/**
 * Lo que da llegar al nivel `level` desde el anterior (T-035): dano y vida, sobre los del nivel anterior (compuesto: un
 * 12,5 %, o un 20 % y un 25 % de vida en los niveles con premio); cadencia, lo que suma sobre la de nivel 1.
 */
export function levelStepBonus(level: number): LevelBonus {
  if (level <= 1) return { damage: 0, fireRate: 0, hp: 0 };
  const milestone = isMilestone(level);
  return {
    damage: milestone ? LEVELING.damagePerMilestone : LEVELING.damagePerLevel,
    fireRate: fireRateWeight(level) * LEVELING.fireRatePerLevel,
    hp: milestone ? LEVELING.hpPerMilestone : 0,
  };
}

/**
 * Lo que da el nivel sobre el de nivel 1, en fracciones (0,2 = un 20 % mas). Dano y vida crecen en compuesto (T-035): cada
 * nivel multiplica lo del anterior. La cadencia suma lo de cada nivel, y los niveles con premio suman mas. Lo ganado se
 * queda para siempre.
 */
export function levelBonus(level: number): LevelBonus {
  let fireRate = 0;
  for (let reached = 2; reached <= level; reached++) fireRate += fireRateWeight(reached) * LEVELING.fireRatePerLevel;
  return {
    damage: compoundGrowth(level, LEVELING.damagePerLevel, LEVELING.damagePerMilestone) - 1,
    fireRate,
    hp: compoundGrowth(level, 0, LEVELING.hpPerMilestone) - 1,
  };
}

/** Dano total de cada disparo (todas sus balas juntas) respecto a una disparadora de un canon y nivel 1. */
export function damageMultiplier(plant: Shooter): number {
  const byCannons = FUSION.damageByCannons[plant.cannons];
  return byCannons * (1 + levelBonus(plant.level).damage);
}

/** Disparos por unidad de tiempo respecto a una de nivel 1: cada nivel dispara un poco mas seguido. */
export function fireRateMultiplier(plant: Shooter): number {
  return 1 + levelBonus(plant.level).fireRate;
}

/**
 * Vida maxima de la planta: la de la disparadora por cada canon (D-02: la suma de las partes), con lo que da su nivel
 * (T-035: un 25 % mas en cada nivel con premio, compuesto). La de escudo, por `SHIELD.hpMultiplier` (T-024, E-05).
 */
export function plantMaxHp(plant: Shooter): number {
  const shield = plant.element === 'shield' ? SHIELD.hpMultiplier : 1;
  return SHOOTER.hp * FUSION.hpByCannons[plant.cannons] * shield * (1 + levelBonus(plant.level).hp);
}
