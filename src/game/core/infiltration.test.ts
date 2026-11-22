import { describe, expect, it } from 'vitest';
import { BOARD, ENEMIES, HOP, ICE, LIVES, MINE, STEALTH } from '../config/balance';
import { decodeSave, encodeSave, SAVE_VERSION } from '../save';
import type { Cell } from './board';
import {
  enemyMaxHp,
  enemyReach,
  hasTarget,
  hops,
  isAirborne,
  isHidden,
  nearSown,
  sneaks,
  spawnEnemy,
  stepCombat,
  type Bullet,
  type CombatEvent,
  type Enemy,
  type EnemyKind,
} from './combat';
import { createMatch, createMine, createPlant, createWall, type MatchState, type Sown } from './match';
import { createShooter } from './plants';
import { createIceBlock } from './powers';

/**
 * Tropas del brote 3, el de Brain (T-038; LK-02 a LK-09 decididas el 22 nov 2026 con la recomendacion): el brote de la
 * infiltracion. Los Lurker llegan ocultos (las plantas no les apuntan hasta que se descubren) y el Skipper avanza a saltos
 * por encima de todo lo que no sea escudo.
 */

const LURKERS: readonly EnemyKind[] = ['lurker', 'lurkerSpitter', 'lurkerArmored'];
/** Vida de un enemigo que no muere durante la prueba. */
const TOUGH = 1e9;

function put(state: MatchState, cell: Cell, sown: Sown): MatchState {
  return { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? sown : p))) };
}

const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

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

const last = (state: MatchState): Enemy => state.enemies[state.enemies.length - 1];
const byId = (state: MatchState, id: number): Enemy | undefined => state.enemies.find((e) => e.id === id);
const withEnemy = (state: MatchState, patch: Partial<Enemy>): MatchState => ({ ...state, enemies: [{ ...last(state), ...patch }] });
/** Una semilla a punto de dar a lo que tenga el hocico en `front` en su carril. */
const bulletAt = (id: number, lane: number, front: number, damage = 10): Bullet => ({ id, lane, x: front - 0.01, damage, effect: null });

describe('Lurker: las tropas ocultas (T-038)', () => {
  it('muerden, escupen y aguantan como su pareja del brote 1, con un 25 % menos de vida por el sigilo (LK-09)', () => {
    const pairs = [
      [ENEMIES.lurker, ENEMIES.worm],
      [ENEMIES.lurkerSpitter, ENEMIES.spitter],
      [ENEMIES.lurkerArmored, ENEMIES.armored],
    ] as const;
    for (const [lurker, pair] of pairs) {
      expect({ ...lurker, hp: pair.hp }).toEqual(pair);
      expect(lurker.hp).toBeCloseTo(pair.hp * 0.75, 9);
    }
  });

  it('las tres llegan ocultas; el Skipper no', () => {
    for (const kind of LURKERS) {
      const enemy = last(spawnEnemy(createMatch(), kind, 2, BOARD.columns + 0.75));
      expect(sneaks(kind)).toBe(true);
      expect(isHidden(enemy)).toBe(true);
    }
    const skipper = last(spawnEnemy(createMatch(), 'skipper', 2, BOARD.columns + 0.75));
    expect(sneaks('skipper')).toBe(false);
    expect(skipper.revealMs).toBeNull();
    expect(isHidden(skipper)).toBe(false);
  });

  it('una disparadora no dispara por una tropa oculta', () => {
    const state = spawnEnemy(put(createMatch(), { lane: 2, col: 0 }, createPlant()), 'lurker', 2, 7, TOUGH);
    expect(hasTarget(state.enemies, { lane: 2, col: 0 })).toBe(false);
    const { events } = run(state, 2000);
    expect(ofType(events, 'shot')).toHaveLength(0);
  });

  it(`se descubre a ${STEALTH.revealRadius} casillas de lo primero sembrado en su carril, y entonces le disparan`, () => {
    const plant = { lane: 2, col: 1 };
    const state = spawnEnemy(put(createMatch(), plant, createPlant()), 'lurker', 2, 8, TOUGH);
    const revealed = runUntil(state, 'revealed');
    const x = last(revealed.state).x;
    expect(x - (plant.col + 0.5)).toBeLessThanOrEqual(STEALTH.revealRadius);
    expect(x - (plant.col + 0.5)).toBeGreaterThan(STEALTH.revealRadius - 0.05);
    expect(runUntil(revealed.state, 'shot', 3000).event.cell).toEqual(plant);
  });

  it('cuenta lo que tiene delante, no lo que ya dejo atras', () => {
    const lane: Array<Sown | null> = Array.from({ length: BOARD.columns }, () => null);
    lane[6] = createPlant();
    expect(nearSown(lane, 6)).toBe(false);
    expect(nearSown(lane, 6.5)).toBe(true);
    expect(nearSown(lane, 6.5 + STEALTH.revealRadius)).toBe(true);
    expect(nearSown(lane, 6.5 + STEALTH.revealRadius + 0.01)).toBe(false);
  });

  it('una disparadora sembrada a menos de 4 casillas la descubre al instante', () => {
    let state = spawnEnemy(createMatch(), 'lurker', 2, 6, TOUGH);
    state = run(state, 200).state;
    expect(isHidden(last(state))).toBe(true);
    state = put(state, { lane: 2, col: 3 }, createPlant());
    const step = stepCombat(state, 16);
    expect(ofType(step.events, 'revealed')).toHaveLength(1);
    expect(isHidden(last(step.state))).toBe(false);
  });

  it('en un carril sin nada sembrado cruza oculta hasta la salida', () => {
    const state = spawnEnemy(createMatch(), 'lurker', 2, 2, TOUGH);
    const { events, state: after } = run(state, 10_000, 50);
    expect(ofType(events, 'revealed')).toHaveLength(0);
    expect(ofType(events, 'enemyEscaped')).toHaveLength(1);
    expect(after.lives).toBe(LIVES.start - 1);
  });

  it('una bala que ya va por el carril le da aunque este oculta (LK-04), y el golpe la descubre (LK-03)', () => {
    let state = spawnEnemy(createMatch(), 'lurker', 2, 7, TOUGH);
    state = { ...state, bullets: [bulletAt(900, 2, 7 - ENEMIES.lurker.halfLength)] };
    const step = stepCombat(state, 16);
    expect(ofType(step.events, 'hit')).toHaveLength(1);
    expect(ofType(step.events, 'revealed')).toHaveLength(1);
    expect(isHidden(last(step.state))).toBe(false);
  });

  it(`descubierta por un golpe, vuelve a ocultarse ${STEALTH.holdMs / 1000} s despues si sigue lejos de lo sembrado`, () => {
    let state = spawnEnemy(createMatch(), 'lurker', 2, 8.5, TOUGH);
    state = { ...state, bullets: [bulletAt(900, 2, 8.5 - ENEMIES.lurker.halfLength)] };
    const hit = stepCombat(state, 16);
    const concealed = runUntil(hit.state, 'concealed', 10_000);
    expect(concealed.t).toBeGreaterThanOrEqual(STEALTH.holdMs - 16);
    expect(concealed.t).toBeLessThanOrEqual(STEALTH.holdMs + 32);
    expect(isHidden(last(concealed.state))).toBe(true);
  });

  it('cerca de lo sembrado no vuelve a ocultarse', () => {
    const state = spawnEnemy(put(createMatch(), { lane: 2, col: 2 }, createWall()), 'lurkerArmored', 2, 4, TOUGH);
    const { events, state: after } = run(state, 8000, 50);
    expect(ofType(events, 'revealed')).toHaveLength(1);
    expect(ofType(events, 'concealed')).toHaveLength(0);
    expect(isHidden(last(after))).toBe(false);
  });

  it('el hielo y el fuego la descubren mientras duran, y unos segundos despues (LK-03)', () => {
    const base = spawnEnemy(createMatch(), 'lurker', 2, 8.5, TOUGH);
    for (const patch of [{ slow: { amount: ICE.blastSlow, ms: 1000 } }, { burn: { dps: 1, ms: 1000 } }]) {
      const state = withEnemy(base, patch);
      const step = stepCombat(state, 16);
      expect(ofType(step.events, 'revealed')).toHaveLength(1);
      // Sigue descubierta mientras dura y `holdMs` despues.
      const during = run(step.state, 1000 + STEALTH.holdMs - 100, 50);
      expect(ofType(during.events, 'concealed')).toHaveLength(0);
      expect(runUntil(during.state, 'concealed', 1000).event.enemyId).toBe(last(state).id);
    }
  });

  it('una mina detecta a una tropa oculta igual que a una visible', () => {
    const mine = { lane: 2, col: 4 };
    let state = put(createMatch(), mine, createMine('fire'));
    state = spawnEnemy(state, 'lurker', 2, mine.col + 0.5 + MINE.detectRadius - 0.01, TOUGH);
    expect(isHidden(last(state))).toBe(true);
    expect(ofType(stepCombat(state, 16).events, 'mineArmed')).toEqual([{ type: 'mineArmed', cell: mine }]);
  });

  it('el escupidor siempre se descubre antes de escupir: escupe desde mas cerca que las 4 casillas', () => {
    expect(ENEMIES.lurkerSpitter.range).toBeLessThan(STEALTH.revealRadius);
    const state = spawnEnemy(put(createMatch(), { lane: 2, col: 1 }, createWall()), 'lurkerSpitter', 2, 8, TOUGH);
    const spat = runUntil(state, 'spat', 40_000);
    expect(isHidden(last(spat.state))).toBe(false);
  });

  it('una oculta en llamas esta descubierta mientras arde', () => {
    const state = withEnemy(spawnEnemy(createMatch(), 'lurkerArmored', 2, 8.5, TOUGH), { burn: { dps: 1, ms: 5000 } });
    const { state: burning } = run(state, 4000, 50);
    expect(last(burning).burn).not.toBeNull();
    expect(isHidden(last(burning))).toBe(false);
  });
});

describe('Skipper: salta por encima de todo lo que no sea escudo (T-038)', () => {
  const skipper = ENEMIES.skipper;

  it('es fragil, da lo de un escupidor y avanza a saltos (LK-05, LK-08)', () => {
    expect(skipper.hp).toBe(65);
    expect(skipper.hp).toBeLessThan(ENEMIES.lurker.hp);
    expect(skipper.reward).toBe(ENEMIES.lurkerSpitter.reward);
    expect(hops('skipper')).toBe(true);
    expect(HOP.length).toBe(2);
    expect(HOP.restMs).toBe(1000);
    expect(HOP.crouchMs).toBeLessThan(HOP.restMs);
    expect(skipper.speed).toBeCloseTo(HOP.length / ((HOP.restMs + HOP.airMs) / 1000), 9);
  });

  it(`descansa ${HOP.restMs / 1000} s en tierra, salta ${HOP.length} casillas en el aire y cae`, () => {
    const state = spawnEnemy(createMatch(), 'skipper', 2, 8.5);
    const hopped = runUntil(state, 'hopped');
    expect(hopped.t).toBeGreaterThanOrEqual(HOP.restMs - 16);
    expect(hopped.t).toBeLessThanOrEqual(HOP.restMs + 16);
    expect(hopped.event).toMatchObject({ from: 8.5, to: 8.5 - HOP.length });
    expect(isAirborne(last(hopped.state))).toBe(true);
    const landed = runUntil(hopped.state, 'hopLanded', 2000);
    expect(landed.t).toBeGreaterThanOrEqual(HOP.airMs - 32);
    expect(landed.t).toBeLessThanOrEqual(HOP.airMs + 32);
    expect(last(landed.state).x).toBeCloseTo(8.5 - HOP.length, 9);
    expect(isAirborne(last(landed.state))).toBe(false);
  });

  it('pasa por encima de plantas y minas sin tocarlas ni pararse, y al cruzar quita una vida', () => {
    let state = createMatch();
    for (const col of [2, 4, 6]) state = put(state, { lane: 2, col }, { ...createPlant(), reloadMs: Infinity });
    state = put(state, { lane: 2, col: 5 }, createMine('ice'));
    state = spawnEnemy(state, 'skipper', 2, BOARD.columns + 0.75, TOUGH);
    const { events, state: after } = run(state, 12_000, 20);
    expect(ofType(events, 'bite')).toHaveLength(0);
    for (const col of [2, 4, 6]) expect(after.plants[2][col]?.hp).toBe(createPlant().hp);
    expect(ofType(events, 'enemyEscaped')).toHaveLength(1);
    expect(after.lives).toBe(LIVES.start - 1);
  });

  it('cae justo en la casilla de una planta y no se para ni la dana', () => {
    // De 7,5 salta a 5,5: el centro de la casilla 5.
    let state = put(createMatch(), { lane: 2, col: 5 }, { ...createPlant(), reloadMs: Infinity });
    state = spawnEnemy(state, 'skipper', 2, 7.5, TOUGH);
    const landed = runUntil(state, 'hopLanded');
    expect(last(landed.state).x).toBeCloseTo(5.5, 9);
    const { events, state: after } = run(landed.state, 2000);
    expect(ofType(events, 'bite')).toHaveLength(0);
    expect(ofType(events, 'hopped')).toHaveLength(1);
    expect(after.plants[2][5]?.hp).toBe(createPlant().hp);
  });

  it('en el aire no le dan las balas; en tierra si', () => {
    const state = spawnEnemy(createMatch(), 'skipper', 2, 6, TOUGH);
    const flying = withEnemy(state, { hop: { stage: 'air', ms: 0, from: 7, to: 5 } });
    const front = 6 - skipper.halfLength;
    const air = stepCombat({ ...flying, bullets: [bulletAt(900, 2, front)] }, 16);
    expect(ofType(air.events, 'hit')).toHaveLength(0);
    expect(air.state.bullets).toHaveLength(1);
    const ground = stepCombat({ ...state, bullets: [bulletAt(900, 2, front)] }, 16);
    expect(ofType(ground.events, 'hit')).toHaveLength(1);
  });

  it('una disparadora no le apunta en el aire, y en tierra si', () => {
    const cell = { lane: 2, col: 1 };
    const state = spawnEnemy(createMatch(), 'skipper', 2, 6, TOUGH);
    expect(hasTarget(state.enemies, cell)).toBe(true);
    const flying = withEnemy(state, { hop: { stage: 'air', ms: 0, from: 7, to: 5 } });
    expect(hasTarget(flying.enemies, cell)).toBe(false);
  });

  it.each([
    ['un muro', createWall()],
    ['una disparadora con escudo', { ...createPlant(createShooter()), shooter: { ...createShooter(), element: 'shield' as const }, reloadMs: Infinity }],
    ['el muro de hielo', createIceBlock()],
  ] as const)('con %s en su camino cae delante y lo muerde', (_name, shield) => {
    let state = put(createMatch(), { lane: 2, col: 2 }, { ...createPlant(), reloadMs: Infinity });
    state = put(state, { lane: 2, col: 1 }, shield as Sown);
    state = spawnEnemy(state, 'skipper', 2, BOARD.columns + 0.75, TOUGH);
    const bite = runUntil(state, 'bite', 20_000);
    expect(bite.event.cell).toEqual({ lane: 2, col: 1 });
    // Delante del escudo, a su alcance: nunca encima ni detras.
    expect(last(bite.state).x).toBeCloseTo(1.5 + enemyReach(last(bite.state)), 6);
    expect(isAirborne(last(bite.state))).toBe(false);
  });

  it('si el escudo cae, sigue saltando (LK-07)', () => {
    let state = put(createMatch(), { lane: 2, col: 1 }, { ...createWall(), hp: 1 });
    state = spawnEnemy(state, 'skipper', 2, 4, TOUGH);
    const broken = runUntil(state, 'plantDestroyed', 20_000);
    const next = runUntil(broken.state, 'hopped', 3000);
    expect(next.t).toBeGreaterThanOrEqual(HOP.restMs - 16);
    expect(runUntil(next.state, 'enemyEscaped', 10_000).event.kind).toBe('skipper');
  });

  it('un escudo sembrado mientras vuela lo para igual', () => {
    const state = withEnemy(spawnEnemy(createMatch(), 'skipper', 2, 4.4, TOUGH), { hop: { stage: 'air', ms: 0, from: 4.5, to: 2.5 } });
    const walled = put(state, { lane: 2, col: 2 }, createWall());
    const landed = runUntil(walled, 'hopLanded', 2000);
    expect(last(landed.state).x).toBeCloseTo(2.5 + enemyReach(last(state)), 6);
    expect(runUntil(landed.state, 'bite', 2000).event.cell).toEqual({ lane: 2, col: 2 });
  });

  it('dos Skippers frente al mismo escudo lo muerden los dos', () => {
    let state = put(createMatch(), { lane: 2, col: 1 }, createWall());
    state = spawnEnemy(state, 'skipper', 2, 4.1, TOUGH);
    state = spawnEnemy(state, 'skipper', 2, 4.3, TOUGH);
    const { events } = run(state, 6000, 20);
    const biters = new Set(ofType(events, 'bite').map((e) => e.enemyId));
    expect(biters.size).toBe(2);
  });

  it('el hielo le alarga la pausa entre saltos, no el vuelo', () => {
    const state = withEnemy(spawnEnemy(createMatch(), 'skipper', 2, 8.5, TOUGH), { slow: { amount: ICE.blastSlow, ms: 60_000 } });
    const hopped = runUntil(state, 'hopped');
    expect(hopped.t).toBeGreaterThanOrEqual(HOP.restMs / (1 - ICE.blastSlow) - 32);
    const landed = runUntil(hopped.state, 'hopLanded', 2000);
    expect(landed.t).toBeLessThanOrEqual(HOP.airMs + 32);
  });

  it('en tierra cerca de una mina la arma (LK-06); en el aire no, y la explosion no le alcanza', () => {
    const mine = { lane: 2, col: 4 };
    const near = spawnEnemy(put(createMatch(), mine, createMine('fire')), 'skipper', 2, 5.2, TOUGH);
    expect(ofType(stepCombat(near, 16).events, 'mineArmed')).toHaveLength(1);
    const flying = withEnemy(near, { hop: { stage: 'air', ms: 0, from: 6.2, to: 4.2 } });
    expect(ofType(stepCombat(flying, 16).events, 'mineArmed')).toHaveLength(0);
    const armed = put(flying, mine, { ...createMine('fire'), fuseMs: 10 });
    const blast = stepCombat(armed, 16);
    expect(ofType(blast.events, 'mineExploded')[0].enemyIds).toEqual([]);
  });

  it('cruzar el borde izquierdo en el aire quita una vida, como cualquier enemigo', () => {
    const state = spawnEnemy(createMatch(), 'skipper', 2, 1.2, TOUGH);
    const escaped = runUntil(state, 'enemyEscaped', 5000);
    expect(escaped.event.kind).toBe('skipper');
    expect(escaped.state.lives).toBe(LIVES.start - 1);
    expect(escaped.state.enemies).toHaveLength(0);
  });

  it('acelerado (rondas de antes del jefe), salta antes y vuela mas rapido', () => {
    const state = spawnEnemy(createMatch(), 'skipper', 2, 8.5, TOUGH, 1.25);
    expect(runUntil(state, 'hopped').t).toBeLessThanOrEqual(HOP.restMs / 1.25 + 16);
  });
});

describe('partida guardada (T-038)', () => {
  it('acepta Lurkers ocultos y descubiertos y Skippers en tierra y en el aire (desde la version 11)', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(11);
    let state = put(createMatch(), { lane: 2, col: 1 }, createPlant());
    state = spawnEnemy(state, 'lurker', 0, 6);
    state = spawnEnemy(state, 'lurkerArmored', 1, 6);
    state = spawnEnemy(state, 'skipper', 2, 5);
    state = spawnEnemy(state, 'skipper', 3, 5);
    const [hidden, revealed, resting, flying] = state.enemies;
    state = {
      ...state,
      enemies: [hidden, { ...revealed, revealMs: 1200 }, { ...resting, hop: { stage: 'rest', ms: 300, from: 7, to: 5 } }, { ...flying, hop: { stage: 'air', ms: 0, from: 6, to: 4 } }],
    };
    const loaded = decodeSave(encodeSave(state, null, 1));
    expect(loaded?.match).toEqual(state);
    expect(isHidden(byId(loaded!.match, hidden.id)!)).toBe(true);
    expect(isAirborne(byId(loaded!.match, flying.id)!)).toBe(true);
  });

  it('un enemigo sin salto ni sigilo (de antes de la 11) no se entiende', () => {
    const state = spawnEnemy(createMatch(), 'lurker', 0, 6);
    const { hop: _hop, revealMs: _revealMs, ...old } = state.enemies[0];
    expect(decodeSave(encodeSave({ ...state, enemies: [old as Enemy] }, null, 1))).toBeNull();
  });

  it('la vida llena de un Skipper de nivel 1 es la de su tipo con la fuerza de todos', () => {
    expect(last(spawnEnemy(createMatch(), 'skipper', 0, 6)).hp).toBe(enemyMaxHp('skipper'));
  });
});
