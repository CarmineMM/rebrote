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

/** Fusionar: misma variante (normal, fuego o hielo) y sin pasar del maximo de canones. */
export function canFuse(a: Shooter, b: Shooter): boolean {
  return a.element === b.element && a.cannons + b.cannons <= LIMITS.maxCannons;
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

export function canLevelUp(plant: Shooter): boolean {
  return plant.level < LIMITS.maxLevel;
}

export function damageMultiplier(plant: Shooter): number {
  const byCannons = FUSION.damageByCannons[plant.cannons];
  const byLevel = 1 + (plant.level - 1) * LEVELING.damagePerLevel;
  return byCannons * byLevel;
}

/** Disparos por unidad de tiempo respecto a una de nivel 1: cada nivel dispara un poco mas seguido. */
export function fireRateMultiplier(plant: Shooter): number {
  return 1 + (plant.level - 1) * LEVELING.fireRatePerLevel;
}

/** Vida maxima de la planta sembrada. Con un solo canon es la de la disparadora; fusionar (T-006, D-02) la cambiara. */
export function plantMaxHp(_plant: Shooter): number {
  return SHOOTER.hp;
}
