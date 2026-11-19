import { BOARD, ENEMIES, SHOOTER } from '../config/balance';
import type { BoardPoint, Cell } from './board';
import type { MatchState, Plant } from './match';
import { damageMultiplier, fireRateMultiplier, type Shooter } from './plants';

/**
 * Combate como simulacion pura por pasos (ADR-0008). `stepCombat` avanza la partida un trozo de tiempo
 * y cuenta lo que paso; la escena solo pinta el estado y anima los eventos. Todo en casillas y milisegundos.
 */

export type EnemyKind = keyof typeof ENEMIES;

export interface Enemy {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly lane: number;
  /** Centro del cuerpo, en casillas. Avanza hacia la izquierda, hacia x = 0. */
  readonly x: number;
  readonly hp: number;
  /** Mientras muerde una planta: milisegundos hasta el siguiente mordisco. Null si avanza. */
  readonly biteMs: number | null;
}

export interface Bullet {
  readonly id: number;
  readonly lane: number;
  /** Punta de la bala, en casillas. Avanza hacia la derecha. */
  readonly x: number;
  readonly damage: number;
}

/** Lo que paso durante un paso. La vista lo anima; la regla ya esta aplicada en el estado. */
export type CombatEvent =
  | { readonly type: 'shot'; readonly cell: Cell; readonly bullet: Bullet }
  | { readonly type: 'hit'; readonly bulletId: number; readonly enemyId: number; readonly at: BoardPoint }
  | { readonly type: 'bulletGone'; readonly bulletId: number }
  | { readonly type: 'bite'; readonly enemyId: number; readonly cell: Cell }
  | { readonly type: 'plantDestroyed'; readonly cell: Cell }
  | { readonly type: 'enemyKilled'; readonly enemyId: number; readonly at: BoardPoint }
  | { readonly type: 'enemyEscaped'; readonly enemyId: number; readonly lane: number };

export interface CombatStep {
  readonly state: MatchState;
  readonly events: readonly CombatEvent[];
}

/** Un fotograma lento se simula en pasos de como mucho este tamano, para que nada se salte una regla. */
export const MAX_STEP_MS = 50;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Dano de cada bala: el base de la disparadora por lo que suman canones y nivel. */
export function shotDamage(shooter: Shooter): number {
  return SHOOTER.damage * damageMultiplier(shooter);
}

/** Tiempo entre disparos: el base de la disparadora, mas corto con cada nivel. */
export function fireIntervalMs(shooter: Shooter): number {
  return SHOOTER.fireIntervalMs / fireRateMultiplier(shooter);
}

/** Hocico del enemigo: lo primero que encuentra una bala. */
export function enemyFront(enemy: Enemy): number {
  return enemy.x - ENEMIES[enemy.kind].halfLength;
}

/** Se pierde al quedarse sin vidas (D-07, provisional). Sin vidas, el combate no avanza. */
export function isDefeated(state: MatchState): boolean {
  return state.lives <= 0;
}

/**
 * Pone un enemigo con la vida llena en `x` de su carril. Queda el ultimo de `enemies`.
 * `hp` solo cambia en pruebas (por ejemplo, la prueba de rendimiento en desarrollo).
 */
export function spawnEnemy(state: MatchState, kind: EnemyKind, lane: number, x: number, hp: number = ENEMIES[kind].hp): MatchState {
  if (!Number.isInteger(lane) || lane < 0 || lane >= BOARD.lanes) {
    throw new Error(`Carril invalido: ${lane}`);
  }
  const enemy: Enemy = { id: state.nextId, kind, lane, x, hp, biteMs: null };
  return { ...state, enemies: [...state.enemies, enemy], nextId: state.nextId + 1 };
}

/**
 * ¿Tiene la planta de la casilla a quien disparar? Un enemigo vivo de su carril, por delante de ella
 * y que ya pisa el tablero. A los que ya la pasaron no les dispara.
 */
export function hasTarget(enemies: readonly Enemy[], cell: Cell): boolean {
  const plantX = cell.col + 0.5;
  return enemies.some((e) => e.lane === cell.lane && e.hp > 0 && e.x > plantX && enemyFront(e) <= BOARD.columns);
}

/** Avanza el combate `dtMs` milisegundos. No modifica el estado recibido. */
export function stepCombat(state: MatchState, dtMs: number): CombatStep {
  const events: CombatEvent[] = [];
  let current = state;
  let remaining = dtMs;
  while (remaining > 0 && !isDefeated(current)) {
    const dt = Math.min(remaining, MAX_STEP_MS);
    current = substep(current, dt, events);
    remaining -= dt;
  }
  return { state: current, events };
}

/** Un paso: primero se mueven y muerden los enemigos, luego vuelan las balas y al final disparan las plantas. */
function substep(state: MatchState, dtMs: number, events: CombatEvent[]): MatchState {
  const plants = state.plants.map((lane) => [...lane]);
  let lives = state.lives;
  let nextId = state.nextId;

  // Enemigos: muerden la planta que tocan o avanzan. Los que cruzan el borde izquierdo restan una vida.
  const enemies: Array<Mutable<Enemy>> = [];
  for (const enemy of state.enemies) {
    const stats = ENEMIES[enemy.kind];
    const e: Mutable<Enemy> = { ...enemy };
    const col = bittenColumn(plants[e.lane], e.x, stats.reach);
    if (col !== null) {
      e.biteMs = (e.biteMs ?? stats.firstBiteMs) - dtMs;
      if (e.biteMs <= 0) {
        e.biteMs += stats.biteIntervalMs;
        const cell = { lane: e.lane, col };
        const plant = plants[e.lane][col] as Plant;
        const hp = plant.hp - stats.biteDamage;
        events.push({ type: 'bite', enemyId: e.id, cell });
        if (hp > 0) {
          plants[e.lane][col] = { ...plant, hp };
        } else {
          plants[e.lane][col] = null;
          events.push({ type: 'plantDestroyed', cell });
        }
      }
    } else {
      e.biteMs = null;
      e.x -= (stats.speed * dtMs) / 1000;
      if (e.x < 0) {
        lives = Math.max(0, lives - 1);
        events.push({ type: 'enemyEscaped', enemyId: e.id, lane: e.lane });
        continue;
      }
    }
    enemies.push(e);
  }

  // Balas: dan al primer enemigo que encuentran en su carril o desaparecen al salir del tablero.
  const bullets: Bullet[] = [];
  for (const bullet of state.bullets) {
    const from = bullet.x;
    const to = from + (SHOOTER.bulletSpeed * dtMs) / 1000;
    const target = firstInPath(enemies, bullet.lane, from, to);
    if (target) {
      target.hp -= bullet.damage;
      events.push({
        type: 'hit',
        bulletId: bullet.id,
        enemyId: target.id,
        at: { x: Math.max(from, enemyFront(target)), y: bullet.lane + 0.5 },
      });
      if (target.hp <= 0) {
        events.push({ type: 'enemyKilled', enemyId: target.id, at: { x: target.x, y: target.lane + 0.5 } });
      }
    } else if (to > BOARD.columns) {
      events.push({ type: 'bulletGone', bulletId: bullet.id });
    } else {
      bullets.push({ ...bullet, x: to });
    }
  }
  const alive = enemies.filter((e) => e.hp > 0);

  // Plantas: recargan y disparan si tienen a quien. Si la recarga acaba a mitad de paso, lo que sobra
  // cuenta para el siguiente disparo; una planta que esperaba lista no acumula nada.
  plants.forEach((lane, laneIndex) =>
    lane.forEach((plant, col) => {
      if (!plant) return;
      const cell = { lane: laneIndex, col };
      let reloadMs = plant.reloadMs - dtMs;
      if (reloadMs <= 0) {
        if (hasTarget(alive, cell)) {
          const bullet: Bullet = { id: nextId++, lane: laneIndex, x: col + 0.5, damage: shotDamage(plant.shooter) };
          bullets.push(bullet);
          events.push({ type: 'shot', cell, bullet });
          reloadMs = (plant.reloadMs > 0 ? reloadMs : 0) + fireIntervalMs(plant.shooter);
        } else {
          reloadMs = 0;
        }
      }
      if (reloadMs !== plant.reloadMs) lane[col] = { ...plant, reloadMs };
    }),
  );

  return { ...state, lives, plants, enemies: alive, bullets, nextId };
}

/** Columna de la planta que el enemigo en `x` tiene justo delante, a su alcance; null si no toca ninguna. */
function bittenColumn(lane: ReadonlyArray<Plant | null>, x: number, reach: number): number | null {
  for (let col = lane.length - 1; col >= 0; col--) {
    const gap = x - (col + 0.5);
    if (lane[col] && gap >= 0 && gap <= reach) return col;
  }
  return null;
}

/** Primer enemigo vivo del carril que la bala alcanza al ir de `from` a `to`. Los que ya quedaron atras no cuentan. */
function firstInPath(enemies: Array<Mutable<Enemy>>, lane: number, from: number, to: number): Mutable<Enemy> | null {
  let first: Mutable<Enemy> | null = null;
  for (const e of enemies) {
    if (e.lane !== lane || e.hp <= 0 || e.x < from || enemyFront(e) > to) continue;
    if (!first || enemyFront(e) < enemyFront(first)) first = e;
  }
  return first;
}
