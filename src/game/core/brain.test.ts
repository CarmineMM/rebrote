import { describe, expect, it } from 'vitest';
import { BOARD, BRAIN, ENEMIES, FIRE, GRENADE, ICE, MINE } from '../config/balance';
import { decodeSave, encodeSave } from '../save';
import type { Cell } from './board';
import {
  blastRevealMs,
  enemyDamage,
  enemyMaxHp,
  enemyPower,
  enemyReach,
  hasTarget,
  hopGait,
  hops,
  isAirborne,
  isBoss,
  isDefeated,
  isEnraged,
  isHidden,
  sneaks,
  spawnEnemy,
  stepCombat,
  type Bullet,
  type CombatEvent,
  type Enemy,
} from './combat';
import { createMatch, createMine, createPlant, createWall, sownAt, type MatchState, type Sown } from './match';
import { outbreakOfBoss, roundCount } from './outbreaks';
import { createShooter, infuse } from './plants';
import { createIceBlock } from './powers';
import { bossFirstSeenRound, bossRoundIndex, isBossPreparing, roundHaste, roundScript, roundThreat, stepRound } from './rounds';

/**
 * Brain, el Cerebro (T-039; BR-02 a BR-09 cerradas por Carmine el 22 nov 2026 con la recomendacion), jefe del brote 3:
 * avanza oculto y a saltos por su carril, por encima de todo lo que no sea escudo, y solo lo descubren el escudo que lo
 * para, las minas y la granada.
 */

const boss = ENEMIES.brain;
/** Vida de un Brain que no cae durante la prueba. */
const TOUGH = 1e9;

function put(state: MatchState, cell: Cell, sown: Sown | null): MatchState {
  return { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? sown : p))) };
}

const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

/** Avanza `totalMs` en pasos de `stepMs` y junta los eventos con el momento en que pasaron. */
function run(state: MatchState, totalMs: number, stepMs = 16) {
  const events: Array<CombatEvent & { t: number }> = [];
  let current = state;
  for (let t = 0; t < totalMs && !isDefeated(current); t += stepMs) {
    const dt = Math.min(stepMs, totalMs - t);
    const step = stepCombat(current, dt);
    current = step.state;
    events.push(...step.events.map((e) => ({ ...e, t: t + dt })));
  }
  return { state: current, events };
}

/** Avanza hasta que pase un evento del tipo pedido (o se acabe el tiempo). */
function runUntil<T extends CombatEvent['type']>(state: MatchState, type: T, limitMs = 60_000, stepMs = 16) {
  let current = state;
  for (let t = 0; t < limitMs; t += stepMs) {
    const step = stepCombat(current, stepMs);
    current = step.state;
    const event = ofType(step.events, type)[0];
    if (event) return { state: current, event, t: t + stepMs, events: step.events };
  }
  throw new Error(`No paso "${type}" en ${limitMs} ms`);
}

const brainOf = (state: MatchState) => state.enemies.find((e) => e.kind === 'brain') as Enemy;
/** Brain en `x` del carril 2, con la vida que diga `hp` y lo que cambie `over`. */
function withBrain(state: MatchState, x: number, hp: number = TOUGH, over: Partial<Enemy> = {}): MatchState {
  const spawned = spawnEnemy(state, 'brain', 2, x, hp);
  const brain = spawned.enemies[spawned.enemies.length - 1];
  return { ...spawned, enemies: [...spawned.enemies.slice(0, -1), { ...brain, ...over }] };
}
/** A punto de saltar: le queda un paso de descanso. */
const aboutToHop = { hop: { stage: 'rest', ms: 1, from: 0, to: 0 } } as const;
/** Una semilla a punto de dar a lo que tenga el hocico en `front` en su carril. */
const bulletAt = (id: number, front: number, effect: Bullet['effect'] = null): Bullet => ({ id, lane: 2, x: front - 0.01, damage: 10, effect });
const shieldShooter = () => createPlant(infuse(createShooter(), 'shield'));

describe('jefe del brote 3 (T-039)', () => {
  it('es un jefe sin nivel: su vida y su mordisco llevan solo la fuerza de todos, y no da moneda', () => {
    const state = spawnEnemy(createMatch(), 'brain', 2, 7, undefined, 1, 9);
    expect(isBoss('brain')).toBe(true);
    expect(state.enemies[0].level).toBe(1);
    expect(enemyMaxHp('brain')).toBeCloseTo(boss.hp * enemyPower(1), 6);
    expect(enemyDamage(state.enemies[0])).toBeCloseTo(boss.biteDamage * enemyPower(1), 6);
    expect(boss.reward).toBe(0);
  });

  it('llega oculto y avanza a saltos', () => {
    const brain = brainOf(spawnEnemy(createMatch(), 'brain', 2, BOARD.columns + 0.75));
    expect(sneaks('brain')).toBe(true);
    expect(hops('brain')).toBe(true);
    expect(isHidden(brain)).toBe(true);
    expect(brain.hop).toEqual({ stage: 'rest', ms: BRAIN.calm.restMs, from: BOARD.columns + 0.75, to: BOARD.columns + 0.75 });
  });
});

describe('salta (BR-02, BR-06 y BR-08)', () => {
  it(`descansa ${BRAIN.calm.restMs / 1000} s, salta ${BRAIN.hopLength} casillas en ${BRAIN.airMs / 1000} s y cae`, () => {
    const state = withBrain(createMatch(), 8);
    const hopped = runUntil(state, 'hopped');
    expect(hopped.t).toBeGreaterThanOrEqual(BRAIN.calm.restMs);
    expect(hopped.t).toBeLessThan(BRAIN.calm.restMs + 20);
    expect(hopped.event).toMatchObject({ from: 8, to: 8 - BRAIN.hopLength });
    expect(isAirborne(brainOf(hopped.state))).toBe(true);
    const landed = runUntil(hopped.state, 'hopLanded');
    expect(landed.t).toBeGreaterThan(BRAIN.airMs - 20);
    expect(landed.t).toBeLessThan(BRAIN.airMs + 20);
    expect(brainOf(landed.state).x).toBeCloseTo(8 - BRAIN.hopLength, 9);
  });

  it('salta igual de lejos que el Skipper, pero descansa mucho mas', () => {
    const brain = brainOf(withBrain(createMatch(), 8, undefined));
    const skipper = spawnEnemy(createMatch(), 'skipper', 2, 8).enemies[0];
    expect(hopGait(brain).length).toBe(hopGait(skipper).length);
    expect(hopGait(brain).restMs).toBeGreaterThan(hopGait(skipper).restMs * 2);
  });

  it('con la mitad de la vida o menos entra en su fase 2 y descansa menos (BR-06), pero mas que la cuenta de una mina', () => {
    const full = enemyMaxHp('brain');
    const calm = brainOf(withBrain(createMatch(), 8, full * (BRAIN.enragedBelow + 0.01)));
    const angry = brainOf(withBrain(createMatch(), 8, full * BRAIN.enragedBelow));
    expect(isEnraged(calm)).toBe(false);
    expect(isEnraged(angry)).toBe(true);
    expect(hopGait(angry).restMs).toBe(BRAIN.enraged.restMs);
    expect(hopGait(angry).restMs).toBeLessThan(hopGait(calm).restMs);
    expect(hopGait(angry).restMs).toBeGreaterThan(MINE.countdownMs);
    expect(hopGait(angry).crouchMs).toBeLessThan(hopGait(calm).crouchMs);
    // Al caer, el descanso que empieza ya es el de su fase.
    const landing = withBrain(createMatch(), 8, full * 0.4, { hop: { stage: 'air', ms: 0, from: 8, to: 7.95 } });
    expect(brainOf(runUntil(landing, 'hopLanded').state).hop?.ms).toBe(BRAIN.enraged.restMs);
  });

  it('pasa por encima de plantas y minas sin pararse ni morderlas y, si cruza el jardin, se pierde la partida', () => {
    let state = createMatch();
    for (const col of [1, 3, 5]) state = put(state, { lane: 2, col }, createPlant(createShooter()));
    state = put(state, { lane: 2, col: 4 }, createMine('fire'));
    state = withBrain(state, 7);
    const { state: after, events } = run(state, 30_000, 50);
    expect(ofType(events, 'bite')).toHaveLength(0);
    expect(ofType(events, 'enemyEscaped')).toMatchObject([{ kind: 'brain' }]);
    expect(isDefeated(after)).toBe(true);
    for (const col of [1, 3, 5]) expect(sownAt(after, { lane: 2, col })).not.toBeNull();
  });

  it('en el aire no le dan las balas ni las minas (BR-08)', () => {
    const flying = withBrain(createMatch(), 6, TOUGH, { hop: { stage: 'air', ms: 0, from: 7, to: 5 } });
    const shot = { ...flying, bullets: [bulletAt(100, 6 - boss.halfLength)] };
    const step = stepCombat(shot, 16);
    expect(ofType(step.events, 'hit')).toHaveLength(0);
    const mined = put(flying, { lane: 2, col: 5 }, createMine('fire'));
    expect(ofType(stepCombat(mined, 16).events, 'mineArmed')).toHaveLength(0);
  });
});

describe('oculto: solo lo descubren el escudo, las minas y la granada', () => {
  it('cerca de las plantas sigue oculto y no le disparan', () => {
    let state = put(createMatch(), { lane: 2, col: 3 }, createPlant());
    state = withBrain(state, 5);
    expect(hasTarget(state.enemies, { lane: 2, col: 3 })).toBe(false);
    const { events } = run(state, BRAIN.calm.restMs - 100);
    expect(ofType(events, 'revealed')).toHaveLength(0);
    expect(ofType(events, 'shot')).toHaveLength(0);
  });

  it('una bala perdida le da, pero no lo descubre: tampoco la de hielo ni la de fuego', () => {
    const effects: Array<Bullet['effect']> = [null, { element: 'ice', slow: { amount: 0.5, ms: ICE.bulletSlowMs } }, { element: 'fire', burn: { dps: 30, ms: FIRE.burnMs } }];
    for (const effect of effects) {
      const state = withBrain(createMatch(), 6);
      const step = stepCombat({ ...state, bullets: [bulletAt(100, 6 - boss.halfLength, effect)] }, 16);
      expect(ofType(step.events, 'hit')).toHaveLength(1);
      expect(brainOf(step.state).hp).toBeLessThan(TOUGH);
      expect(ofType(run(step.state, 1500).events, 'revealed')).toHaveLength(0);
      expect(isHidden(brainOf(step.state))).toBe(true);
    }
  });

  for (const [name, shield] of [
    ['un muro', createWall()],
    ['una disparadora con escudo', shieldShooter()],
    ['el muro de hielo (invento)', createIceBlock()],
  ] as const) {
    it(`${name} lo para: cae delante, se descubre y lo muerde mientras le disparan`, () => {
      const cell = { lane: 2, col: 4 };
      let state = put(createMatch(), cell, shield);
      state = put(state, { lane: 2, col: 1 }, createPlant());
      state = withBrain(state, 7, TOUGH, aboutToHop);
      const landed = runUntil(state, 'hopLanded');
      expect(brainOf(landed.state).x).toBeCloseTo(cell.col + 0.5 + enemyReach(brainOf(state)), 6);
      // Se descubre en el mismo paso en que cae delante.
      expect(ofType(landed.events, 'revealed')).toMatchObject([{ cause: 'shield' }]);
      expect(isHidden(brainOf(landed.state))).toBe(false);
      const { events } = run(landed.state, boss.firstBiteMs + 1500);
      expect(ofType(events, 'bite')[0]?.cell).toEqual(cell);
      expect(ofType(events, 'shot').length).toBeGreaterThan(0);
    });
  }

  it(`cuando cae el escudo, a los ${BRAIN.shieldRevealMs / 1000} s vuelve a ocultarse (BR-03) y sigue saltando`, () => {
    const cell = { lane: 2, col: 4 };
    let state = put(createMatch(), cell, createWall());
    state = withBrain(state, cell.col + 0.5 + boss.reach);
    state = run(state, 100).state;
    expect(isHidden(brainOf(state))).toBe(false);
    // El escudo cae (lo rompen, o el invento de recolocar se lleva la disparadora con escudo).
    state = put(state, cell, null);
    const concealed = runUntil(state, 'concealed', 5000);
    expect(concealed.t).toBeGreaterThan(BRAIN.shieldRevealMs - 40);
    expect(concealed.t).toBeLessThan(BRAIN.shieldRevealMs + 40);
    const hopped = runUntil(state, 'hopped', 5000);
    expect(hopped.t).toBeGreaterThan(concealed.t);
  });

  it('si cae el escudo mientras vuela hacia el, aterriza donde iba a caer y sigue', () => {
    const cell = { lane: 2, col: 4 };
    let state = put(createMatch(), cell, createWall());
    state = withBrain(state, 7, TOUGH, aboutToHop);
    const hopped = runUntil(state, 'hopped');
    const target = hopped.event.to;
    const landed = runUntil(put(hopped.state, cell, null), 'hopLanded');
    expect(landed.event.x).toBeCloseTo(target, 9);
    expect(ofType(run(landed.state, 500).events, 'revealed')).toHaveLength(0);
    expect(runUntil(landed.state, 'hopped').event.to).toBeCloseTo(target - BRAIN.hopLength, 9);
  });

  it(`una mina de fuego que estalla a su lado lo descubre ${blastRevealMs('fire') / 1000} s (BR-04)`, () => {
    const mine = { lane: 2, col: 5 };
    let state = put(createMatch(), mine, { ...createMine('fire'), fuseMs: 10 });
    state = put(state, { lane: 2, col: 1 }, createPlant());
    state = withBrain(state, 6);
    const revealed = runUntil(state, 'revealed', 200);
    expect(revealed.event.cause).toBe('blast');
    expect(brainOf(revealed.state).revealMs).toBe(BRAIN.revealMinMs);
    expect(ofType(run(revealed.state, 1500).events, 'shot').length).toBeGreaterThan(0);
    const concealed = runUntil(revealed.state, 'concealed', 6000);
    expect(concealed.t).toBeGreaterThan(BRAIN.revealMinMs - 40);
    expect(concealed.t).toBeLessThan(BRAIN.revealMinMs + 40);
  });

  it(`la mina de hielo lo descubre lo que lo frena (${ICE.blastSlowMs / 1000} s) y le alarga el descanso`, () => {
    expect(blastRevealMs('ice')).toBe(Math.max(BRAIN.revealMinMs, ICE.blastSlowMs));
    const mine = { lane: 2, col: 5 };
    const state = withBrain(put(createMatch(), mine, { ...createMine('ice'), fuseMs: 10 }), 6);
    const revealed = runUntil(state, 'revealed', 200);
    expect(brainOf(revealed.state).revealMs).toBe(ICE.blastSlowMs);
    expect(runUntil(revealed.state, 'concealed', 8000).t).toBeGreaterThan(ICE.blastSlowMs - 40);
    // Frenado, tarda mas en saltar que su descanso.
    expect(runUntil(state, 'hopped', 10_000).t).toBeGreaterThan(BRAIN.calm.restMs + 1000);
  });

  it('una mina sembrada en su carril lo detecta al caer cerca y estalla antes de que vuelva a saltar', () => {
    const state = withBrain(put(createMatch(), { lane: 2, col: 3 }, createMine('fire')), 6, TOUGH, aboutToHop);
    const { events } = run(state, BRAIN.airMs + BRAIN.calm.restMs);
    const exploded = ofType(events, 'mineExploded');
    expect(exploded).toHaveLength(1);
    expect(exploded[0].enemyIds).toContain(state.enemies[0].id);
    expect(ofType(events, 'revealed')).toHaveLength(1);
  });

  it('la granada (invento) lo descubre', () => {
    const state = withBrain(createMatch(), 6.5);
    const grenade = { id: 500, cell: { lane: 2, col: 6 }, flightMs: 0, fuseMs: 10, damage: GRENADE.damage, radius: GRENADE.blastRadius };
    const revealed = runUntil({ ...state, grenades: [grenade] }, 'revealed', 200);
    expect(revealed.event.cause).toBe('blast');
    expect(brainOf(revealed.state).revealMs).toBe(blastRevealMs(null));
  });
});

describe('las 8 rondas del brote 3', () => {
  const BROTE3 = 'brain' as const;
  const BOSS_ROUND = roundCount(BROTE3) - 1;
  const kindsOf = (index: number) => new Set(roundScript(BROTE3, index).groups.map((group) => group.kind));

  it('son 8; Brain sale en la ultima, por el centro, y se le ve prepararse en la 6 y la 7', () => {
    expect(roundCount(BROTE3)).toBe(8);
    expect(outbreakOfBoss('brain')).toBe(BROTE3);
    expect(bossRoundIndex(BROTE3)).toBe(7);
    expect(roundScript(BROTE3, BOSS_ROUND).groups.find((group) => group.kind === 'brain')?.lanes).toEqual([2]);
    expect(bossFirstSeenRound(BROTE3)).toBe(5);
    expect(isBossPreparing(createMatch(0, 5, BROTE3))).toBe(true);
    expect(isBossPreparing(createMatch(0, 6, BROTE3))).toBe(true);
    expect(isBossPreparing(createMatch(0, 4, BROTE3))).toBe(false);
    expect(roundHaste(BROTE3, 5)).toBeGreaterThan(1);
    expect(roundHaste(BROTE3, 6)).toBeGreaterThan(roundHaste(BROTE3, 5));
  });

  it('un concepto por ronda: Lurker en la 1, infundir el escudo en la 2, Skipper en la 3', () => {
    expect(kindsOf(0).has('skipper')).toBe(false);
    expect([...kindsOf(0)].every((kind) => sneaks(kind))).toBe(true);
    expect(roundScript(BROTE3, 1).unlocks).toEqual(['shieldInfuse']);
    expect(kindsOf(1).has('skipper')).toBe(false);
    expect(kindsOf(2).has('skipper')).toBe(true);
    for (let i = 3; i < BOSS_ROUND; i++) expect(kindsOf(i).has('skipper') && kindsOf(i).has('lurkerArmored'), `ronda ${i + 1}`).toBe(true);
  });

  it('los primeros Skipper salen de uno en uno', () => {
    const skippers = roundScript(BROTE3, 2).groups.filter((group) => group.kind === 'skipper');
    expect(skippers.slice(0, 4).every((group) => group.lanes.length === 1)).toBe(true);
  });

  it('la ronda 5 trae dos oleadas por los cinco carriles', () => {
    const full = roundScript(BROTE3, 4).groups.filter((group) => group.lanes.length === BOARD.lanes);
    expect(full.length).toBeGreaterThanOrEqual(2);
  });

  it('la dificultad medida sube de ronda en ronda, y la 1 es mas dura que la 1 del brote 2', () => {
    for (let i = 1; i < BOSS_ROUND; i++) expect(roundThreat(BROTE3, i), `ronda ${i + 1}`).toBeGreaterThan(roundThreat(BROTE3, i - 1));
    expect(roundThreat(BROTE3, 0)).toBeGreaterThan(roundThreat('elkCloner', 0));
  });

  it('ninguna tropa pasa del nivel 9, salvo la escolta, que lleva el 10', () => {
    for (let i = 0; i < roundCount(BROTE3); i++) {
      const { groups, levels } = roundScript(BROTE3, i);
      expect(Math.max(...Object.keys(levels ?? { 1: 1 }).map(Number)), `ronda ${i + 1}`).toBeLessThanOrEqual(9);
      for (const group of groups) if (group.level !== undefined) expect(group.level).toBe(10);
    }
  });

  it('escolta (BR-07): un Lurker acorazado de nivel 10 por carril, con su grito, y dos Skipper de nivel 10, antes que el', () => {
    const { groups } = roundScript(BROTE3, BOSS_ROUND);
    const bossAt = groups.findIndex((group) => group.kind === 'brain');
    const escort = groups.slice(0, bossAt);
    expect(escort).toContainEqual(expect.objectContaining({ kind: 'lurkerArmored', lanes: [0, 1, 2, 3, 4], level: 10, shout: 'escort' }));
    expect(escort.filter((group) => group.kind === 'skipper').flatMap((group) => group.lanes)).toHaveLength(2);
    expect(escort.filter((group) => group.kind === 'skipper').every((group) => group.level === 10)).toBe(true);
    expect(groups.length).toBeGreaterThan(bossAt + 1);
  });

  it('los refuerzos dejan de salir en cuanto cae', () => {
    const { groups } = roundScript(BROTE3, BOSS_ROUND);
    const bossAt = groups.findIndex((group) => group.kind === 'brain');
    let state = createMatch(0, BOSS_ROUND, BROTE3);
    state = { ...state, round: { ...state.round, phase: 'attack', prepMs: 0, elapsedMs: groups[bossAt].atMs, released: bossAt + 1 } };
    const after = stepRound(state, groups[groups.length - 1].atMs, BOARD.columns + 0.75);
    expect(after.spawned).toHaveLength(0);
    expect(after.events).toContainEqual({ type: 'won' });
  });
});

describe('al caer', () => {
  it('caen con el todos los demas y la partida queda ganada para la ronda', () => {
    let state = spawnEnemy(createMatch(), 'lurkerArmored', 1, 6);
    state = spawnEnemy(state, 'skipper', 3, 6);
    state = withBrain(state, 6, 1);
    const step = stepCombat({ ...state, bullets: [bulletAt(100, 6 - boss.halfLength)] }, 16);
    expect(ofType(step.events, 'enemyKilled').map((e) => e.kind).sort()).toEqual(['brain', 'lurkerArmored', 'skipper']);
    expect(step.state.enemies).toHaveLength(0);
  });
});

describe('partida guardada', () => {
  it('guarda a Brain oculto a mitad de un salto y descubierto mordiendo', () => {
    let state = withBrain(createMatch(), 6, enemyMaxHp('brain'), { hop: { stage: 'air', ms: 0, from: 7, to: 5 } });
    state = withBrain(state, 4.3, enemyMaxHp('brain') / 2, { revealMs: BRAIN.shieldRevealMs });
    const loaded = decodeSave(encodeSave(state, null, 1));
    expect(loaded?.match).toEqual(state);
  });
});
