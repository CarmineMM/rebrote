import { COSTS, FUSION, LEVELING, LIMITS, SHOOTER } from '../config/balance';

export type ElementType = 'fire' | 'ice';
export type CannonCount = 1 | 2 | 3;

export interface Shooter {
  element: ElementType | null;
  cannons: CannonCount;
  level: number;
}

export function createShooter(): Shooter {
  return { element: null, cannons: 1, level: 1 };
}

/** Por que no se pueden fusionar dos disparadoras: otra variante o mas canones de los permitidos. */
export type FuseBlocker = 'variant' | 'max-cannons';

/** Motivo por el que no se pueden fusionar `a` y `b`, o null si se puede. */
export function fuseBlocker(a: Shooter, b: Shooter): FuseBlocker | null {
  if (a.element !== b.element) return 'variant';
  if (a.cannons + b.cannons > LIMITS.maxCannons) return 'max-cannons';
  return null;
}

/** Fusionar: misma variante (normal, fuego o hielo) y sin pasar del maximo de canones. */
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

/** Infundir: solo sobre una disparadora que todavia no tiene elemento. */
export function canInfuse(plant: Shooter): boolean {
  return plant.element === null;
}

/** Infundir una planta de N canones cuesta N elementos. */
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

/** Lo que suma el nivel sobre el de nivel 1, en fracciones (0,2 = un 20 % mas): dano del disparo y cadencia. */
export function levelBonus(level: number): { damage: number; fireRate: number } {
  return { damage: (level - 1) * LEVELING.damagePerLevel, fireRate: (level - 1) * LEVELING.fireRatePerLevel };
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

/** Vida maxima de la planta: la de la disparadora por cada canon (D-02: la suma de las partes). */
export function plantMaxHp(plant: Shooter): number {
  return SHOOTER.hp * FUSION.hpByCannons[plant.cannons];
}
