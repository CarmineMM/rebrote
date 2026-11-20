import { describe, expect, it } from 'vitest';
import { BOARD, CREEPER, ENEMIES, ENEMY_POWER, FIRE, ICE, SHOOTER } from '../config/balance';
import type { Cell } from './board';
import {
  enemyDamage,
  enemyMaxHp,
  enemyPower,
  isAirborne,
  isDefeated,
  isEnraged,
  jumpsCrossed,
  rollCopyKind,
  slamDamage,
  spawnEnemy,
  stepCombat,
  type CombatEvent,
  type Enemy,
} from './combat';
import { createMatch, createMine, createPlant, sownAt, type MatchState } from './match';
import { createShooter, type Shooter } from './plants';

/** Reglas del Creeper (T-008): salto de carril, copias, golpe al aterrizar, fases, derrota y victoria. */

const boss = ENEMIES.creeper;
/** Su vida llena, con la fuerza de T-010. */
const bossHp = enemyMaxHp('creeper');
const HOLE_X = BOARD.columns + 0.75;
/** Siempre el primer carril de los que le quedan (el de mas al fondo que no es el suyo). */
const first = () => 0;
/** Siempre el ultimo de los que le quedan. */
const last = () => 0.999;

function withPlant(state: MatchState, cell: Cell, shooter: Shooter = createShooter()): MatchState {
  const plants = state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? createPlant(shooter) : p)));
  return { ...state, plants };
}

function withMine(state: MatchState, cell: Cell): MatchState {
  const plants = state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? createMine('fire') : p)));
  return { ...state, plants };
}

/** Partida con un Creeper en `x` del carril `lane`, con `hpFraction` de su vida, en la ronda 10. */
function withCreeper(lane = 2, x = 6, hpFraction = 1, over: Partial<Enemy> = {}): MatchState {
  const state = spawnEnemy(createMatch(1000, 9), 'creeper', lane, x, bossHp * hpFraction);
  const [creeper] = state.enemies;
  return { ...state, enemies: [{ ...creeper, ...over }] };
}

const creeperOf = (state: MatchState) => state.enemies.find((e) => e.kind === 'creeper') as Enemy;

/** Avanza `totalMs` en pasos de `stepMs` y junta los eventos. */
function run(state: MatchState, totalMs: number, random: () => number = first, stepMs = 16) {
  const events: CombatEvent[] = [];
  let current = state;
  for (let t = 0; t < totalMs && !isDefeated(current); t += stepMs) {
    const step = stepCombat(current, Math.min(stepMs, totalMs - t), random);
    current = step.state;
    events.push(...step.events);
  }
  return { state: current, events };
}

const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

describe('salto de carril', () => {
  it('con la vida llena no salta: avanza por su carril', () => {
    const { state, events } = run(withCreeper(), 3000);
    expect(ofType(events, 'jumpWarned')).toEqual([]);
    expect(creeperOf(state)).toMatchObject({ lane: 2, jump: null, jumpsUsed: 0 });
    expect(creeperOf(state).x).toBeCloseTo(6 - boss.speed * 3, 5);
  });

  it('al perder el 20 % avisa durante 1 s del carril de destino, quieto en el suyo, y luego salta', () => {
    const start = withCreeper(2, 6, 0.79);
    const warned = stepCombat(start, 16, first);
    expect(warned.events).toEqual([{ type: 'jumpWarned', enemyId: 1, from: 2, to: 0, warnMs: CREEPER.warnMs.calm }]);
    expect(creeperOf(warned.state)).toMatchObject({ lane: 2, jumpsUsed: 1, jump: { stage: 'crouch', from: 2, to: 0 } });

    // Mientras avisa no avanza, sigue en su carril y no esta en el aire.
    const crouching = run(warned.state, CREEPER.warnMs.calm - 100);
    expect(creeperOf(crouching.state)).toMatchObject({ lane: 2, x: 6 });
    expect(isAirborne(creeperOf(crouching.state))).toBe(false);

    const flying = run(crouching.state, 200);
    const [jumped] = ofType(flying.events, 'jumped');
    expect(jumped).toMatchObject({ enemyId: 1, from: 2, to: 0 });
    expect(creeperOf(flying.state)).toMatchObject({ lane: 0, x: 6, jump: { stage: 'air' } });
    expect(isAirborne(creeperOf(flying.state))).toBe(true);

    const landed = run(flying.state, CREEPER.airMs);
    expect(ofType(landed.events, 'landed')).toEqual([{ type: 'landed', enemyId: 1, lane: 0, cell: null }]);
    expect(creeperOf(landed.state)).toMatchObject({ lane: 0, jump: null });
  });

  it('salta a un carril al azar, nunca al suyo', () => {
    const to = (lane: number, random: () => number) => {
      const [warned] = ofType(stepCombat(withCreeper(lane, 6, 0.79), 16, random).events, 'jumpWarned');
      return warned.to;
    };
    expect(to(2, first)).toBe(0);
    expect(to(2, last)).toBe(4);
    expect(to(0, first)).toBe(1);
    expect(to(4, last)).toBe(3);
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      const targets = new Set([0, 0.26, 0.51, 0.76, 0.999].map((r) => to(lane, () => r)));
      expect(targets.has(lane)).toBe(false);
      expect(targets.size).toBe(BOARD.lanes - 1);
    }
  });

  it('salta una vez por umbral: dos en la fase 1 (80 y 60 %) y cinco en la 2 (50, 40, 30, 20 y 10 %)', () => {
    expect(CREEPER.jumpAt).toEqual([0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]);
    let state = withCreeper(2, 8.5);
    const jumps: number[] = [];
    for (const fraction of [0.85, 0.79, 0.7, 0.59, 0.49, 0.39, 0.29, 0.19, 0.09, 0.05]) {
      const [creeper] = state.enemies;
      state = { ...state, enemies: [{ ...creeper, hp: bossHp * fraction, x: 8.5 }] };
      const { state: after, events } = run(state, 2000);
      jumps.push(ofType(events, 'jumpWarned').length);
      state = after;
    }
    expect(jumps).toEqual([0, 1, 0, 1, 1, 1, 1, 1, 1, 0]);
  });

  it('un golpe que cruza dos umbrales da un solo salto', () => {
    const { events, state } = run(withCreeper(2, 8.5, 0.55), 2000);
    expect(ofType(events, 'jumpWarned')).toHaveLength(1);
    expect(creeperOf(state).jumpsUsed).toBe(2);
    expect(jumpsCrossed(creeperOf(state))).toBe(2);
  });

  it('lo que pierde mientras salta no encadena otro salto al aterrizar', () => {
    let state = stepCombat(withCreeper(2, 8.5, 0.79), 16, first).state;
    const [creeper] = state.enemies;
    state = { ...state, enemies: [{ ...creeper, hp: bossHp * 0.58 }] };
    const { events } = run(state, 3000);
    expect(ofType(events, 'jumpWarned')).toHaveLength(0);
    expect(ofType(events, 'landed')).toHaveLength(1);
  });

  it('el aviso y el vuelo duran lo mismo aunque este ralentizado', () => {
    const slow = { amount: ICE.blastSlow, ms: 10_000 };
    const warned = stepCombat(withCreeper(2, 6, 0.79, { slow }), 16, first).state;
    const { events } = run(warned, CREEPER.warnMs.calm + CREEPER.airMs + 32);
    expect(ofType(events, 'landed')).toHaveLength(1);
  });
});

describe('copias (J-03)', () => {
  it('al despegar deja un gusano acelerado donde estaba, en el carril que abandona', () => {
    const warned = stepCombat(withCreeper(2, 6, 0.79), 16, first).state;
    const { state, events } = run(warned, CREEPER.warnMs.calm + 16);
    const [jumped] = ofType(events, 'jumped');
    expect(jumped.copies).toHaveLength(CREEPER.copies.calm);
    const [copy] = jumped.copies;
    expect(copy).toMatchObject({
      kind: 'worm',
      lane: 2,
      x: 6,
      level: CREEPER.copyLevel,
      hp: enemyMaxHp('worm', CREEPER.copyLevel),
      haste: CREEPER.copyHaste,
      jump: null,
    });
    expect(state.enemies.map((e) => e.id)).toContain(copy.id);
    expect(new Set(state.enemies.map((e) => e.id)).size).toBe(state.enemies.length);
  });

  it('las copias aceleradas avanzan mas rapido que un gusano normal', () => {
    const normal = spawnEnemy(createMatch(), 'worm', 1, 8);
    const fast = spawnEnemy(createMatch(), 'worm', 1, 8, ENEMIES.worm.hp, CREEPER.copyHaste);
    const walked = (state: MatchState) => 8 - run(state, 2000).state.enemies[0].x;
    expect(walked(fast)).toBeCloseTo(walked(normal) * CREEPER.copyHaste, 5);
  });
});

describe('fase 2 (J-04): con la mitad de la vida o menos', () => {
  it('avisa menos y deja dos copias, una detras de otra', () => {
    const start = withCreeper(2, 6, 0.49);
    expect(isEnraged(creeperOf(start))).toBe(true);
    expect(isEnraged(creeperOf(withCreeper(2, 6, 0.51)))).toBe(false);
    const warned = stepCombat(start, 16, first);
    expect(ofType(warned.events, 'jumpWarned')[0].warnMs).toBe(CREEPER.warnMs.enraged);
    const { events } = run(warned.state, CREEPER.warnMs.enraged + 16);
    const [jumped] = ofType(events, 'jumped');
    expect(jumped.copies.map((c) => [c.lane, c.x])).toEqual([
      [2, 6],
      [2, 6 + CREEPER.copyGap],
    ]);
  });
});

describe('mas duro (T-009 y T-010)', () => {
  it('no tiene nivel: solo lleva la fuerza de todos (+10 %) en la vida, el mordisco y el golpe', () => {
    const creeper = creeperOf(withCreeper());
    expect(creeper.level).toBe(1);
    expect(enemyPower(1)).toBe(ENEMY_POWER.base);
    expect(bossHp).toBeCloseTo(4400, 9);
    expect(creeper.hp).toBe(bossHp);
    // Los 117,5 de T-009 (lo que mordia un gusano de nivel 10) con el 10 %.
    expect(enemyDamage(creeper)).toBeCloseTo(117.5 * 1.1, 9);
    expect(slamDamage()).toBeCloseTo(CREEPER.slamDamage * 1.1, 9);
    // Aunque le pongan otro nivel al sacarlo.
    expect(spawnEnemy(createMatch(), 'creeper', 2, 6, undefined, 1, 7).enemies[0]).toMatchObject({ level: 1, hp: bossHp });
  });

  it('su mordisco quita 129,25', () => {
    let state = withPlant(withCreeper(2, 4), { lane: 2, col: 2 });
    state = { ...state, enemies: [{ ...state.enemies[0], x: 2.5 + boss.reach - 0.01 }] };
    const { state: after } = run(state, boss.firstBiteMs + 20);
    expect(sownAt(after, { lane: 2, col: 2 })?.hp).toBeCloseTo(SHOOTER.hp - 129.25, 6);
  });

  it('en la fase 1 la copia siempre es un gusano; en la 2, mitad gusanos y el resto acorazados o escupidores', () => {
    for (let i = 0; i < 20; i++) expect(rollCopyKind(false, () => i / 20)).toBe('worm');
    const kinds = Array.from({ length: 100 }, (_, i) => rollCopyKind(true, () => (i + 0.5) / 100));
    const count = (kind: string) => kinds.filter((k) => k === kind).length;
    expect(count('worm')).toBe(50);
    expect(count('armored')).toBe(25);
    expect(count('spitter')).toBe(25);
  });

  it('en la fase 2 las dos copias pueden salir acorazado y escupidor, de nivel 10 y aceleradas', () => {
    const rolls = [0, 0.6, 0.9];
    let i = 0;
    // El primer numero elige el carril; los siguientes, el tipo de cada copia.
    const random = () => rolls[Math.min(i++, rolls.length - 1)];
    const warned = stepCombat(withCreeper(2, 6, 0.49), 16, random).state;
    const { events } = run(warned, CREEPER.warnMs.enraged + 16, random);
    const [jumped] = ofType(events, 'jumped');
    expect(jumped.copies.map((c) => [c.kind, c.level, c.haste])).toEqual([
      ['armored', CREEPER.copyLevel, CREEPER.copyHaste],
      ['spitter', CREEPER.copyLevel, CREEPER.copyHaste],
    ]);
    expect(jumped.copies.map((c) => c.hp)).toEqual([enemyMaxHp('armored', 10), enemyMaxHp('spitter', 10)]);
  });
});

describe('en el aire', () => {
  /** Creeper volando hacia el carril 0, en x = 6. */
  const airborne = () => {
    const warned = stepCombat(withCreeper(2, 6, 0.79), 16, first).state;
    return run(warned, CREEPER.warnMs.calm + 16).state;
  };

  it('las balas de su carril nuevo le pasan por debajo y las plantas no le apuntan', () => {
    let state = withPlant(airborne(), { lane: 0, col: 1 });
    state = { ...state, enemies: state.enemies.filter((e) => e.kind === 'creeper') };
    state = { ...state, bullets: [{ id: 99, lane: 0, x: 5.5, damage: 20, effect: null }] };
    const step = stepCombat(state, 200, first);
    expect(ofType(step.events, 'hit')).toEqual([]);
    expect(ofType(step.events, 'shot')).toEqual([]);
    expect(creeperOf(step.state).hp).toBe(bossHp * 0.79);
  });

  /** Agachado a punto de despegar, con una bala por su carril que le llega justo despues. */
  const aboutToJump = (): MatchState => {
    const crouched = run(stepCombat(withCreeper(2, 6, 0.79), 16, first).state, CREEPER.warnMs.calm - 100).state;
    return { ...crouched, bullets: [{ id: 99, lane: 2, x: 4.5, damage: 20, effect: null }] };
  };

  it('las balas que iban por su carril viejo siguen y le dan a lo siguiente: su copia', () => {
    const { events } = run(aboutToJump(), CREEPER.airMs);
    const hits = ofType(events, 'hit');
    expect(hits).toHaveLength(1);
    expect(hits[0].enemyId).not.toBe(1);
  });

  it('sin nadie mas en su carril viejo, la bala sale del tablero', () => {
    // Se quita la copia en cuanto aparece: la bala solo podria darle al Creeper, que ya no esta en su carril.
    let current: MatchState = aboutToJump();
    const all: CombatEvent[] = [];
    for (let t = 0; t < 1500; t += 16) {
      const step = stepCombat(current, 16, first);
      all.push(...step.events);
      current = { ...step.state, enemies: step.state.enemies.filter((e) => e.kind === 'creeper') };
    }
    expect(ofType(all, 'jumped')).toHaveLength(1);
    expect(ofType(all, 'hit')).toEqual([]);
    expect(ofType(all, 'bulletGone').map((e) => e.bulletId)).toContain(99);
  });

  it('las minas no lo detectan ni lo alcanzan', () => {
    let state = withMine(airborne(), { lane: 0, col: 5 });
    state = { ...state, enemies: state.enemies.filter((e) => e.kind === 'creeper') };
    const step = stepCombat(state, CREEPER.airMs - 100, first);
    expect(ofType(step.events, 'mineArmed')).toEqual([]);
  });

  it('conserva la quemadura y la ralentizacion al saltar', () => {
    const burn = { dps: FIRE.burnDps, ms: 5000 };
    const slow = { amount: ICE.bulletSlowByCannons[1], ms: 5000 };
    const start = withCreeper(2, 6, 0.79, { burn, slow });
    const { state } = run(start, CREEPER.warnMs.calm + 100);
    const creeper = creeperOf(state);
    expect(creeper.lane).toBe(0);
    expect(creeper.burn).not.toBeNull();
    expect(creeper.slow).not.toBeNull();
    expect(creeper.hp).toBeLessThan(bossHp * 0.79);
  });
});

describe('aterrizaje (J-05)', () => {
  const jumpTo0 = (state: MatchState) => run(stepCombat(state, 16, first).state, CREEPER.warnMs.calm + CREEPER.airMs + 32);

  it('golpea a lo primero sembrado que tiene delante en su carril nuevo', () => {
    let state = withPlant(withCreeper(2, 6, 0.79), { lane: 0, col: 3 });
    state = withPlant(state, { lane: 0, col: 1 });
    const { state: after, events } = jumpTo0(state);
    expect(ofType(events, 'landed')).toEqual([{ type: 'landed', enemyId: 1, lane: 0, cell: { lane: 0, col: 3 } }]);
    expect(sownAt(after, { lane: 0, col: 3 })?.hp).toBe(createPlant().hp - slamDamage());
    expect(sownAt(after, { lane: 0, col: 1 })?.hp).toBe(createPlant().hp);
  });

  it('tambien a lo que queda bajo su cuerpo, pero no a lo que ya dejo atras', () => {
    const under = jumpTo0(withPlant(withCreeper(2, 6, 0.79), { lane: 0, col: 6 }));
    expect(ofType(under.events, 'landed')[0].cell).toEqual({ lane: 0, col: 6 });
    const behind = jumpTo0(withPlant(withCreeper(2, 6, 0.79), { lane: 0, col: 7 }));
    expect(ofType(behind.events, 'landed')[0].cell).toBeNull();
  });

  it('puede romper una mina, que asi no explota', () => {
    const { state, events } = jumpTo0(withMine(withCreeper(2, 6, 0.79), { lane: 0, col: 2 }));
    expect(ofType(events, 'plantDestroyed')).toEqual([{ type: 'plantDestroyed', cell: { lane: 0, col: 2 } }]);
    expect(ofType(events, 'mineExploded')).toEqual([]);
    expect(sownAt(state, { lane: 0, col: 2 })).toBeNull();
  });
});

describe('fin del combate', () => {
  it('si cruza el borde izquierdo se pierde la partida, aunque queden vidas', () => {
    const { state, events } = run(withCreeper(1, 0.05), 1000);
    expect(ofType(events, 'enemyEscaped')).toEqual([{ type: 'enemyEscaped', enemyId: 1, lane: 1, kind: 'creeper' }]);
    expect(state.lives).toBe(0);
    expect(isDefeated(state)).toBe(true);
  });

  it('al derrotarlo caen tambien sus copias y los demas enemigos', () => {
    let state = withCreeper(2, 6, 0.79);
    state = spawnEnemy(state, 'worm', 0, 7);
    state = spawnEnemy(state, 'worm', 4, 8);
    const [creeper, ...rest] = state.enemies;
    state = { ...state, enemies: [{ ...creeper, hp: 1, jumpsUsed: CREEPER.jumpAt.length }, ...rest] };
    state = { ...state, bullets: [{ id: 99, lane: 2, x: 5.3, damage: 20, effect: null }] };
    const { state: after, events } = run(state, 200);
    expect(after.enemies).toEqual([]);
    expect(ofType(events, 'enemyKilled').map((e) => e.enemyId).sort()).toEqual([1, 2, 3]);
  });

  it('con todas las defensas en un carril no se le gana: salta a otro y se cuela', () => {
    // Una disparadora de 3 canones a nivel 10 en su carril: le baja el 20 %, salta y por los demas no hay nada.
    let state = withPlant(withCreeper(2, HOLE_X), { lane: 2, col: 0 }, { ...createShooter(), cannons: 3, level: 10 });
    state = run(state, 5 * 60_000, Math.random, 50).state;
    expect(isDefeated(state)).toBe(true);
    expect(creeperOf(state)).toBeUndefined();
  });

  it('con defensas repartidas por los cinco carriles se le gana', () => {
    // Con el tope del mundo 1 (nivel 5, T-010): cuatro columnas de disparadoras fusionadas de dos canones, la primera de
    // fuego y la segunda de hielo. Azar con semilla para que la prueba no dependa de la suerte.
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    let state = withCreeper(2, HOLE_X);
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      for (let col = 0; col < 4; col++) {
        const element = col === 0 ? 'fire' : col === 1 ? 'ice' : null;
        state = withPlant(state, { lane, col }, { ...createShooter(), level: 5, cannons: 2, element });
      }
    }
    let won = false;
    for (let t = 0; t < 5 * 60_000 && !won && !isDefeated(state); t += 50) {
      const step = stepCombat(state, 50, random);
      state = step.state;
      won = ofType(step.events, 'enemyKilled').some((e) => e.enemyId === 1);
    }
    expect(won).toBe(true);
    expect(isDefeated(state)).toBe(false);
  });
});
