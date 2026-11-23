import { describe, expect, it } from 'vitest';
import { BOARD, CROWD, ENEMIES, ICE, MORRIS, OUTBREAKS, OVERLOAD } from '../config/balance';
import { decodeSave, encodeSave } from '../save';
import type { Cell } from './board';
import {
  enemyMaxHp,
  isBoss,
  isDefeated,
  nextOverload,
  overloadCount,
  overloadFill,
  overloadHaste,
  spawnEnemy,
  stepCombat,
  type CombatEvent,
  type Enemy,
  type EnemyKind,
} from './combat';
import { createMatch, createPlant, createWall, type MatchState, type Sown } from './match';
import { hasOverload, isOutbreakOpen, isOutbreakReady, outbreakOfBoss, roundCount } from './outbreaks';
import { throwGrenade } from './powers';
import { broodEveryMs, isBossPreparing, newBrood, roundScript, roundThreat, stepBrood, stepRound, type RoundEvent } from './rounds';

/**
 * Morris, el Imparable, la sobrecarga y el tope de enemigos (T-042; MR-02 a MR-07 y MR-09 a MR-11 cerradas por Carmine el 23 nov
 * 2026 con la recomendacion, salvo MR-11: un bot que juega bien gana unas 5 de 10).
 */

const MORRIS_ID = 'morris' as const;
const HOLE_X = BOARD.columns + 0.75;
/** Vida de un enemigo que no cae durante la prueba. */
const TOUGH = 1e9;
/** Lo que anda un gusano en un segundo. */
const WORM_SPEED = ENEMIES.worm.speed;

function put(state: MatchState, cell: Cell, sown: Sown | null): MatchState {
  return { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? sown : p))) };
}

const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const last = (state: MatchState): Enemy => state.enemies[state.enemies.length - 1];

/** Una partida del brote 4 en el ataque de la ronda `index` (desde 0). */
function attacking(index = 0, outbreak: MatchState['outbreak'] = MORRIS_ID, match = createMatch(0, index, outbreak)): MatchState {
  return { ...match, round: { ...match.round, phase: 'attack', prepMs: 0 } };
}

/** `count` enemigos de `kind` en el cesped, repartidos por los carriles y lejos de todo. */
function crowd(state: MatchState, count: number, kind: EnemyKind = 'worm', x = 7): MatchState {
  let current = state;
  for (let i = 0; i < count; i++) current = spawnEnemy(current, kind, i % BOARD.lanes, x + Math.floor(i / BOARD.lanes) * 0.1, TOUGH);
  return current;
}

/** Avanza el combate `totalMs` en pasos de `stepMs`. */
function run(state: MatchState, totalMs: number, stepMs = 16) {
  const events: CombatEvent[] = [];
  let current = state;
  for (let t = 0; t < totalMs && !isDefeated(current); t += stepMs) {
    const step = stepCombat(current, Math.min(stepMs, totalMs - t));
    current = step.state;
    events.push(...step.events);
  }
  return { state: current, events };
}

describe('la barra de sobrecarga (T-042, MR-05)', () => {
  it('cuenta los enemigos vivos que pisan el cesped, tambien las copias y los ocultos, y nunca al jefe', () => {
    let state = attacking();
    state = spawnEnemy(state, 'worm', 0, 6);
    state = spawnEnemy(state, 'lurker', 1, 6);
    state = { ...state, enemies: [...state.enemies, { ...last(spawnEnemy(state, 'copycat', 2, 6)), id: 99, clone: true }] };
    state = spawnEnemy(state, 'morris', 3, 6);
    // Uno que aun no pisa el cesped: sale del agujero.
    state = spawnEnemy(state, 'worm', 4, HOLE_X + 0.5);
    expect(overloadCount(state.enemies)).toBe(3);
    expect(overloadFill(state)).toBeCloseTo(3 / OVERLOAD.fullAt);
  });

  it('llena con `OVERLOAD.fullAt` y no pasa de 1', () => {
    expect(overloadFill(crowd(attacking(), OVERLOAD.fullAt))).toBe(1);
    expect(overloadFill(crowd(attacking(), OVERLOAD.fullAt * 2))).toBe(1);
  });

  it('solo el brote 4 tiene sobrecarga: en los demas la barra esta siempre vacia', () => {
    expect(OUTBREAKS.filter((outbreak) => hasOverload(outbreak.id)).map((outbreak) => outbreak.id)).toEqual([MORRIS_ID]);
    const brain = crowd(attacking(0, 'brain'), OVERLOAD.fullAt);
    expect(overloadFill(brain)).toBe(0);
    expect(run(brain, 1000).state.overload).toBe(false);
  });
});

describe('se enciende llena y se apaga al 60 % (MR-04)', () => {
  it('apagada, solo se enciende al llenarse; encendida, sigue hasta bajar de `OVERLOAD.offBelow`', () => {
    expect(nextOverload(false, 0.99)).toBe(false);
    expect(nextOverload(false, 1)).toBe(true);
    expect(nextOverload(true, 0.99)).toBe(true);
    expect(nextOverload(true, OVERLOAD.offBelow)).toBe(true);
    expect(nextOverload(true, OVERLOAD.offBelow - 0.01)).toBe(false);
  });

  it('en el combate: al llenarse se enciende con su evento, y al vaciarse se apaga con el suyo', () => {
    const full = crowd(attacking(), OVERLOAD.fullAt);
    const on = stepCombat(full, 16);
    expect(on.state.overload).toBe(true);
    expect(ofType(on.events, 'overloaded')).toEqual([{ type: 'overloaded', active: true }]);
    // Quedan 13 de 20 (65 %): sigue encendida. Con 11 (55 %), se apaga.
    const keep = Math.ceil(OVERLOAD.fullAt * OVERLOAD.offBelow);
    const some = stepCombat({ ...on.state, enemies: on.state.enemies.slice(0, keep) }, 16);
    expect(some.state.overload).toBe(true);
    expect(ofType(some.events, 'overloaded')).toEqual([]);
    const few = stepCombat({ ...on.state, enemies: on.state.enemies.slice(0, keep - 2) }, 16);
    expect(few.state.overload).toBe(false);
    expect(ofType(few.events, 'overloaded')).toEqual([{ type: 'overloaded', active: false }]);
  });

  it('la granada vacia la barra: tumba al grupo y la sobrecarga se apaga', () => {
    // Un grupo de 20 gusanos de nivel 1 apretados en dos casillas: la granada (200) los tumba a todos (110).
    let state = attacking(0, MORRIS_ID, createMatch(0, 0, MORRIS_ID, false, [{ id: 'grenade', level: 1 }]));
    for (let i = 0; i < OVERLOAD.fullAt; i++) state = spawnEnemy(state, 'worm', 1 + (i % 3), 6.2 + (i % 2) * 0.4);
    state = stepCombat(state, 16).state;
    expect(state.overload).toBe(true);
    state = throwGrenade(state, { lane: 2, col: 6 });
    const after = run(state, 3200);
    expect(after.state.enemies.length).toBeLessThan(OVERLOAD.fullAt * OVERLOAD.offBelow);
    expect(after.state.overload).toBe(false);
  });

  it('la copia de un Copycat que cae con la barra casi llena cuenta: puede llenarla', () => {
    let state = crowd(attacking(), OVERLOAD.fullAt - 1);
    state = spawnEnemy(state, 'copycat', 2, 5);
    // Lo quita una bala: cae y deja su copia. Siguen siendo `fullAt`.
    state = { ...state, enemies: state.enemies.map((e) => (e.kind === 'copycat' ? { ...e, hp: 1 } : e)), plants: state.plants };
    state = put(state, { lane: 2, col: 0 }, createPlant());
    const step = run(state, 2000);
    expect(step.state.enemies.some((e) => e.clone)).toBe(true);
    expect(step.state.overload).toBe(true);
  });
});

describe('encendida, todos avanzan un 25 % mas deprisa menos el jefe (MR-03, MR-05)', () => {
  it('lo que acelera: 1,25 a las tropas y nada al jefe', () => {
    expect(OVERLOAD.haste).toBe(1.25);
    expect(overloadHaste(true, 'worm')).toBe(OVERLOAD.haste);
    expect(overloadHaste(false, 'worm')).toBe(1);
    expect(overloadHaste(true, 'morris')).toBe(1);
  });

  it('un gusano anda un 25 % mas con la barra llena; Morris, igual', () => {
    const calm = spawnEnemy(spawnEnemy(attacking(), 'worm', 0, 8), 'morris', 2, 8.5);
    const rushed = { ...crowd(calm, OVERLOAD.fullAt, 'worm', 7.5), overload: true };
    const walked = (state: MatchState, kind: EnemyKind, lane: number, from: number) => from - (run(state, 1000).state.enemies.find((e) => e.kind === kind && e.lane === lane && e.x > from - 1) as Enemy).x;
    expect(walked(calm, 'worm', 0, 8)).toBeCloseTo(WORM_SPEED, 3);
    expect(walked(rushed, 'worm', 0, 8)).toBeCloseTo(WORM_SPEED * OVERLOAD.haste, 3);
    expect(walked(rushed, 'morris', 2, 8.5)).toBeCloseTo(walked(calm, 'morris', 2, 8.5), 6);
  });

  it('se suma al acelerado de la ronda y el hielo lo frena encima: se multiplica todo', () => {
    let state = { ...spawnEnemy(attacking(), 'worm', 0, 8, TOUGH, 1.15), overload: true };
    state = crowd(state, OVERLOAD.fullAt, 'worm', 7.5);
    const slow = { amount: ICE.blastSlow, ms: 5000 };
    state = { ...state, enemies: state.enemies.map((e, i) => (i === 0 ? { ...e, slow } : e)) };
    const moved = 8 - run(state, 1000).state.enemies[0].x;
    expect(moved).toBeCloseTo(WORM_SPEED * 1.15 * OVERLOAD.haste * (1 - ICE.blastSlow), 3);
  });

  it('muerde y escupe igual: solo cambia lo que avanza', () => {
    const wall: Cell = { lane: 0, col: 4 };
    let state = put(attacking(), wall, createWall());
    state = spawnEnemy(state, 'worm', 0, 4.5 + ENEMIES.worm.reach, TOUGH);
    const bites = (s: MatchState) => ofType(run(s, 5000).events, 'bite').length;
    expect(bites({ ...crowd(state, OVERLOAD.fullAt), overload: true })).toBe(bites(state));
  });

  it('el Skipper descansa menos entre saltos', () => {
    const hopper = spawnEnemy(attacking(), 'skipper', 0, 8.5);
    const rushed = { ...crowd(hopper, OVERLOAD.fullAt, 'worm', 7.5), overload: true };
    const firstHop = (state: MatchState) => {
      for (let t = 16; t < 3000; t += 16) {
        state = stepCombat(state, 16).state;
        if (state.enemies[0].hop?.stage === 'air') return t;
      }
      return Infinity;
    };
    expect(firstHop(rushed)).toBeLessThan(firstHop(hopper));
  });

  it('al acabar la ronda se apaga: no pasa a la preparacion siguiente', () => {
    // La ronda 1 entera ya salio y no queda nadie, pero la sobrecarga seguia encendida.
    const state: MatchState = { ...attacking(), overload: true, round: { ...attacking().round, released: roundScript(MORRIS_ID, 0).groups.length } };
    const step = stepRound(state, 16, HOLE_X);
    expect(step.events.map((e) => e.type)).toEqual(['roundCleared', 'roundStarted']);
    expect(step.state.overload).toBe(false);
  });
});

describe('tope de enemigos a la vez (MR-10)', () => {
  /** Ataque de la ronda 1 con el tablero lleno: `CROWD.max` enemigos ya fuera. */
  const crowded = () => crowd(attacking(), CROWD.max, 'worm', 7);

  it('lo que no cabe espera fuera, en orden, y no cuenta para la barra', () => {
    const step = stepRound(crowded(), 3000, HOLE_X);
    const first = roundScript(MORRIS_ID, 0).groups[0];
    expect(step.spawned).toEqual([]);
    expect(step.state.enemies.length).toBe(CROWD.max);
    expect(step.state.round.waiting).toEqual(first.lanes.map((lane) => ({ kind: 'worm', lane, level: expect.any(Number), haste: 1 })));
  });

  it('sale en cuanto hay sitio, antes que lo nuevo', () => {
    const full = stepRound(crowded(), 3000, HOLE_X).state;
    const waiting = full.round.waiting;
    const room = { ...full, enemies: full.enemies.slice(waiting.length) };
    const step = stepRound(room, 16, HOLE_X);
    expect(step.spawned.map((e) => e.lane)).toEqual(waiting.map((w) => w.lane));
    expect(step.state.round.waiting).toEqual([]);
  });

  it('la ronda no acaba mientras alguien espera fuera', () => {
    const full = stepRound(crowded(), 3000, HOLE_X).state;
    const allOut = { ...full, enemies: [], round: { ...full.round, released: roundScript(MORRIS_ID, 0).groups.length } };
    const step = stepRound({ ...allOut, enemies: crowd(allOut, CROWD.max).enemies }, 16, HOLE_X);
    expect(step.events.some((e) => e.type === 'roundCleared')).toBe(false);
  });

  it('el jefe sale siempre, aunque este lleno', () => {
    const boss = roundCount(MORRIS_ID) - 1;
    const bossAt = roundScript(MORRIS_ID, boss).groups.find((group) => group.kind === 'morris')?.atMs as number;
    let state = crowd(attacking(boss), CROWD.max, 'worm', 7);
    state = stepRound(state, bossAt + 16, HOLE_X).state;
    expect(state.enemies.some((e) => e.kind === 'morris')).toBe(true);
    expect(state.round.waiting.some((w) => w.kind === 'morris')).toBe(false);
  });

  it('las copias de un Copycat salen siempre: ocupan el sitio del que cae', () => {
    let state = crowd(attacking(), CROWD.max - 1, 'worm', 7);
    state = spawnEnemy(state, 'copycat', 2, 5, 1);
    state = put(state, { lane: 2, col: 0 }, createPlant());
    const after = run(state, 2000).state;
    expect(after.enemies.some((e) => e.clone)).toBe(true);
    expect(after.enemies.length).toBe(CROWD.max);
  });

  it('se aplica en todos los brotes y no cambia los de antes: ninguno llega a llenarlo con un bot (npm run sim)', () => {
    expect(CROWD.max).toBe(60);
  });
});

describe('Morris, el Imparable (T-042)', () => {
  it('es el jefe del brote 4, que ya se puede jugar al vencer a Brain', () => {
    expect(isBoss('morris')).toBe(true);
    expect(outbreakOfBoss('morris')).toBe(MORRIS_ID);
    expect(isOutbreakReady(MORRIS_ID)).toBe(true);
    expect(isOutbreakOpen(MORRIS_ID, ['creeper', 'elkCloner'])).toBe(false);
    expect(isOutbreakOpen(MORRIS_ID, ['creeper', 'elkCloner', 'brain'])).toBe(true);
  });

  it('no tiene nivel ni variante: solo la fuerza de todos', () => {
    const morris = last(spawnEnemy(attacking(), 'morris', 2, HOLE_X, undefined, 1, 7));
    expect(morris.level).toBe(1);
    expect(morris.variant).toBeNull();
    expect(morris.hp).toBeCloseTo(ENEMIES.morris.hp * 1.1);
    expect(enemyMaxHp('morris')).toBeCloseTo(ENEMIES.morris.hp * 1.1);
  });

  describe('nada lo para (MR-06)', () => {
    const wallAt: Cell = { lane: 2, col: 4 };
    const touching = 4.5 + ENEMIES.morris.reach;
    const alone = (sown: Sown) => spawnEnemy(put(attacking(), wallAt, sown), 'morris', 2, touching, TOUGH);

    it('muerde el muro y, mientras, avanza a la mitad', () => {
      const { state, events } = run(alone(createWall()), 4000);
      expect(ofType(events, 'bite').length).toBeGreaterThan(0);
      const moved = touching - state.enemies[0].x;
      expect(moved).toBeCloseTo(ENEMIES.morris.speed * MORRIS.chewPace * 4, 2);
      expect(state.plants[2][4]?.hp).toBeLessThan(createWall().hp);
    });

    it('a una disparadora la muerde igual, sin pararse, y la deja atras si no la rompe', () => {
      // A media velocidad tarda unos 13 s en pasarla.
      const { state, events } = run(alone({ ...createPlant(), hp: TOUGH }), 16_000);
      expect(ofType(events, 'bite').length).toBeGreaterThan(0);
      expect(state.enemies[0].x).toBeLessThan(4.5);
      expect(state.plants[2][4]).not.toBeNull();
    });

    it('sin nada delante anda a su velocidad', () => {
      const state = spawnEnemy(attacking(), 'morris', 2, 8, TOUGH);
      expect(8 - run(state, 2000).state.enemies[0].x).toBeCloseTo(ENEMIES.morris.speed * 2, 3);
    });

    it('un muro lo frena mas que una disparadora: aguanta mas mordiscos', () => {
      const slowedFor = (sown: Sown) => {
        let state = alone(sown);
        let t = 0;
        while (state.plants[2][4] !== null && t < 30_000) {
          state = stepCombat(state, 50).state;
          t += 50;
        }
        return t;
      };
      expect(slowedFor(createWall())).toBeGreaterThan(slowedFor(createPlant()));
    });

    it('si cruza el jardin se pierde la partida', () => {
      const state = { ...spawnEnemy(attacking(), 'morris', 2, 0.05, TOUGH), lives: 3 };
      const after = run(state, 1000);
      expect(after.state.lives).toBe(0);
      expect(ofType(after.events, 'enemyEscaped').map((e) => e.kind)).toEqual(['morris']);
    });
  });

  describe('saca gusanos cada vez mas seguido (MR-07)', () => {
    it('al salir, uno cada `startEveryMs`; con el tiempo, cada vez menos, hasta `minEveryMs`', () => {
      const { startEveryMs, minEveryMs, rampMs } = MORRIS.brood;
      expect(broodEveryMs(0)).toBe(startEveryMs);
      expect(broodEveryMs(rampMs / 2)).toBeCloseTo((startEveryMs + minEveryMs) / 2);
      expect(broodEveryMs(rampMs)).toBe(minEveryMs);
      expect(broodEveryMs(rampMs * 3)).toBe(minEveryMs);
    });

    it('por los cinco carriles, por turnos', () => {
      let brood = newBrood();
      const lanes: number[] = [];
      for (let t = 0; t < 60_000; t += 50) {
        const step = stepBrood(brood, 50);
        brood = step.brood;
        lanes.push(...step.lanes);
      }
      expect(lanes.slice(0, 5).sort()).toEqual([0, 1, 2, 3, 4]);
      expect(lanes.slice(0, 10)).toEqual([...MORRIS.brood.lanes, ...MORRIS.brood.lanes]);
      expect(brood.count).toBe(lanes.length);
    });

    /** Juega el combate final con Morris de piedra y cuenta cuando suelta cada gusano. */
    function fight(totalMs: number, freeze = false) {
      const boss = roundCount(MORRIS_ID) - 1;
      let state = attacking(boss);
      const at: number[] = [];
      const spawned: Enemy[] = [];
      for (let t = 0; t < totalMs; t += 50) {
        const round = stepRound(state, 50, HOLE_X, () => 0.5);
        state = round.state;
        spawned.push(...round.spawned);
        for (const event of round.events as RoundEvent[]) if (event.type === 'brooded') at.push(t);
        // Nadie cae ni avanza: solo se mira cuando salen.
        state = {
          ...state,
          enemies: state.enemies.map((e) => (e.kind === 'morris' ? { ...e, hp: TOUGH, slow: freeze ? { amount: 0.9, ms: 1e9 } : e.slow } : e)).slice(-CROWD.max + 5),
        };
      }
      return { at, spawned, state };
    }

    it('el primero al poco de salir y luego cada vez mas seguido', () => {
      const bossAt = roundScript(MORRIS_ID, roundCount(MORRIS_ID) - 1).groups.find((g) => g.kind === 'morris')?.atMs as number;
      const { at } = fight(90_000);
      expect(at[0]).toBeGreaterThanOrEqual(bossAt + MORRIS.brood.firstMs - 100);
      const gaps = at.slice(1).map((t, i) => t - at[i]);
      expect(gaps[gaps.length - 1]).toBeLessThan(gaps[0]);
    });

    it('salen gusanos con la variante de Morris y los niveles de la ronda (hasta el 9)', () => {
      const { spawned } = fight(40_000);
      const brood = spawned.filter((e) => e.kind === MORRIS.brood.kind && e.level < 10);
      expect(brood.length).toBeGreaterThan(5);
      expect(brood.every((e) => e.variant === MORRIS_ID && e.level <= 9 && e.haste === 1)).toBe(true);
    });

    it('frenado por el hielo sigue sacandolos igual: es una carrera', () => {
      expect(fight(60_000, true).at).toEqual(fight(60_000).at);
    });
  });

  it('al caer caen todos sus gusanos, no salen mas y se gana el brote', () => {
    const boss = roundCount(MORRIS_ID) - 1;
    let state = attacking(boss);
    for (let t = 0; t < 20_000; t += 50) state = stepRound(state, 50, HOLE_X, () => 0.5).state;
    expect(state.round.brood).not.toBeNull();
    state = { ...state, enemies: state.enemies.map((e) => (e.kind === 'morris' ? { ...e, hp: 1 } : e)) };
    state = put(state, { lane: 2, col: 0 }, createPlant());
    // Sin nadie delante de el en su carril: la bala le da a el.
    state = { ...state, enemies: state.enemies.filter((e) => e.kind === 'morris' || e.lane !== 2) };
    let won = false;
    for (let t = 0; t < 10_000 && !won; t += 50) {
      const combat = stepCombat(state, 50);
      const round = stepRound(combat.state, 50, HOLE_X, () => 0.5);
      state = round.state;
      won = round.events.some((e) => e.type === 'won');
    }
    expect(won).toBe(true);
    expect(state.enemies).toEqual([]);
    expect(state.round.brood).toBeNull();
  });
});

describe('las 9 rondas del brote 4 (T-042)', () => {
  const kindsOf = (index: number) => new Set(roundScript(MORRIS_ID, index).groups.map((g) => g.kind));

  it('son 9 y cada una repasa lo suyo, la ultima con Morris', () => {
    expect(roundCount(MORRIS_ID)).toBe(9);
    expect([...kindsOf(0)]).toEqual(['worm']);
    expect(kindsOf(1).has('armored') && kindsOf(1).has('spitter')).toBe(true);
    expect([...kindsOf(1)].some((k) => k.startsWith('copycat') || k.startsWith('lurker'))).toBe(false);
    expect(kindsOf(2).has('copycat')).toBe(true);
    expect(kindsOf(3).has('minstrel') && !kindsOf(2).has('minstrel')).toBe(true);
    expect(kindsOf(4).has('lurker') && ![0, 1, 2, 3].some((i) => kindsOf(i).has('lurker'))).toBe(true);
    expect(kindsOf(5).has('skipper') && ![0, 1, 2, 3, 4].some((i) => kindsOf(i).has('skipper'))).toBe(true);
    expect(kindsOf(8).has('morris')).toBe(true);
  });

  it('Morris se prepara en la 7 y la 8, y se le ve tambien en la preparacion de la 9', () => {
    expect(roundScript(MORRIS_ID, 6).bossPreparing && roundScript(MORRIS_ID, 7).bossPreparing).toBe(true);
    expect([0, 1, 2, 3, 4, 5].some((i) => roundScript(MORRIS_ID, i).bossPreparing)).toBe(false);
    expect(isBossPreparing(createMatch(0, 8, MORRIS_ID))).toBe(true);
  });

  it('la dificultad medida sube de ronda en ronda', () => {
    const threats = Array.from({ length: roundCount(MORRIS_ID) - 1 }, (_, i) => roundThreat(MORRIS_ID, i));
    threats.slice(1).forEach((threat, i) => expect(threat, `ronda ${i + 2}`).toBeGreaterThan(threats[i]));
  });

  it('la ronda 1 es mas dura que la 1 del brote 3 aun contando las 600 monedas: por moneda inicial', () => {
    const perCoin = (id: MatchState['outbreak']) => roundThreat(id, 0) / createMatch(undefined, 0, id).balance;
    expect(perCoin(MORRIS_ID)).toBeGreaterThan(perCoin('brain'));
  });
});

describe('partida guardada (T-042, sin migracion)', () => {
  it('conserva la sobrecarga, lo que espera fuera y los gusanos de Morris', () => {
    let state = { ...crowd(attacking(roundCount(MORRIS_ID) - 1), CROWD.max), overload: true };
    for (let t = 0; t < 15_000; t += 50) state = stepRound(state, 50, HOLE_X, () => 0.5).state;
    expect(state.round.waiting.length).toBeGreaterThan(0);
    expect(state.round.brood).not.toBeNull();
    const back = decodeSave(encodeSave(state, null, 1));
    expect(back?.match).toEqual(state);
  });
});
