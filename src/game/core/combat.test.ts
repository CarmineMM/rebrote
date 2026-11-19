import { describe, expect, it } from 'vitest';
import { BOARD, ENEMIES, LIVES, SHOOTER } from '../config/balance';
import type { Cell } from './board';
import {
  MAX_STEP_MS,
  enemyFront,
  fireIntervalMs,
  hasTarget,
  isDefeated,
  shotDamage,
  spawnEnemy,
  stepCombat,
  type CombatEvent,
  type Enemy,
} from './combat';
import { createMatch, createPlant, type MatchState } from './match';
import { createShooter, damageMultiplier, plantMaxHp, type Shooter } from './plants';

const worm = ENEMIES.worm;
/** Donde salen los gusanos en el juego (el agujero de su carril). */
const HOLE_X = BOARD.columns + 0.75;
/** Vida de un gusano que no muere durante la prueba. */
const TOUGH = 1e9;

const shooter = (over: Partial<Shooter> = {}): Shooter => ({ ...createShooter(), ...over });

function withPlant(state: MatchState, cell: Cell, plant: Shooter = createShooter()): MatchState {
  const plants = state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? createPlant(plant) : p)));
  return { ...state, plants };
}

/** Avanza `totalMs` en pasos de `stepMs` y junta los eventos con el momento en que pasaron. */
function run(state: MatchState, totalMs: number, stepMs = 16) {
  const events: Array<CombatEvent & { t: number }> = [];
  let current = state;
  for (let t = 0; t < totalMs; t += stepMs) {
    const dt = Math.min(stepMs, totalMs - t);
    const step = stepCombat(current, dt);
    current = step.state;
    events.push(...step.events.map((e) => ({ ...e, t: t + dt })));
  }
  return { state: current, events };
}

/** Avanza hasta que pase un evento del tipo pedido (o se acabe el tiempo). */
function runUntil(state: MatchState, type: CombatEvent['type'], limitMs = 120_000, stepMs = 16) {
  let current = state;
  for (let t = 0; t < limitMs; t += stepMs) {
    const step = stepCombat(current, stepMs);
    current = step.state;
    const event = step.events.find((e) => e.type === type);
    if (event) return { state: current, event, t: t + stepMs };
  }
  throw new Error(`No paso "${type}" en ${limitMs} ms`);
}

const enemy = (state: MatchState, id: number): Enemy | undefined => state.enemies.find((e) => e.id === id);
const count = (events: readonly CombatEvent[], type: CombatEvent['type']) => events.filter((e) => e.type === type).length;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('gusano', () => {
  it('aparece donde se le pide, con la vida llena, avanzando y con un id propio', () => {
    const one = spawnEnemy(createMatch(), 'worm', 2, HOLE_X);
    const two = spawnEnemy(one, 'worm', 4, HOLE_X);
    expect(two.enemies).toEqual([
      { id: 1, kind: 'worm', lane: 2, x: HOLE_X, hp: worm.hp, biteMs: null },
      { id: 2, kind: 'worm', lane: 4, x: HOLE_X, hp: worm.hp, biteMs: null },
    ]);
    expect(() => spawnEnemy(createMatch(), 'worm', BOARD.lanes, HOLE_X)).toThrow();
  });

  it('avanza a velocidad constante por su carril', () => {
    const start = spawnEnemy(createMatch(), 'worm', 2, HOLE_X);
    const after1 = stepCombat(start, 1000).state;
    const after2 = stepCombat(after1, 1000).state;
    expect(after1.enemies[0].x).toBeCloseTo(HOLE_X - worm.speed);
    expect(after2.enemies[0].x).toBeCloseTo(HOLE_X - 2 * worm.speed);
    expect(after2.enemies[0].lane).toBe(2);
  });

  it('al tocar una planta se detiene y la muerde a intervalos hasta destruirla, y luego sigue', () => {
    const plantCell = { lane: 0, col: 3 };
    const x = plantCell.col + 0.5 + worm.reach;
    const start = spawnEnemy(withPlant(createMatch(), plantCell), 'worm', 0, x, TOUGH);

    const before = run(start, worm.firstBiteMs - 50, 50);
    expect(count(before.events, 'bite')).toBe(0);
    expect(before.state.enemies[0].x).toBe(x);

    const bites = Math.ceil(plantMaxHp(createShooter()) / worm.biteDamage);
    const eating = runUntil(start, 'plantDestroyed', 60_000, 50);
    const all = run(start, eating.t, 50);
    const biteTimes = all.events.filter((e) => e.type === 'bite').map((e) => e.t);
    expect(biteTimes).toHaveLength(bites);
    expect(biteTimes[0]).toBe(worm.firstBiteMs);
    biteTimes.slice(1).forEach((t, i) => expect(t - biteTimes[i]).toBe(worm.biteIntervalMs));
    expect(eating.state.plants[0][3]).toBeNull();
    expect(eating.state.enemies[0].x).toBe(x);

    const walking = stepCombat(eating.state, 1000).state;
    expect(walking.enemies[0].biteMs).toBeNull();
    expect(walking.enemies[0].x).toBeCloseTo(x - worm.speed);
  });

  it('dos gusanos mordiendo la misma planta: al morir la planta, los dos siguen avanzando', () => {
    const plantCell = { lane: 1, col: 4 };
    let state = withPlant(createMatch(), plantCell);
    state = spawnEnemy(state, 'worm', 1, 4.5 + worm.reach, TOUGH);
    state = spawnEnemy(state, 'worm', 1, 4.5 + worm.reach * 0.8, TOUGH);
    const eaten = runUntil(state, 'plantDestroyed').state;
    const xs = eaten.enemies.map((e) => e.x);
    const later = stepCombat(eaten, 1000).state;
    later.enemies.forEach((e, i) => {
      expect(e.biteMs).toBeNull();
      expect(e.x).toBeCloseTo(xs[i] - worm.speed);
    });
  });

  it('al quedarse sin vida desaparece y avisa con su posicion en el tablero', () => {
    let state = withPlant(createMatch(), { lane: 1, col: 0 });
    state = spawnEnemy(state, 'worm', 1, 6, SHOOTER.damage);
    const { state: after, event } = runUntil(state, 'enemyKilled');
    expect(after.enemies).toHaveLength(0);
    expect(event).toMatchObject({ type: 'enemyKilled', enemyId: 1, at: { y: 1.5 } });
    if (event.type === 'enemyKilled') expect(event.at.x).toBeGreaterThan(5);
  });
});

describe('disparo', () => {
  it('sin enemigos en su carril, la disparadora no dispara', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 1 });
    state = spawnEnemy(state, 'worm', 3, 5, TOUGH);
    const { state: after, events } = run(state, 5000);
    expect(count(events, 'shot')).toBe(0);
    expect(after.bullets).toHaveLength(0);
    expect(run(withPlant(createMatch(), { lane: 2, col: 1 }), 5000).events).toHaveLength(0);
  });

  it('dispara a un enemigo de su carril que ya pisa el cesped', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 1 });
    state = spawnEnemy(state, 'worm', 2, 6, TOUGH);
    const { state: after, events } = stepCombat(state, 16);
    expect(events).toEqual([{ type: 'shot', cell: { lane: 2, col: 1 }, bullet: after.bullets[0] }]);
    expect(after.bullets[0]).toMatchObject({ lane: 2, x: 1.5, damage: SHOOTER.damage });
  });

  it('no dispara a un enemigo que todavia no entro en el cesped', () => {
    const cell = { lane: 2, col: 1 };
    let state = withPlant(createMatch(), cell);
    state = spawnEnemy(state, 'worm', 2, HOLE_X, TOUGH);
    expect(hasTarget(state.enemies, cell)).toBe(false);
    expect(count(stepCombat(state, 16).events, 'shot')).toBe(0);
    // Dispara en cuanto el hocico pisa el cesped, ni antes ni mucho despues.
    const firstShot = runUntil(state, 'shot');
    const front = enemyFront(firstShot.state.enemies[0]);
    expect(front).toBeLessThanOrEqual(BOARD.columns);
    expect(front).toBeGreaterThan(BOARD.columns - 0.01);
  });

  it('no dispara a enemigos que ya la pasaron', () => {
    const cell = { lane: 2, col: 5 };
    let state = withPlant(createMatch(), cell);
    state = spawnEnemy(state, 'worm', 2, 5.0, TOUGH);
    expect(hasTarget(state.enemies, cell)).toBe(false);
    expect(count(run(state, 3000).events, 'shot')).toBe(0);
  });

  it('dispara con la cadencia de la planta y mas seguido con mas nivel', () => {
    const cell = { lane: 0, col: 0 };
    const target = (plant: Shooter) => spawnEnemy(withPlant(createMatch(), cell, plant), 'worm', 0, 8.5, TOUGH);
    const shots = run(target(createShooter()), 14_000, 50).events.filter((e) => e.type === 'shot');
    shots.slice(1).forEach((shot, i) => expect(shot.t - shots[i].t).toBe(SHOOTER.fireIntervalMs));
    const leveled = run(target(shooter({ level: 15 })), 14_000, 50).events;
    expect(count(leveled, 'shot')).toBeGreaterThan(shots.length);
  });

  it('cada bala desaparece al impactar y quita su dano', () => {
    let state = withPlant(createMatch(), { lane: 3, col: 2 });
    state = spawnEnemy(state, 'worm', 3, 7, TOUGH);
    const shot = stepCombat(state, 16).state;
    const bulletId = shot.bullets[0].id;
    const { state: after, event } = runUntil(shot, 'hit');
    expect(event).toMatchObject({ type: 'hit', bulletId, enemyId: 1, at: { y: 3.5 } });
    expect(after.bullets.find((b) => b.id === bulletId)).toBeUndefined();
    expect(enemy(after, 1)?.hp).toBe(TOUGH - SHOOTER.damage);
  });

  it('cada bala desaparece al salir del tablero', () => {
    const state: MatchState = { ...createMatch(), bullets: [{ id: 7, lane: 0, x: BOARD.columns - 0.1, damage: 20 }] };
    const { state: after, events } = stepCombat(state, MAX_STEP_MS);
    expect(events).toEqual([{ type: 'bulletGone', bulletId: 7 }]);
    expect(after.bullets).toHaveLength(0);
  });

  it('una bala en vuelo cuando su objetivo muere sigue hasta el siguiente enemigo', () => {
    let state = spawnEnemy(createMatch(), 'worm', 0, 6, SHOOTER.damage);
    state = spawnEnemy(state, 'worm', 0, 8, TOUGH);
    state = {
      ...state,
      bullets: [
        { id: 100, lane: 0, x: 5.0, damage: SHOOTER.damage },
        { id: 101, lane: 0, x: 4.2, damage: SHOOTER.damage },
      ],
    };
    const { events } = run(state, 1500);
    const hits = events.filter((e) => e.type === 'hit');
    expect(hits.map((h) => h.type === 'hit' && [h.bulletId, h.enemyId])).toEqual([
      [100, 1],
      [101, 2],
    ]);
    expect(count(events, 'enemyKilled')).toBe(1);
  });

  it('el dano de cada bala usa damageMultiplier', () => {
    const plant = shooter({ cannons: 2, level: 5 });
    expect(shotDamage(plant)).toBeCloseTo(SHOOTER.damage * damageMultiplier(plant));
    let state = withPlant(createMatch(), { lane: 4, col: 0 }, plant);
    state = spawnEnemy(state, 'worm', 4, 5, TOUGH);
    expect(stepCombat(state, 16).state.bullets[0].damage).toBeCloseTo(shotDamage(plant));
  });

  it('la cadencia sube con el nivel', () => {
    expect(fireIntervalMs(createShooter())).toBe(SHOOTER.fireIntervalMs);
    expect(fireIntervalMs(shooter({ level: 10 }))).toBeLessThan(SHOOTER.fireIntervalMs);
  });
});

describe('vidas y derrota', () => {
  it('cada enemigo que cruza el borde izquierdo resta una vida y desaparece', () => {
    const state = spawnEnemy(createMatch(), 'worm', 4, 0.05);
    const { state: after, events } = stepCombat(state, 1000);
    expect(events).toEqual([{ type: 'enemyEscaped', enemyId: 1, lane: 4 }]);
    expect(after.enemies).toHaveLength(0);
    expect(after.lives).toBe(LIVES.start - 1);
  });

  it('con 0 vidas el combate se detiene', () => {
    let state: MatchState = { ...createMatch(), lives: 1 };
    state = spawnEnemy(state, 'worm', 0, 0.05);
    state = spawnEnemy(state, 'worm', 1, 5);
    const lost = stepCombat(state, 1000).state;
    expect(lost.lives).toBe(0);
    expect(isDefeated(lost)).toBe(true);
    const after = stepCombat(lost, 5000);
    expect(after.events).toHaveLength(0);
    expect(after.state).toBe(lost);
  });
});

describe('simulacion', () => {
  it('no modifica el estado recibido', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 3 });
    state = spawnEnemy(state, 'worm', 2, 3.5 + worm.reach);
    state = { ...state, bullets: [{ id: 50, lane: 2, x: 3.5, damage: 20 }] };
    const frozen = deepFreeze(structuredClone(state));
    expect(() => run(frozen, 3000)).not.toThrow();
    expect(frozen).toEqual(state);
  });

  it('un fotograma largo da lo mismo que varios pasos cortos', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 1 });
    state = spawnEnemy(state, 'worm', 2, 7);
    const long = stepCombat(state, 4 * MAX_STEP_MS);
    const short = run(state, 4 * MAX_STEP_MS, MAX_STEP_MS);
    expect(long.state).toEqual(short.state);
    expect(long.events).toEqual(short.events.map(({ t: _t, ...e }) => e));
  });
});

describe('objetivo final de la task', () => {
  it('disparadora en carril 2 y gusano en carril 2: lo elimina antes de que llegue', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 1 });
    state = spawnEnemy(state, 'worm', 2, HOLE_X);
    const { state: after, events } = run(state, 60_000);
    expect(count(events, 'enemyKilled')).toBe(1);
    expect(count(events, 'bite')).toBe(0);
    expect(after.lives).toBe(LIVES.start);
  });

  it('disparadora en carril 2 y gusano en carril 3: no dispara y el gusano resta una vida', () => {
    let state = withPlant(createMatch(), { lane: 2, col: 1 });
    state = spawnEnemy(state, 'worm', 3, HOLE_X);
    const { state: after, events } = run(state, 60_000);
    expect(count(events, 'shot')).toBe(0);
    expect(after.lives).toBe(LIVES.start - 1);
  });

  it('tres gusanos cruzan: derrota', () => {
    let state = createMatch();
    for (const lane of [0, 2, 4]) state = spawnEnemy(state, 'worm', lane, HOLE_X);
    const after = run(state, 60_000).state;
    expect(LIVES.start).toBe(3);
    expect(after.lives).toBe(0);
    expect(isDefeated(after)).toBe(true);
  });
});
