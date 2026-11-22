import { describe, expect, it } from 'vitest';
import { BOARD, ENEMIES, ENEMY_LEVELS, ENEMY_POWER, FIRE, ICE, LIVES, MINE, SHOOTER } from '../config/balance';
import type { Cell } from './board';
import {
  MAX_STEP_MS,
  bulletDamage,
  bulletEffect,
  distanceToCell,
  enemyDamage,
  enemyFront,
  enemyLevelFactor,
  enemyMaxHp,
  enemyPower,
  fireIntervalMs,
  hasTarget,
  hpFraction,
  isDefeated,
  mineBlast,
  refreshBurn,
  refreshSlow,
  rollEnemyLevel,
  spawnEnemy,
  stepCombat,
  type Bullet,
  type CombatEvent,
  type Enemy,
} from './combat';
import { createMatch, createMine, createPlant, mineAt, type MatchState, type Mine } from './match';
import { createShooter, damageMultiplier, plantMaxHp, type MineElement, type Shooter } from './plants';

const worm = ENEMIES.worm;
/** Vida y mordisco de un gusano de nivel 1, con la fuerza de T-010. */
const wormHp = enemyMaxHp('worm');
const wormBite = enemyDamage({ kind: 'worm', level: 1 });
/** Donde salen los gusanos en el juego (el agujero de su carril). */
const HOLE_X = BOARD.columns + 0.75;
/** Vida de un gusano que no muere durante la prueba. */
const TOUGH = 1e9;

const shooter = (over: Partial<Shooter> = {}): Shooter => ({ ...createShooter(), ...over });

function withPlant(state: MatchState, cell: Cell, plant: Shooter = createShooter()): MatchState {
  const plants = state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? createPlant(plant) : p)));
  return { ...state, plants };
}

function withMine(state: MatchState, cell: Cell, over: Partial<Mine> = {}, element: MineElement = 'fire'): MatchState {
  const plants = state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? { ...createMine(element), ...over } : p)));
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
      { id: 1, kind: 'worm', lane: 2, x: HOLE_X, hp: wormHp, attackMs: null, burn: null, slow: null, haste: 1, level: 1, jump: null, jumpsUsed: 0, clone: false, recital: null },
      { id: 2, kind: 'worm', lane: 4, x: HOLE_X, hp: wormHp, attackMs: null, burn: null, slow: null, haste: 1, level: 1, jump: null, jumpsUsed: 0, clone: false, recital: null },
    ]);
    expect(() => spawnEnemy(createMatch(), 'worm', BOARD.lanes, HOLE_X)).toThrow();
  });

  it('con nivel (T-035): vida y dano crecen en compuesto, un 18,5 % por nivel y un 27 % en los de premio; misma velocidad', () => {
    expect(enemyLevelFactor(1)).toBe(1);
    expect(enemyLevelFactor(4)).toBeCloseTo((1 + ENEMY_LEVELS.perLevel) ** 3, 9);
    expect(enemyLevelFactor(10)).toBeCloseTo((1 + ENEMY_LEVELS.perLevel) ** 7 * (1 + ENEMY_LEVELS.perMilestone) ** 2, 9);
    const strong = spawnEnemy(createMatch(), 'armored', 2, HOLE_X, undefined, 1, 4).enemies[0];
    expect(strong.level).toBe(4);
    expect(strong.hp).toBeCloseTo(ENEMIES.armored.hp * 1.185 ** 3 * ENEMY_POWER.base, 9);
    expect(hpFraction(strong)).toBe(1);
    expect(enemyDamage(strong)).toBeCloseTo(ENEMIES.armored.biteDamage * 1.185 ** 3 * ENEMY_POWER.base, 9);
    expect(enemyDamage({ kind: 'spitter', level: 3 })).toBeCloseTo(ENEMIES.spitter.spitDamage * 1.185 ** 2 * ENEMY_POWER.base, 9);
    const walked = (level: number) => HOLE_X - stepCombat(spawnEnemy(createMatch(), 'worm', 2, HOLE_X, undefined, 1, level), 1000).state.enemies[0].x;
    expect(walked(7)).toBeCloseTo(walked(1), 9);
    expect(() => spawnEnemy(createMatch(), 'worm', 2, HOLE_X, undefined, 1, 0)).toThrow();
  });

  it('fuerza (T-010): todos +10 %, encima de su nivel; sin extra por tramo desde T-035', () => {
    expect(ENEMY_POWER.base).toBe(1.1);
    // Lo que multiplica la base de su tipo: nivel x fuerza.
    expect(enemyPower(1)).toBeCloseTo(1.1, 9);
    expect(enemyPower(4)).toBeCloseTo(1.185 ** 3 * 1.1, 9);
    expect(enemyPower(5)).toBeCloseTo(1.185 ** 3 * 1.27 * 1.1, 9);
    expect(enemyPower(10)).toBeCloseTo(1.185 ** 7 * 1.27 ** 2 * 1.1, 9);
    // Vida de un gusano por nivel, como en la spec.
    expect([1, 4, 5, 7, 9, 10].map((level) => Math.round(enemyMaxHp('worm', level)))).toEqual([110, 183, 232, 326, 458, 582]);
    // Un nivel 5 nunca es mas debil que un nivel 4, ni un 10 que un 9.
    for (let level = 2; level <= 20; level++) expect(enemyPower(level)).toBeGreaterThan(enemyPower(level - 1));
    // Vale igual para el dano y para cualquier tipo.
    expect(enemyDamage({ kind: 'spitter', level: 10 })).toBeCloseTo(ENEMIES.spitter.spitDamage * enemyPower(10), 9);
    expect(enemyMaxHp('armored', 7)).toBeCloseTo(ENEMIES.armored.hp * enemyPower(7), 9);
  });

  it('el nivel al azar sigue los pesos de la tabla; sin tabla, nivel 1', () => {
    const table = { 2: 1, 5: 3 };
    expect(rollEnemyLevel(undefined, () => 0.99)).toBe(1);
    expect(rollEnemyLevel(table, () => 0)).toBe(2);
    expect(rollEnemyLevel(table, () => 0.24)).toBe(2);
    expect(rollEnemyLevel(table, () => 0.26)).toBe(5);
    expect(rollEnemyLevel(table, () => 0.999)).toBe(5);
  });

  it('un enemigo con nivel muerde mas fuerte', () => {
    let state = spawnEnemy(createMatch(), 'worm', 2, 3.5 + worm.reach - 0.01, undefined, 1, 3);
    state = { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === 2 && c === 3 ? createPlant() : p))) };
    const after = stepCombat(state, worm.firstBiteMs + 10).state;
    expect(after.plants[2][3]?.hp).toBeCloseTo(SHOOTER.hp - worm.biteDamage * 1.185 ** 2 * ENEMY_POWER.base, 9);
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

    const bites = Math.ceil(plantMaxHp(createShooter()) / wormBite);
    const eating = runUntil(start, 'plantDestroyed', 60_000, 50);
    const all = run(start, eating.t, 50);
    const biteTimes = all.events.filter((e) => e.type === 'bite').map((e) => e.t);
    expect(biteTimes).toHaveLength(bites);
    expect(biteTimes[0]).toBe(worm.firstBiteMs);
    biteTimes.slice(1).forEach((t, i) => expect(t - biteTimes[i]).toBe(worm.biteIntervalMs));
    expect(eating.state.plants[0][3]).toBeNull();
    expect(eating.state.enemies[0].x).toBe(x);

    const walking = stepCombat(eating.state, 1000).state;
    expect(walking.enemies[0].attackMs).toBeNull();
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
      expect(e.attackMs).toBeNull();
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
    expect(events).toEqual([{ type: 'shot', cell: { lane: 2, col: 1 }, bullet: after.bullets[0], cannon: 0 }]);
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
    const state: MatchState = { ...createMatch(), bullets: [{ id: 7, lane: 0, x: BOARD.columns - 0.1, damage: 20, effect: null }] };
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
        { id: 100, lane: 0, x: 5.0, damage: SHOOTER.damage, effect: null },
        { id: 101, lane: 0, x: 4.2, damage: SHOOTER.damage, effect: null },
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

  it('una planta fusionada dispara a la vez una bala por canon', () => {
    for (const cannons of [2, 3] as const) {
      let state = withPlant(createMatch(), { lane: 4, col: 0 }, shooter({ cannons }));
      state = spawnEnemy(state, 'worm', 4, 5, TOUGH);
      const { state: after, events } = stepCombat(state, 16);
      expect(events.map((e) => e.type === 'shot' && e.cannon)).toEqual([0, 1, 2].slice(0, cannons));
      expect(after.bullets).toHaveLength(cannons);
      expect(after.bullets.every((b) => b.lane === 4 && b.x === 0.5)).toBe(true);
      expect(new Set(after.bullets.map((b) => b.id)).size).toBe(cannons);
    }
  });

  it('el dano del disparo usa damageMultiplier y se reparte entre sus balas', () => {
    const plant = shooter({ cannons: 2, level: 5 });
    expect(bulletDamage(plant) * plant.cannons).toBeCloseTo(SHOOTER.damage * damageMultiplier(plant));
    let state = withPlant(createMatch(), { lane: 4, col: 0 }, plant);
    state = spawnEnemy(state, 'worm', 4, 5, TOUGH);
    const { bullets } = stepCombat(state, 16).state;
    bullets.forEach((b) => expect(b.damage).toBeCloseTo(bulletDamage(plant)));
    expect(bulletDamage(createShooter())).toBe(SHOOTER.damage);
  });

  it('una fusionada hace mas dano que las plantas sueltas que la forman', () => {
    const lane = 0;
    const tough = (state: MatchState) => spawnEnemy(state, 'worm', lane, 8.5, TOUGH);
    const damageDone = (state: MatchState) => TOUGH - (enemy(run(state, 20_000, 50).state, 1)?.hp ?? 0);
    const two = tough(withPlant(withPlant(createMatch(), { lane, col: 0 }), { lane, col: 1 }));
    const fused2 = tough(withPlant(createMatch(), { lane, col: 0 }, shooter({ cannons: 2 })));
    const three = tough(withPlant(withPlant(withPlant(createMatch(), { lane, col: 0 }), { lane, col: 1 }), { lane, col: 2 }));
    const fused3 = tough(withPlant(createMatch(), { lane, col: 0 }, shooter({ cannons: 3 })));
    expect(damageDone(fused2)).toBeGreaterThan(damageDone(two));
    expect(damageDone(fused3)).toBeGreaterThan(damageDone(three));
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
    expect(events).toEqual([{ type: 'enemyEscaped', enemyId: 1, lane: 4, kind: 'worm' }]);
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
    state = spawnEnemy(withPlant(state, { lane: 4, col: 2 }), 'spitter', 4, 2.5 + ENEMIES.spitter.range);
    state = {
      ...state,
      bullets: [{ id: 50, lane: 2, x: 3.5, damage: 20, effect: null }],
      spits: [{ id: 51, lane: 4, x: 4, damage: ENEMIES.spitter.spitDamage }],
    };
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

describe('mina de fuego (T-004)', () => {
  const cell = { lane: 2, col: 4 };
  const center = cell.col + 0.5;

  it('sin enemigos cerca espera sin contar', () => {
    let state = withMine(createMatch(), cell);
    state = spawnEnemy(state, 'worm', 0, center, TOUGH); // dos carriles mas atras: fuera del radio
    state = spawnEnemy(state, 'worm', 2, BOARD.columns + 3, TOUGH); // en su carril, pero lejos
    const { state: after, events } = run(state, 5000, 50);
    expect(count(events, 'mineArmed')).toBe(0);
    expect(mineAt(after, cell)?.fuseMs).toBeNull();
  });

  it('al entrar un enemigo en su radio cuenta 2 s, explota, dana en area y desaparece', () => {
    let state = withMine(createMatch(), cell);
    state = spawnEnemy(state, 'worm', 2, center + 3, TOUGH);
    const armed = runUntil(state, 'mineArmed', 60_000, 50);
    expect(armed.event).toEqual({ type: 'mineArmed', cell });
    expect(distanceToCell(armed.state.enemies[0], cell)).toBeLessThanOrEqual(MINE.detectRadius);
    expect(distanceToCell(armed.state.enemies[0], cell)).toBeGreaterThan(MINE.detectRadius - worm.speed * 0.05 - 1e-9);
    expect(mineAt(armed.state, cell)?.fuseMs).toBe(MINE.countdownMs);

    const before = run(armed.state, MINE.countdownMs - 50, 50);
    expect(count(before.events, 'mineExploded')).toBe(0);
    const boom = runUntil(armed.state, 'mineExploded', 60_000, 50);
    expect(boom.t).toBe(MINE.countdownMs);
    expect(boom.event).toEqual({ type: 'mineExploded', cell, element: 'fire', enemyIds: [1] });
    expect(boom.state.plants[cell.lane][cell.col]).toBeNull();
    expect(boom.state.enemies[0].hp).toBe(TOUGH - FIRE.blastDamage);
  });

  it('alcanza a todos los enemigos de su radio, tambien en los carriles de al lado, y a ninguno de fuera', () => {
    let state = withMine(createMatch(), cell, { fuseMs: 10 });
    const placed: Array<[number, number]> = [
      [2, center + 1.4], // su carril, dentro
      [2, center - 1.4], // su carril, por detras y dentro
      [1, center + 1.0], // carril de al lado, dentro
      [3, center - 0.5], // carril de al lado, dentro
      [2, center + 1.6], // su carril, fuera
      [1, center + 1.2], // carril de al lado, fuera
      [0, center], // dos carriles mas atras, fuera
    ];
    for (const [lane, x] of placed) state = spawnEnemy(state, 'worm', lane, x, TOUGH);
    const { state: after, events } = stepCombat(state, 10);
    const exploded = events.find((e) => e.type === 'mineExploded');
    expect(exploded).toMatchObject({ enemyIds: [1, 2, 3, 4] });
    after.enemies.forEach((e) => {
      const original = state.enemies.find((o) => o.id === e.id) as Enemy;
      const inRange = distanceToCell(original, cell) <= MINE.blastRadius;
      expect(e.hp).toBe(inRange ? TOUGH - FIRE.blastDamage : TOUGH);
    });
  });

  it('mata a los gusanos que alcanza y cada uno da su enemyKilled', () => {
    let state = withMine(createMatch(), cell, { fuseMs: 10 });
    state = spawnEnemy(state, 'worm', 2, center + 1);
    state = spawnEnemy(state, 'worm', 3, center);
    const { state: after, events } = stepCombat(state, 10);
    expect(events.map((e) => e.type)).toEqual(['mineExploded', 'enemyKilled', 'enemyKilled']);
    expect(after.enemies).toHaveLength(0);
  });

  it('explota igual aunque el enemigo ya no este en su radio al terminar el conteo', () => {
    let state = withMine(createMatch(), cell);
    state = spawnEnemy(state, 'worm', 2, center + 1, TOUGH);
    const armed = stepCombat(state, 50);
    expect(count(armed.events, 'mineArmed')).toBe(1);
    // El enemigo se va (aqui, desaparece del estado): la mina sigue contando.
    const gone = { ...armed.state, enemies: [] };
    const boom = runUntil(gone, 'mineExploded', 60_000, 50);
    expect(boom.t).toBe(MINE.countdownMs);
    expect(boom.event).toMatchObject({ enemyIds: [] });
    expect(boom.state.plants[cell.lane][cell.col]).toBeNull();
  });

  it('dos minas juntas llevan cada una su propio conteo', () => {
    const near = { lane: 2, col: 6 };
    let state = withMine(withMine(createMatch(), cell), near);
    state = spawnEnemy(state, 'worm', 2, near.col + 0.5 + 2, TOUGH);
    const { events } = run(state, 20_000, 50);
    const at = (type: CombatEvent['type'], col: number) =>
      events.filter((e) => e.type === type && 'cell' in e && e.cell?.col === col).map((e) => e.t);
    expect(at('mineArmed', near.col)).toHaveLength(1);
    expect(at('mineArmed', cell.col)).toHaveLength(1);
    expect(at('mineArmed', cell.col)[0]).toBeGreaterThan(at('mineExploded', near.col)[0]);
    for (const col of [near.col, cell.col]) {
      expect(at('mineExploded', col)[0] - at('mineArmed', col)[0]).toBe(MINE.countdownMs);
    }
  });

  it('los gusanos la muerden como a una planta; destruida antes de terminar el conteo, no explota', () => {
    let state = withMine(createMatch(), cell, { hp: wormBite });
    state = spawnEnemy(state, 'worm', 2, center + worm.reach, TOUGH);
    const { state: after, events } = run(state, MINE.countdownMs + 2000, 50);
    expect(events.map((e) => e.type).slice(0, 3)).toEqual(['mineArmed', 'bite', 'plantDestroyed']);
    expect(count(events, 'mineExploded')).toBe(0);
    expect(after.plants[cell.lane][cell.col]).toBeNull();
    expect(after.enemies[0].hp).toBe(TOUGH);
    // Sin la mina delante, el gusano sigue su camino.
    expect(after.enemies[0].x).toBeLessThan(center + worm.reach);
  });
});

describe('quemadura (T-004)', () => {
  const fireShooter = (over: Partial<Shooter> = {}) => shooter({ element: 'fire', ...over });
  const fireBullet = (id: number, x: number, plant: Shooter = fireShooter()): Bullet => ({
    id,
    lane: 0,
    x,
    damage: bulletDamage(plant),
    effect: bulletEffect(plant),
  });

  it('las balas de una disparadora de fuego llevan la quemadura; las normales, no', () => {
    expect(bulletEffect(createShooter())).toBeNull();
    expect(bulletEffect(fireShooter())).toEqual({ element: 'fire', burn: { dps: FIRE.burnDps, ms: FIRE.burnMs } });
    let state = withPlant(createMatch(), { lane: 0, col: 0 }, fireShooter());
    state = spawnEnemy(state, 'worm', 0, 6, TOUGH);
    expect(stepCombat(state, 16).state.bullets[0].effect).toEqual(bulletEffect(fireShooter()));
  });

  it('cada semilla de una fusionada de fuego quema con la fuerza del disparo entero', () => {
    const plant = fireShooter({ cannons: 3, level: 2 });
    expect(bulletEffect(plant)).toEqual({ element: 'fire', burn: { dps: expect.closeTo(FIRE.burnDps * damageMultiplier(plant)), ms: FIRE.burnMs } });
    let state = withPlant(createMatch(), { lane: 0, col: 0 }, plant);
    state = spawnEnemy(state, 'worm', 0, 6, TOUGH);
    const { bullets } = stepCombat(state, 16).state;
    expect(bullets).toHaveLength(3);
    bullets.forEach((b) => expect(b.effect).toEqual(bulletEffect(plant)));
  });

  it('el impacto hace su dano y despues el enemigo sigue perdiendo vida mientras dura la quemadura', () => {
    let state = spawnEnemy(createMatch(), 'worm', 0, 3, TOUGH);
    state = { ...state, bullets: [fireBullet(100, 2)] };
    const hit = runUntil(state, 'hit', 5000, 50);
    const target = hit.state.enemies[0];
    expect(target.hp).toBe(TOUGH - SHOOTER.damage);
    expect(target.burn).toEqual({ dps: FIRE.burnDps, ms: FIRE.burnMs });

    const halfway = run(hit.state, FIRE.burnMs / 2, 50).state.enemies[0];
    expect(halfway.hp).toBeCloseTo(TOUGH - SHOOTER.damage - (FIRE.burnDps * FIRE.burnMs) / 2000);
    const done = run(hit.state, FIRE.burnMs + 2000, 50).state.enemies[0];
    expect(done.burn).toBeNull();
    expect(done.hp).toBeCloseTo(TOUGH - SHOOTER.damage - (FIRE.burnDps * FIRE.burnMs) / 1000);
  });

  it('no se acumula: un nuevo impacto reinicia su duracion', () => {
    const gap = 1000;
    let state = spawnEnemy(createMatch(), 'worm', 0, 3, TOUGH);
    state = { ...state, bullets: [fireBullet(100, 2)] };
    const first = runUntil(state, 'hit', 5000, 50);
    const later = run(first.state, gap, 50).state;
    expect(later.enemies[0].burn?.ms).toBe(FIRE.burnMs - gap);
    const second = runUntil({ ...later, bullets: [fireBullet(101, later.enemies[0].x - 0.5)] }, 'hit', 5000, 50);
    expect(second.state.enemies[0].burn).toEqual({ dps: FIRE.burnDps, ms: FIRE.burnMs });
    const done = run(second.state, FIRE.burnMs + 2000, 50).state.enemies[0];
    const burnedMs = gap + second.t + FIRE.burnMs;
    expect(done.hp).toBeCloseTo(TOUGH - 2 * SHOOTER.damage - (FIRE.burnDps * burnedMs) / 1000);
  });

  it('entre quemaduras de distinta fuerza se queda la mas fuerte, con la duracion reiniciada', () => {
    const weak = { dps: 8, ms: FIRE.burnMs };
    const strong = { dps: 28, ms: FIRE.burnMs };
    expect(refreshBurn(null, weak)).toEqual(weak);
    expect(refreshBurn({ dps: 28, ms: 200 }, weak)).toEqual({ dps: 28, ms: FIRE.burnMs });
    expect(refreshBurn({ dps: 8, ms: 200 }, strong)).toEqual(strong);
  });

  it('una disparadora de fuego mata antes que una normal', () => {
    const lane = 0;
    const killTime = (plant: Shooter) => {
      let state = withPlant(createMatch(), { lane, col: 0 }, plant);
      state = spawnEnemy(state, 'worm', lane, 6);
      return runUntil(state, 'enemyKilled', 60_000, 50).t;
    };
    expect(killTime(fireShooter())).toBeLessThan(killTime(createShooter()));
  });

  it('un enemigo que muere quemado da su enemyKilled y desaparece', () => {
    let state = spawnEnemy(createMatch(), 'worm', 0, 5, 5);
    state = { ...state, enemies: [{ ...state.enemies[0], burn: { dps: 10, ms: 5000 } }] };
    const { state: after, event, t } = runUntil(state, 'enemyKilled', 5000, 50);
    expect(t).toBe(500);
    expect(event).toMatchObject({ type: 'enemyKilled', enemyId: 1, at: { y: 0.5 } });
    expect(after.enemies).toHaveLength(0);
  });
});

describe('mina de hielo (T-005)', () => {
  const cell = { lane: 2, col: 4 };
  const center = cell.col + 0.5;
  const blastSlow = { amount: ICE.blastSlow, ms: ICE.blastSlowMs };

  it('sigue el mismo conteo de 2 s que la de fuego', () => {
    const countdown = (element: MineElement) => {
      let state = withMine(createMatch(), cell, {}, element);
      state = spawnEnemy(state, 'worm', 2, center + 3, TOUGH);
      const armed = runUntil(state, 'mineArmed', 60_000, 50);
      const boom = runUntil(armed.state, 'mineExploded', 60_000, 50);
      return { armedAt: armed.t, after: boom.t, event: boom.event };
    };
    const ice = countdown('ice');
    expect(ice).toEqual({ ...countdown('fire'), event: { type: 'mineExploded', cell, element: 'ice', enemyIds: [1] } });
    expect(ice.after).toBe(MINE.countdownMs);
  });

  it('al explotar no hace dano y ralentiza a todos los enemigos de su radio, tambien en los carriles de al lado', () => {
    let state = withMine(createMatch(), cell, { fuseMs: 10 }, 'ice');
    const placed: Array<[number, number]> = [
      [2, center + 1.4], // su carril, dentro
      [2, center - 1.4], // su carril, por detras y dentro
      [1, center + 1.0], // carril de al lado, dentro
      [3, center - 0.5], // carril de al lado, dentro
      [2, center + 1.6], // su carril, fuera
      [1, center + 1.2], // carril de al lado, fuera
      [0, center], // dos carriles mas atras, fuera
    ];
    for (const [lane, x] of placed) state = spawnEnemy(state, 'worm', lane, x);
    const { state: after, events } = stepCombat(state, 10);
    expect(events).toEqual([{ type: 'mineExploded', cell, element: 'ice', enemyIds: [1, 2, 3, 4] }]);
    expect(after.plants[cell.lane][cell.col]).toBeNull();
    after.enemies.forEach((e) => {
      const original = state.enemies.find((o) => o.id === e.id) as Enemy;
      expect(e.hp).toBe(wormHp);
      expect(e.slow).toEqual(distanceToCell(original, cell) <= MINE.blastRadius ? blastSlow : null);
    });
    expect(mineBlast('ice')).toEqual({ damage: 0, slow: blastSlow });
  });

  it('los alcanzados avanzan un 70 % mas despacio durante 4 s y luego vuelven a su velocidad (D-06)', () => {
    expect(ICE.blastSlow).toBe(0.7);
    expect(ICE.blastSlowMs).toBe(4000);
    let state = withMine(createMatch(), cell, { fuseMs: 10 }, 'ice');
    state = spawnEnemy(state, 'worm', 2, center + 1, TOUGH);
    const blasted = stepCombat(state, 10).state;
    const x0 = blasted.enemies[0].x;
    const slowed = run(blasted, ICE.blastSlowMs - 10, 50).state.enemies[0];
    expect(x0 - slowed.x).toBeCloseTo((worm.speed * (1 - ICE.blastSlow) * ICE.blastSlowMs) / 1000);
    const back = run(blasted, ICE.blastSlowMs + 1000, 50).state.enemies[0];
    expect(back.slow).toBeNull();
    expect(slowed.x - back.x).toBeCloseTo((worm.speed * 1000) / 1000);
  });

  it('un enemigo ralentizado tambien muerde mas despacio, en la misma proporcion', () => {
    expect(ICE.slowsAttacks).toBe(true);
    const plantCell = { lane: 0, col: 3 };
    const x = plantCell.col + 0.5 + worm.reach;
    const start = spawnEnemy(withPlant(createMatch(), plantCell), 'worm', 0, x, TOUGH);
    const slowed = { ...start, enemies: [{ ...start.enemies[0], slow: { amount: 0.5, ms: 60_000 } }] };
    expect(runUntil(start, 'bite', 10_000, 10).t).toBe(worm.firstBiteMs);
    expect(runUntil(slowed, 'bite', 10_000, 10).t).toBe(worm.firstBiteMs * 2);
  });
});

describe('balas de hielo (T-005)', () => {
  const iceShooter = (over: Partial<Shooter> = {}) => shooter({ element: 'ice', ...over });
  const iceBullet = (id: number, x: number, plant: Shooter = iceShooter()): Bullet => ({
    id,
    lane: 0,
    x,
    damage: bulletDamage(plant),
    effect: bulletEffect(plant),
  });

  it('las balas de una disparadora de hielo frenan, mas cuantos mas canones', () => {
    for (const cannons of [1, 2, 3] as const) {
      const plant = iceShooter({ cannons, level: 5 });
      expect(bulletEffect(plant)).toEqual({ element: 'ice', slow: { amount: ICE.bulletSlowByCannons[cannons], ms: ICE.bulletSlowMs } });
      expect(bulletDamage(plant)).toBe(bulletDamage(shooter({ cannons, level: 5 })));
    }
    expect(ICE.bulletSlowByCannons[2]).toBeGreaterThan(ICE.bulletSlowByCannons[1]);
    expect(ICE.bulletSlowByCannons[3]).toBeGreaterThan(ICE.bulletSlowByCannons[2]);
    let state = withPlant(createMatch(), { lane: 0, col: 0 }, iceShooter({ cannons: 3 }));
    state = spawnEnemy(state, 'worm', 0, 6, TOUGH);
    const { bullets } = stepCombat(state, 16).state;
    expect(bullets).toHaveLength(3);
    bullets.forEach((b) => expect(b.effect).toEqual(bulletEffect(iceShooter({ cannons: 3 }))));
  });

  it('la mina frena mas y durante mas tiempo que cualquier bala', () => {
    for (const cannons of [1, 2, 3] as const) expect(ICE.blastSlow).toBeGreaterThan(ICE.bulletSlowByCannons[cannons]);
    expect(ICE.blastSlowMs).toBeGreaterThan(ICE.bulletSlowMs);
  });

  it('el impacto hace su dano y frena al enemigo durante un tiempo', () => {
    let state = spawnEnemy(createMatch(), 'worm', 0, 3, TOUGH);
    state = { ...state, bullets: [iceBullet(100, 2)] };
    const hit = runUntil(state, 'hit', 5000, 50);
    const target = hit.state.enemies[0];
    expect(target.hp).toBe(TOUGH - SHOOTER.damage);
    expect(target.slow).toEqual({ amount: ICE.bulletSlowByCannons[1], ms: ICE.bulletSlowMs });
    expect(target.burn).toBeNull();

    const slowed = run(hit.state, 1000, 50).state.enemies[0];
    expect(target.x - slowed.x).toBeCloseTo(worm.speed * (1 - ICE.bulletSlowByCannons[1]));
    const done = run(hit.state, ICE.bulletSlowMs + 1000, 50).state.enemies[0];
    expect(done.slow).toBeNull();
  });

  it('el gusano frenado tarda mas en llegar a la planta que con una disparadora normal', () => {
    const lane = 0;
    const arrival = (plant: Shooter) => {
      let state = withPlant(createMatch(), { lane, col: 0 }, plant);
      state = spawnEnemy(state, 'worm', lane, 5, TOUGH);
      return runUntil(state, 'bite', 60_000, 50).t;
    };
    expect(arrival(iceShooter())).toBeGreaterThan(arrival(createShooter()) * 1.3);
  });

  it('no se acumula: se aplica la mas fuerte y se reinicia la duracion', () => {
    const weak = { amount: 0.3, ms: ICE.bulletSlowMs };
    const strong = { amount: 0.7, ms: ICE.blastSlowMs };
    expect(refreshSlow(null, weak)).toEqual(weak);
    // Igual o mas fuerte: la que llega, con la duracion entera.
    expect(refreshSlow({ amount: 0.3, ms: 200 }, weak)).toEqual(weak);
    expect(refreshSlow({ amount: 0.3, ms: 200 }, strong)).toEqual(strong);
    // Mas debil: la que habia sigue como estaba (ni se acorta ni se alarga).
    expect(refreshSlow({ amount: 0.7, ms: 200 }, weak)).toEqual({ amount: 0.7, ms: 200 });
    expect(refreshSlow({ amount: 0.7, ms: 3900 }, weak)).toEqual({ amount: 0.7, ms: 3900 });
  });

  it('dos impactos seguidos: el segundo reinicia la duracion', () => {
    const gap = 1000;
    let state = spawnEnemy(createMatch(), 'worm', 0, 3, TOUGH);
    state = { ...state, bullets: [iceBullet(100, 2)] };
    const first = runUntil(state, 'hit', 5000, 50);
    const later = run(first.state, gap, 50).state;
    expect(later.enemies[0].slow?.ms).toBe(ICE.bulletSlowMs - gap);
    const second = runUntil({ ...later, bullets: [iceBullet(101, later.enemies[0].x - 0.5)] }, 'hit', 5000, 50);
    expect(second.state.enemies[0].slow).toEqual({ amount: ICE.bulletSlowByCannons[1], ms: ICE.bulletSlowMs });
  });

  it('una bala no acorta la ralentizacion de la mina', () => {
    let state = spawnEnemy(createMatch(), 'worm', 0, 3, TOUGH);
    state = { ...state, enemies: [{ ...state.enemies[0], slow: { amount: ICE.blastSlow, ms: ICE.blastSlowMs } }] };
    state = { ...state, bullets: [iceBullet(100, 2)] };
    const hit = runUntil(state, 'hit', 5000, 50);
    expect(hit.state.enemies[0].slow).toEqual({ amount: ICE.blastSlow, ms: ICE.blastSlowMs - hit.t });
  });

  it('quemado y ralentizado a la vez: los dos efectos conviven', () => {
    let state = spawnEnemy(createMatch(), 'worm', 0, 3, TOUGH);
    const burn = { dps: FIRE.burnDps, ms: 10_000 };
    state = { ...state, enemies: [{ ...state.enemies[0], burn }], bullets: [iceBullet(100, 2)] };
    const hit = runUntil(state, 'hit', 5000, 50);
    const target = hit.state.enemies[0];
    expect(target.burn).toEqual({ ...burn, ms: burn.ms - hit.t });
    expect(target.slow).toEqual({ amount: ICE.bulletSlowByCannons[1], ms: ICE.bulletSlowMs });

    const later = run(hit.state, 1000, 50).state.enemies[0];
    expect(target.hp - later.hp).toBeCloseTo(FIRE.burnDps);
    expect(target.x - later.x).toBeCloseTo(worm.speed * (1 - ICE.bulletSlowByCannons[1]));
    // Y al reves: una de fuego sobre un gusano frenado le deja las dos.
    const fire = shooter({ element: 'fire' });
    const fired = { ...hit.state, bullets: [{ id: 200, lane: 0, x: target.x - 0.5, damage: bulletDamage(fire), effect: bulletEffect(fire) }] };
    const both = runUntil(fired, 'hit', 5000, 50).state.enemies[0];
    expect(both.burn?.ms).toBe(FIRE.burnMs);
    expect(both.slow).not.toBeNull();
  });
});

describe('gusano acorazado (T-007)', () => {
  const armored = ENEMIES.armored;
  const armoredBite = enemyDamage({ kind: 'armored', level: 1 });

  it('tiene varias veces la vida del gusano y avanza mas lento', () => {
    expect(armored.hp).toBeGreaterThanOrEqual(3 * worm.hp);
    expect(armored.speed).toBeLessThan(worm.speed);
    const start = spawnEnemy(createMatch(), 'armored', 1, HOLE_X);
    expect(start.enemies[0]).toMatchObject({ kind: 'armored', hp: enemyMaxHp('armored') });
    const after = stepCombat(start, 2000).state.enemies[0];
    expect(HOLE_X - after.x).toBeCloseTo((armored.speed * 2000) / 1000);
  });

  it('muerde lo que toca como el gusano', () => {
    const plantCell = { lane: 1, col: 4 };
    const x = plantCell.col + 0.5 + armored.reach;
    const start = spawnEnemy(withPlant(createMatch(), plantCell), 'armored', 1, x, TOUGH);
    const { state, event, t } = runUntil(start, 'bite', 10_000, 10);
    expect(t).toBe(armored.firstBiteMs);
    expect(event).toEqual({ type: 'bite', enemyId: 1, cell: plantCell });
    expect(state.plants[1][4]?.hp).toBe(SHOOTER.hp - armoredBite);
  });

  it('una disparadora tarda varias veces mas en eliminarlo que a un gusano', () => {
    const cell = { lane: 2, col: 0 };
    const timeToKill = (kind: 'worm' | 'armored') => runUntil(spawnEnemy(withPlant(createMatch(), cell), kind, 2, 8), 'enemyKilled').t;
    expect(timeToKill('armored')).toBeGreaterThan(3 * timeToKill('worm'));
  });
});

describe('gusano escupidor (T-007)', () => {
  const spitter = ENEMIES.spitter;
  const spitDamage = enemyDamage({ kind: 'spitter', level: 1 });
  const lane = 3;
  /** Escupidor en `x` del carril 3, que no muere durante la prueba. */
  const withSpitter = (state: MatchState, x: number) => spawnEnemy(state, 'spitter', lane, x, TOUGH);

  it('se para a su distancia de lo primero sembrado en su carril y le escupe', () => {
    const plantCell = { lane, col: 3 };
    const stopX = plantCell.col + 0.5 + spitter.range;
    const start = withSpitter(withPlant(createMatch(), plantCell), stopX + 0.5);
    const { state, event, t } = runUntil(start, 'spat', 30_000, 10);
    const walkMs = (0.5 / spitter.speed) * 1000;
    expect(t).toBeGreaterThanOrEqual(walkMs + spitter.firstSpitMs);
    expect(t).toBeLessThanOrEqual(walkMs + spitter.firstSpitMs + 20);
    const stopped = state.enemies[0];
    expect(stopped.x).toBeGreaterThanOrEqual(stopX - 0.01);
    expect(stopped.x).toBeLessThanOrEqual(stopX + 0.01);
    expect(stopped.attackMs).not.toBeNull();
    expect(event).toMatchObject({ type: 'spat', enemyId: 1, spit: { lane, x: stopped.x, damage: spitDamage } });
    // Quieto mientras escupe.
    expect(run(state, 3000).state.enemies[0].x).toBe(stopped.x);
  });

  it('el escupitajo vuela hacia la izquierda y quita su dano a la planta', () => {
    const plantCell = { lane, col: 3 };
    const x = plantCell.col + 0.5 + spitter.range;
    const start = withSpitter(withPlant(createMatch(), plantCell), x);
    const spat = runUntil(start, 'spat', 10_000, 10);
    const { state, event, t } = runUntil(spat.state, 'spitHit', 10_000, 10);
    expect(event).toEqual({ type: 'spitHit', spitId: spat.state.spits[0].id, cell: plantCell });
    expect(t).toBeCloseTo((spitter.range / spitter.spitSpeed) * 1000, -2);
    expect(state.spits).toHaveLength(0);
    expect(state.plants[lane][3]?.hp).toBe(SHOOTER.hp - spitDamage);
  });

  it('escupe cada cierto tiempo hasta destruir la planta, y luego sigue hasta la siguiente', () => {
    const front = { lane, col: 5 };
    const back = { lane, col: 1 };
    const start = withSpitter(withPlant(withPlant(createMatch(), back), front), front.col + 0.5 + spitter.range);
    const destroyed = runUntil(start, 'plantDestroyed', 120_000, 20);
    expect(destroyed.event).toEqual({ type: 'plantDestroyed', cell: front });
    const spits = Math.ceil(SHOOTER.hp / spitDamage);
    expect(destroyed.t).toBeGreaterThanOrEqual(spitter.firstSpitMs + (spits - 1) * spitter.spitIntervalMs);
    const next = runUntil(destroyed.state, 'spat', 60_000, 20);
    expect(next.state.enemies[0].x).toBeCloseTo(back.col + 0.5 + spitter.range, 1);
  });

  it('solo cuenta lo que tiene delante: ignora lo sembrado detras de el', () => {
    const behind = { lane, col: 8 };
    const ahead = { lane, col: 2 };
    const start = withSpitter(withPlant(withPlant(createMatch(), behind), ahead), 8.2);
    const { state } = runUntil(start, 'spat', 60_000, 20);
    expect(state.enemies[0].x).toBeCloseTo(ahead.col + 0.5 + spitter.range, 1);
  });

  it('no se para antes de pisar el cesped: asi las plantas le pueden dar', () => {
    const plantCell = { lane, col: 8 };
    const start = withSpitter(withPlant(createMatch(), plantCell), HOLE_X);
    const { state } = runUntil(start, 'spat', 30_000, 10);
    const stopped = state.enemies[0];
    expect(enemyFront(stopped)).toBeLessThanOrEqual(BOARD.columns);
    expect(enemyFront(stopped)).toBeGreaterThan(BOARD.columns - 0.01);
    expect(hasTarget(state.enemies, plantCell)).toBe(true);
  });

  it('puede destruir una mina antes de que explote: se para fuera de su radio', () => {
    expect(spitter.range).toBeGreaterThan(MINE.detectRadius);
    const cell = { lane, col: 4 };
    const start = withSpitter(withMine(createMatch(), cell), HOLE_X);
    const { state, event, t } = runUntil(start, 'plantDestroyed', 120_000, 20);
    expect(event).toEqual({ type: 'plantDestroyed', cell });
    expect(mineAt(state, cell)).toBeNull();
    const before = run(start, t).events;
    expect(count(before, 'mineArmed')).toBe(0);
    expect(count(before, 'mineExploded')).toBe(0);
    expect(count(before, 'spitHit')).toBe(Math.ceil(MINE.hp / spitDamage));
  });

  it('un escupitajo cuya planta ya no esta sigue hasta lo siguiente o sale del tablero', () => {
    const plants = withPlant(createMatch(), { lane, col: 1 });
    const flying: MatchState = { ...plants, spits: [{ id: 50, lane, x: 6, damage: spitter.spitDamage }] };
    const hit = runUntil(flying, 'spitHit', 10_000, 10);
    expect(hit.event).toEqual({ type: 'spitHit', spitId: 50, cell: { lane, col: 1 } });
    const empty: MatchState = { ...createMatch(), spits: [{ id: 51, lane, x: 1, damage: spitter.spitDamage }] };
    const gone = runUntil(empty, 'spitGone', 10_000, 10);
    expect(gone.event).toEqual({ type: 'spitGone', spitId: 51 });
    expect(gone.state.spits).toHaveLength(0);
  });

  it('ralentizado escupe mas despacio, en la misma proporcion', () => {
    const plantCell = { lane, col: 3 };
    const start = withSpitter(withPlant(createMatch(), plantCell), plantCell.col + 0.5 + spitter.range);
    const slowed = { ...start, enemies: [{ ...start.enemies[0], slow: { amount: 0.5, ms: 60_000 } }] };
    expect(runUntil(start, 'spat', 10_000, 10).t).toBe(spitter.firstSpitMs);
    expect(runUntil(slowed, 'spat', 10_000, 10).t).toBe(spitter.firstSpitMs * 2);
  });

  it('las plantas le disparan como a cualquier enemigo', () => {
    const plantCell = { lane, col: 0 };
    const start = spawnEnemy(withPlant(createMatch(), plantCell), 'spitter', lane, 7);
    const { event } = runUntil(start, 'enemyKilled');
    expect(event).toMatchObject({ type: 'enemyKilled', enemyId: 1 });
  });
});
