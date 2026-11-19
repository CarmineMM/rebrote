import { BOARD, ENEMIES, FIRE, MINE, SHOOTER } from '../config/balance';
import type { BoardPoint, Cell } from './board';
import type { MatchState, Mine, Sown } from './match';
import { damageMultiplier, fireRateMultiplier, type ElementType, type Shooter } from './plants';

/**
 * Combate como simulacion pura por pasos (ADR-0008). `stepCombat` avanza la partida un trozo de tiempo
 * y cuenta lo que paso; la escena solo pinta el estado y anima los eventos. Todo en casillas y milisegundos.
 */

export type EnemyKind = keyof typeof ENEMIES;

/** Quemadura (T-004): dano por segundo mientras le quede tiempo. */
export interface Burn {
  readonly dps: number;
  /** En una bala, lo que dura al impactar; en un enemigo, lo que le queda. */
  readonly ms: number;
}

export interface Enemy {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly lane: number;
  /** Centro del cuerpo, en casillas. Avanza hacia la izquierda, hacia x = 0. */
  readonly x: number;
  readonly hp: number;
  /** Mientras muerde una planta o una mina: milisegundos hasta el siguiente mordisco. Null si avanza. */
  readonly biteMs: number | null;
  /** Quemadura activa, o null si no arde. */
  readonly burn: Burn | null;
}

/** Lo que deja una bala infundida al impactar, ademas de su dano. El hielo (T-005) anadira su variante. */
export type BulletEffect = { readonly element: 'fire'; readonly burn: Burn };

export interface Bullet {
  readonly id: number;
  readonly lane: number;
  /** Punta de la bala, en casillas. Avanza hacia la derecha. */
  readonly x: number;
  readonly damage: number;
  /** Efecto del elemento de la planta que la disparo, o null si es normal. */
  readonly effect: BulletEffect | null;
}

/** Lo que paso durante un paso. La vista lo anima; la regla ya esta aplicada en el estado. */
export type CombatEvent =
  /** Una planta de N canones dispara N balas a la vez, un evento por bala. `cannon` es el canon (0 es el de arriba). */
  | { readonly type: 'shot'; readonly cell: Cell; readonly bullet: Bullet; readonly cannon: number }
  | { readonly type: 'hit'; readonly bulletId: number; readonly enemyId: number; readonly at: BoardPoint }
  | { readonly type: 'bulletGone'; readonly bulletId: number }
  | { readonly type: 'bite'; readonly enemyId: number; readonly cell: Cell }
  /** Una disparadora o una mina se quedo sin vida. Una mina destruida asi no explota. */
  | { readonly type: 'plantDestroyed'; readonly cell: Cell }
  | { readonly type: 'enemyKilled'; readonly enemyId: number; readonly at: BoardPoint }
  | { readonly type: 'enemyEscaped'; readonly enemyId: number; readonly lane: number }
  /** Un enemigo entro en el radio de la mina: empieza su conteo. */
  | { readonly type: 'mineArmed'; readonly cell: Cell }
  /** La mina exploto y dejo su casilla. `enemyIds` son los enemigos alcanzados; los que mueren llevan su `enemyKilled`. */
  | { readonly type: 'mineExploded'; readonly cell: Cell; readonly element: ElementType; readonly enemyIds: readonly number[] };

export interface CombatStep {
  readonly state: MatchState;
  readonly events: readonly CombatEvent[];
}

/** Un fotograma lento se simula en pasos de como mucho este tamano, para que nada se salte una regla. */
export const MAX_STEP_MS = 50;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Dano de cada bala. El disparo entero (una bala por canon) hace el dano base de la disparadora por lo que
 * suman canones y nivel (`damageMultiplier`), repartido a partes iguales entre sus balas.
 */
export function bulletDamage(shooter: Shooter): number {
  return (SHOOTER.damage * damageMultiplier(shooter)) / shooter.cannons;
}

/**
 * Lo que deja cada bala al impactar segun el elemento de la planta. Cada semilla lleva la quemadura del disparo
 * entero (`damageMultiplier`): asi una de 3 canones, que costo 3 fuegos, quema en proporcion. Como no se acumula,
 * que las tres semillas la lleven solo importa si la primera mata y la siguiente da a otro enemigo.
 */
export function bulletEffect(shooter: Shooter): BulletEffect | null {
  if (shooter.element === 'fire') {
    return { element: 'fire', burn: { dps: FIRE.burnDps * damageMultiplier(shooter), ms: FIRE.burnMs } };
  }
  // El hielo (T-005) todavia no hace nada.
  return null;
}

/**
 * Quemadura que queda tras un impacto que quema con `incoming`. No se acumula: se queda la mas fuerte
 * y la duracion vuelve a empezar.
 */
export function refreshBurn(current: Burn | null, incoming: Burn): Burn {
  return { dps: Math.max(current?.dps ?? 0, incoming.dps), ms: incoming.ms };
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
  const enemy: Enemy = { id: state.nextId, kind, lane, x, hp, biteMs: null, burn: null };
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

/**
 * Un paso: primero arden, se mueven y muerden los enemigos; luego cuentan y explotan las minas; despues vuelan
 * las balas y al final disparan las plantas.
 */
function substep(state: MatchState, dtMs: number, events: CombatEvent[]): MatchState {
  const plants = state.plants.map((lane) => [...lane]);
  let lives = state.lives;
  let nextId = state.nextId;

  // Enemigos: arden si tienen una quemadura, y muerden lo que tocan (planta o mina) o avanzan.
  // Los que cruzan el borde izquierdo restan una vida.
  const enemies: Array<Mutable<Enemy>> = [];
  for (const enemy of state.enemies) {
    const stats = ENEMIES[enemy.kind];
    const e: Mutable<Enemy> = { ...enemy };
    if (e.burn) {
      // Solo arde el tiempo que le queda a la quemadura, aunque el paso sea mas largo.
      e.hp -= (e.burn.dps * Math.min(dtMs, e.burn.ms)) / 1000;
      e.burn = e.burn.ms > dtMs ? { ...e.burn, ms: e.burn.ms - dtMs } : null;
      if (e.hp <= 0) {
        events.push({ type: 'enemyKilled', enemyId: e.id, at: { x: e.x, y: e.lane + 0.5 } });
        continue;
      }
    }
    const col = bittenColumn(plants[e.lane], e.x, stats.reach);
    if (col !== null) {
      e.biteMs = (e.biteMs ?? stats.firstBiteMs) - dtMs;
      if (e.biteMs <= 0) {
        e.biteMs += stats.biteIntervalMs;
        const cell = { lane: e.lane, col };
        const sown = plants[e.lane][col] as Sown;
        const hp = sown.hp - stats.biteDamage;
        events.push({ type: 'bite', enemyId: e.id, cell });
        if (hp > 0) {
          plants[e.lane][col] = { ...sown, hp };
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

  // Minas: la que detecta a un enemigo empieza a contar; la que acaba el conteo explota y deja su casilla,
  // haya o no enemigos en su radio. Una mina destruida a mordiscos en este paso ya no esta.
  plants.forEach((lane, laneIndex) =>
    lane.forEach((sown, col) => {
      if (sown?.kind !== 'mine') return;
      const cell = { lane: laneIndex, col };
      if (sown.fuseMs === null) {
        if (enemies.some((e) => e.hp > 0 && distanceToCell(e, cell) <= MINE.detectRadius)) {
          lane[col] = { ...sown, fuseMs: MINE.countdownMs };
          events.push({ type: 'mineArmed', cell });
        }
        return;
      }
      const fuseMs = sown.fuseMs - dtMs;
      if (fuseMs > 0) {
        lane[col] = { ...sown, fuseMs };
        return;
      }
      lane[col] = null;
      explode(sown, cell, enemies, events);
    }),
  );

  // Balas: dan al primer enemigo que encuentran en su carril o desaparecen al salir del tablero.
  const bullets: Bullet[] = [];
  for (const bullet of state.bullets) {
    const from = bullet.x;
    const to = from + (SHOOTER.bulletSpeed * dtMs) / 1000;
    const target = firstInPath(enemies, bullet.lane, from, to);
    if (target) {
      target.hp -= bullet.damage;
      if (bullet.effect?.element === 'fire') target.burn = refreshBurn(target.burn, bullet.effect.burn);
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

  // Plantas: recargan y disparan si tienen a quien, una bala por canon. Si la recarga acaba a mitad de paso,
  // lo que sobra cuenta para el siguiente disparo; una planta que esperaba lista no acumula nada.
  plants.forEach((lane, laneIndex) =>
    lane.forEach((plant, col) => {
      if (plant?.kind !== 'shooter') return;
      const cell = { lane: laneIndex, col };
      let reloadMs = plant.reloadMs - dtMs;
      if (reloadMs <= 0) {
        if (hasTarget(alive, cell)) {
          const damage = bulletDamage(plant.shooter);
          const effect = bulletEffect(plant.shooter);
          for (let cannon = 0; cannon < plant.shooter.cannons; cannon++) {
            const bullet: Bullet = { id: nextId++, lane: laneIndex, x: col + 0.5, damage, effect };
            bullets.push(bullet);
            events.push({ type: 'shot', cell, bullet, cannon });
          }
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

/** Distancia del centro del enemigo al centro de la casilla, en casillas. Cuenta tambien en otros carriles. */
export function distanceToCell(enemy: Enemy, cell: Cell): number {
  return Math.hypot(enemy.x - (cell.col + 0.5), enemy.lane - cell.lane);
}

/** La mina explota: alcanza a todos los enemigos vivos de su radio, en cualquier carril. */
function explode(mine: Mine, cell: Cell, enemies: Array<Mutable<Enemy>>, events: CombatEvent[]): void {
  const hit = enemies.filter((e) => e.hp > 0 && distanceToCell(e, cell) <= MINE.blastRadius);
  // El hielo (T-005) ralentizara en vez de danar.
  const damage = mine.element === 'fire' ? FIRE.blastDamage : 0;
  events.push({ type: 'mineExploded', cell, element: mine.element, enemyIds: hit.map((e) => e.id) });
  for (const e of hit) {
    e.hp -= damage;
    if (e.hp <= 0) events.push({ type: 'enemyKilled', enemyId: e.id, at: { x: e.x, y: e.lane + 0.5 } });
  }
}

/** Columna de lo sembrado (planta o mina) que el enemigo en `x` tiene justo delante, a su alcance; null si no toca nada. */
function bittenColumn(lane: ReadonlyArray<Sown | null>, x: number, reach: number): number | null {
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
