import { describe, expect, it } from 'vitest';
import { BOARD, ELK_CLONER, ENEMIES, FIRE, GRENADE, ICE_WALL, MINE, POWER_LEVELS, POWERS, SHOOTER } from '../config/balance';
import { decodeSave, encodeSave, SAVE_VERSION } from '../save';
import type { Cell } from './board';
import { enemyHalfLength, enemyMaxHp, isShield, poemHit, spawnEnemy, stepCombat, waveReach, type CombatEvent, type Enemy } from './combat';
import { createMatch, createMine, createPlant, createWall, iceAt, plantAt, sownAt, sownElement, sownMaxHp, elementDragBlocker, cardPlay, type MatchState, type Sown } from './match';
import { createShooter, plantMaxHp } from './plants';
import {
  ICE_WALL_MAX_SPAN,
  POWER_IDS,
  chargesAt,
  createIceBlock,
  grenadeAt,
  grenadeBlocker,
  iceWallBlocker,
  iceWallAt,
  iceWallCells,
  iceWallCellsIn,
  iceWallPushes,
  loadoutSlots,
  placeIceWall,
  powerBlocker,
  powerCharges,
  powerLevel,
  powerMilestones,
  powersFromParam,
  relocateAt,
  relocateBlocker,
  relocatePlant,
  relocateSourceBlocker,
  relocateTargets,
  relocatedHp,
  throwGrenade,
  type CarriedPower,
} from './powers';

/**
 * Poderes (T-021; O-01 a O-11 decididas el 22 nov 2026): recolocar una disparadora, la granada y el muro de hielo de tres
 * casillas. Un uso gasta una carga; afectan a los jefes igual que a los demas.
 */

/** Los tres poderes en el nivel `level` (T-022): asi se prueban las reglas de siempre en el nivel 1. */
const all = (level = 1): CarriedPower[] => POWER_IDS.map((id) => ({ id, level }));
const ALL = all();

function put(state: MatchState, cell: Cell, sown: Sown): MatchState {
  return { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? sown : p))) };
}

/** Partida del brote 1 en el ataque de su ronda 5 (ya hay de todo), sin grupos por salir que estorben. */
const attacking = (state: MatchState = createMatch(0, 4, 'creeper', false, ALL)): MatchState => ({
  ...state,
  round: { ...state.round, phase: 'attack', prepMs: 0, elapsedMs: 0, released: 0 },
});

const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

const enemyById = (state: MatchState, id: number): Enemy => state.enemies.find((e) => e.id === id) as Enemy;
const lastEnemy = (state: MatchState): Enemy => state.enemies[state.enemies.length - 1];

describe('cargas y panel', () => {
  it('sin poderes elegidos, la partida no trae ninguno: salen de la tienda (T-022)', () => {
    expect(POWERS.chargesPerMatch).toBe(1);
    expect(createMatch().powers).toEqual([]);
    expect(createMatch(0, 0, 'elkCloner').powers).toEqual([]);
    expect(loadoutSlots()).toEqual([]);
  });

  it('trae los elegidos con su nivel y sus cargas, en el orden del panel y sin repetir', () => {
    const loadout: CarriedPower[] = [
      { id: 'iceWall', level: 4 },
      { id: 'grenade', level: 1 },
      { id: 'iceWall', level: 9 },
    ];
    expect(createMatch(0, 0, 'creeper', false, loadout).powers).toEqual([
      { id: 'grenade', level: 1, charges: 1 },
      { id: 'iceWall', level: 4, charges: 1 },
    ]);
    expect(createMatch(0, 0, 'creeper', false, ALL).powers).toEqual(POWER_IDS.map((id) => ({ id, level: 1, charges: 1 })));
    // Un nivel que no existe cuenta como el 1.
    expect(loadoutSlots([{ id: 'relocate', level: 99 }])).toEqual([{ id: 'relocate', level: 1, charges: 1 }]);
  });

  it('en desarrollo se eligen por la direccion, con su nivel; vacio es ninguno y sin el, lo elegido', () => {
    expect(powersFromParam('granada,muro')).toEqual([
      { id: 'grenade', level: 1 },
      { id: 'iceWall', level: 1 },
    ]);
    expect(powersFromParam('Recolocar:5, hielo:10, granada:3')).toEqual([
      { id: 'relocate', level: 5 },
      { id: 'iceWall', level: 10 },
      { id: 'grenade', level: 3 },
    ]);
    expect(powersFromParam('granada:2,granada:7,nada')).toEqual([{ id: 'grenade', level: 2 }]);
    expect(powersFromParam('muro:11,recolocar:0')).toEqual([
      { id: 'iceWall', level: 1 },
      { id: 'relocate', level: 1 },
    ]);
    expect(powersFromParam('')).toEqual([]);
    expect(powersFromParam(null)).toBeNull();
  });

  it('un poder que no se lleva o sin cargas no se puede usar', () => {
    const state = attacking(createMatch(0, 4, 'creeper', false, [{ id: 'grenade', level: 1 }]));
    expect(powerBlocker(state, 'iceWall')).toBe('not-carried');
    expect(powerCharges(state, 'iceWall')).toBe(0);
    const spent = throwGrenade(state, { lane: 2, col: 5 });
    expect(powerCharges(spent, 'grenade')).toBe(0);
    expect(powerBlocker(spent, 'grenade')).toBe('no-charges');
    expect(() => throwGrenade(spent, { lane: 2, col: 5 })).toThrow();
  });

  it('en la preparacion solo se recoloca; la granada y el muro, en el ataque (O-07)', () => {
    const prep = createMatch(0, 4, 'creeper', false, ALL);
    expect(prep.round.phase).toBe('prep');
    expect(powerBlocker(prep, 'relocate')).toBeNull();
    expect(powerBlocker(prep, 'grenade')).toBe('attack-only');
    expect(powerBlocker(prep, 'iceWall')).toBe('attack-only');
    const attack = attacking(prep);
    for (const id of POWER_IDS) expect(powerBlocker(attack, id), id).toBeNull();
  });

  it('con la partida acabada no se usa ninguno', () => {
    const lost = { ...attacking(), lives: 0 };
    const won = { ...attacking(), round: { ...attacking().round, phase: 'won' as const } };
    for (const id of POWER_IDS) {
      expect(powerBlocker(lost, id)).toBe('over');
      expect(powerBlocker(won, id)).toBe('over');
    }
  });
});

describe('recolocar (O-03)', () => {
  const from = { lane: 1, col: 2 };
  const to = { lane: 3, col: 6 };

  it('lleva la disparadora tal como estaba a la casilla vacia y gasta una carga', () => {
    const shooter = { ...createShooter(), cannons: 2 as const, element: 'fire' as const, level: 4 };
    const plant = { ...createPlant(shooter), hp: 123, reloadMs: 456 };
    const state = put(createMatch(0, 4, 'creeper', false, ALL), from, plant);
    const moved = relocatePlant(state, from, to);
    expect(sownAt(moved, from)).toBeNull();
    expect(plantAt(moved, to)).toEqual(plant);
    expect(powerCharges(moved, 'relocate')).toBe(0);
    // Las demas cargas no cambian.
    expect(powerCharges(moved, 'grenade')).toBe(1);
  });

  it('solo mueve disparadoras, a casillas vacias del tablero', () => {
    let state = put(createMatch(0, 4, 'creeper', false, ALL), from, createPlant());
    state = put(state, { lane: 0, col: 0 }, createMine('fire'));
    state = put(state, { lane: 0, col: 1 }, createWall());
    expect(relocateSourceBlocker(state, from)).toBeNull();
    expect(relocateSourceBlocker(state, { lane: 0, col: 0 })).toBe('no-plant');
    expect(relocateSourceBlocker(state, { lane: 0, col: 1 })).toBe('no-plant');
    expect(relocateSourceBlocker(state, { lane: 4, col: 8 })).toBe('no-plant');
    expect(relocateBlocker(state, from, { lane: 0, col: 0 })).toBe('occupied');
    expect(relocateBlocker(state, from, from)).toBe('same-cell');
    expect(relocateBlocker(state, from, { lane: 5, col: 0 })).toBe('off-board');
    expect(relocateBlocker(state, from, { lane: 0, col: 9 })).toBe('off-board');
    expect(relocateTargets(state, from)).toHaveLength(BOARD.lanes * BOARD.columns - 3);
    expect(() => relocatePlant(state, from, { lane: 0, col: 0 })).toThrow();
  });

  it('se puede en la preparacion y en el ataque', () => {
    const state = put(createMatch(0, 4, 'creeper', false, ALL), from, createPlant());
    expect(relocateBlocker(state, from, to)).toBeNull();
    expect(relocateBlocker(attacking(state), from, to)).toBeNull();
  });

  it('el gusano que la mordia sigue avanzando', () => {
    let state = attacking(put(createMatch(0, 4, 'creeper', false, ALL), from, createPlant()));
    state = spawnEnemy(state, 'worm', from.lane, from.col + 0.5 + ENEMIES.worm.reach);
    state = stepCombat(state, 1000).state;
    expect(lastEnemy(state).attackMs).not.toBeNull();
    const x = lastEnemy(state).x;
    state = relocatePlant(state, from, to);
    state = stepCombat(state, 1000).state;
    expect(lastEnemy(state).attackMs).toBeNull();
    expect(lastEnemy(state).x).toBeLessThan(x);
    expect(plantAt(state, to)?.hp).toBe(SHOOTER.hp - ENEMIES.worm.biteDamage * 1.1);
  });
});

describe('granada (O-04)', () => {
  const cell = { lane: 2, col: 5 };
  const center = cell.col + 0.5;

  it('alcanza mas que la mina y hace su dano de fuego', () => {
    expect(GRENADE.blastRadius).toBeGreaterThan(MINE.blastRadius);
    expect(GRENADE.damage).toBe(FIRE.blastDamage);
    expect(GRENADE.fuseMs).toBe(2000);
  });

  it('vuela, cae, cuenta 2 s y explota; la carga se gasta al lanzarla', () => {
    let state = throwGrenade(attacking(), cell);
    expect(powerCharges(state, 'grenade')).toBe(0);
    expect(state.grenades).toHaveLength(1);
    let step = stepCombat(state, GRENADE.flightMs - 10);
    expect(ofType(step.events, 'grenadeLanded')).toHaveLength(0);
    step = stepCombat(step.state, 20);
    expect(ofType(step.events, 'grenadeLanded')).toEqual([{ type: 'grenadeLanded', grenadeId: state.grenades[0].id, cell }]);
    step = stepCombat(step.state, GRENADE.fuseMs - 20);
    expect(ofType(step.events, 'grenadeExploded')).toHaveLength(0);
    state = step.state;
    step = stepCombat(state, 20);
    expect(ofType(step.events, 'grenadeExploded')).toHaveLength(1);
    expect(step.state.grenades).toEqual([]);
  });

  it('explota aunque no haya nadie: la carga ya esta gastada', () => {
    const { state, events } = stepCombat(throwGrenade(attacking(), cell), GRENADE.flightMs + GRENADE.fuseMs);
    expect(ofType(events, 'grenadeExploded')).toEqual([{ type: 'grenadeExploded', grenadeId: expect.any(Number), cell, enemyIds: [] }]);
    expect(powerCharges(state, 'grenade')).toBe(0);
  });

  it('dana a los enemigos de su radio, tambien en otros carriles, y no a los de fuera', () => {
    let state = attacking();
    state = spawnEnemy(state, 'armored', 2, center, undefined, 0.0001);
    const near = lastEnemy(state).id;
    state = spawnEnemy(state, 'armored', 1, center + 1.4, undefined, 0.0001);
    const side = lastEnemy(state).id;
    state = spawnEnemy(state, 'armored', 4, center + 0.6, undefined, 0.0001);
    const far = lastEnemy(state).id;
    state = throwGrenade(state, cell);
    const { state: after, events } = stepCombat(state, GRENADE.flightMs + GRENADE.fuseMs);
    const blast = ofType(events, 'grenadeExploded')[0];
    expect([...blast.enemyIds].sort()).toEqual([near, side].sort());
    const full = enemyMaxHp('armored');
    expect(enemyById(after, near).hp).toBeCloseTo(full - GRENADE.damage);
    expect(enemyById(after, side).hp).toBeCloseTo(full - GRENADE.damage);
    expect(enemyById(after, far).hp).toBeCloseTo(full);
  });

  it('no dana plantas y puede caer donde hay una', () => {
    let state = put(attacking(), cell, createPlant());
    state = put(state, { lane: 1, col: 5 }, createMine('fire'));
    expect(grenadeBlocker(state, cell)).toBeNull();
    expect(grenadeBlocker(state, { lane: 2, col: 9 })).toBe('off-board');
    const after = stepCombat(throwGrenade(state, cell), GRENADE.flightMs + GRENADE.fuseMs).state;
    expect(plantAt(after, cell)?.hp).toBe(SHOOTER.hp);
    expect(sownAt(after, { lane: 1, col: 5 })?.hp).toBe(MINE.hp);
  });

  it('es invulnerable: los enemigos no se paran en ella y no ocupa la casilla', () => {
    let state = throwGrenade(attacking(), cell);
    state = spawnEnemy(state, 'worm', cell.lane, center + 0.3);
    const x = lastEnemy(state).x;
    state = stepCombat(state, GRENADE.flightMs + 500).state;
    expect(lastEnemy(state).attackMs).toBeNull();
    expect(lastEnemy(state).x).toBeLessThan(x);
    expect(sownAt(state, cell)).toBeNull();
  });

  it('a los jefes, el dano entero (O-06); a Creeper en el aire, nada', () => {
    let state = attacking(createMatch(0, 8, 'creeper', false, ALL));
    state = spawnEnemy(state, 'creeper', cell.lane, center);
    const creeper = lastEnemy(state);
    const hit = stepCombat(throwGrenade(state, cell), GRENADE.flightMs + GRENADE.fuseMs).state;
    expect(enemyById(hit, creeper.id).hp).toBeCloseTo(creeper.hp - GRENADE.damage);

    const flying: Enemy = { ...creeper, jump: { stage: 'air', from: 1, to: cell.lane, ms: 60_000, stageMs: 60_000 } };
    const inAir = throwGrenade({ ...state, enemies: [flying] }, cell);
    const missed = stepCombat(inAir, GRENADE.flightMs + GRENADE.fuseMs);
    expect(ofType(missed.events, 'grenadeExploded')[0].enemyIds).toEqual([]);
  });
});

describe('muro de hielo (O-05, O-09 a O-11)', () => {
  const cell = { lane: 2, col: 5 };

  it('ocupa tres carriles de una columna; en los bordes se mete dentro (O-09)', () => {
    expect(iceWallCells(cell)).toEqual([
      { lane: 1, col: 5 },
      { lane: 2, col: 5 },
      { lane: 3, col: 5 },
    ]);
    expect(iceWallCells({ lane: 0, col: 1 }).map((c) => c.lane)).toEqual([0, 1, 2]);
    expect(iceWallCells({ lane: 4, col: 1 }).map((c) => c.lane)).toEqual([2, 3, 4]);
    expect(iceWallCells({ lane: 2, col: 9 })).toEqual([]);
  });

  it('pone tres bloques con la vida de una disparadora de nivel 1 y gasta una carga (O-10)', () => {
    const { state, cells } = placeIceWall(attacking(), cell);
    expect(cells).toHaveLength(3);
    expect(ICE_WALL.hp).toBe(SHOOTER.hp);
    for (const c of cells) expect(iceAt(state, c)).toEqual({ kind: 'ice', hp: SHOOTER.hp, maxHp: SHOOTER.hp, ms: ICE_WALL.durationMs });
    expect(powerCharges(state, 'iceWall')).toBe(0);
    expect(sownMaxHp(createIceBlock())).toBe(SHOOTER.hp);
  });

  it('no se puede poner si alguna de sus casillas esta ocupada, ni fuera del tablero', () => {
    const state = put(attacking(), { lane: 3, col: 5 }, createPlant());
    expect(iceWallBlocker(state, cell)).toBe('occupied');
    expect(iceWallBlocker(state, { lane: 4, col: 5 })).toBe('occupied');
    expect(iceWallBlocker(state, { lane: 0, col: 5 })).toBeNull();
    expect(iceWallBlocker(state, { lane: 2, col: 10 })).toBe('off-board');
    expect(() => placeIceWall(state, cell)).toThrow();
    expect(powerCharges(state, 'iceWall')).toBe(1);
  });

  it('se derrite a los 10 s y deja las casillas libres', () => {
    const { state } = placeIceWall(attacking(), cell);
    const almost = stepCombat(state, ICE_WALL.durationMs - 50);
    expect(ofType(almost.events, 'iceMelted')).toHaveLength(0);
    const melted = stepCombat(almost.state, 50);
    expect(ofType(melted.events, 'iceMelted').map((e) => e.cell)).toEqual(iceWallCells(cell));
    for (const c of iceWallCells(cell)) expect(sownAt(melted.state, c)).toBeNull();
  });

  it('bloquea el paso: el gusano se para a morderlo y lo rompe', () => {
    let { state } = placeIceWall(attacking(), cell);
    state = spawnEnemy(state, 'worm', cell.lane, cell.col + 0.5 + ENEMIES.worm.reach + 0.05);
    const bites = stepCombat(state, 8000);
    expect(ofType(bites.events, 'bite').length).toBeGreaterThan(0);
    expect(ofType(bites.events, 'plantDestroyed').map((e) => e.cell)).toEqual([cell]);
    // Los otros dos siguen ahi.
    expect(iceAt(bites.state, { lane: 1, col: 5 })).not.toBeNull();
  });

  it('para el escupitajo y los versos como un escudo (O-11)', () => {
    expect(isShield(createIceBlock())).toBe(true);
    const lane: Array<Sown | null> = Array.from({ length: BOARD.columns }, () => null);
    lane[2] = createPlant();
    lane[5] = createIceBlock();
    expect(waveReach(lane, 8, 0)).toEqual({ cols: [5], blockedAt: 5 });
  });

  it('el poema entero no lo rompe si esta entero (como a todo, L-04)', () => {
    const block = createIceBlock();
    expect(poemHit(block, 9999)).toBeCloseTo(ICE_WALL.hp * (1 - ELK_CLONER.spareFraction));
  });

  it('no es un elemento: no se arrastra, no se infunde y la casilla esta ocupada', () => {
    const { state } = placeIceWall(attacking(), cell);
    expect(sownElement(createIceBlock())).toBeNull();
    expect(elementDragBlocker(state, cell)).toBe('no-element');
    expect(cardPlay({ ...state, balance: 999 }, 'shooter', cell).blocker).toBe('occupied');
    expect(cardPlay({ ...state, balance: 999 }, 'fire', cell).blocker).toBe('occupied');
  });

  it('el enemigo que esta dentro sale hacia atras si no paso la mitad, y hacia delante si la paso', () => {
    let state = attacking();
    state = spawnEnemy(state, 'worm', 2, cell.col + 0.7);
    const back = lastEnemy(state).id;
    state = spawnEnemy(state, 'worm', 1, cell.col + 0.3);
    const ahead = lastEnemy(state).id;
    state = spawnEnemy(state, 'worm', 3, cell.col + 1.3);
    const outside = lastEnemy(state).id;
    const half = enemyHalfLength({ kind: 'worm', clone: false });
    // De arriba abajo: el del carril 1 y luego el del 2.
    expect(iceWallPushes(state, cell)).toEqual([
      { enemyId: ahead, fromX: cell.col + 0.3, toX: cell.col - half },
      { enemyId: back, fromX: cell.col + 0.7, toX: cell.col + 1 + half },
    ]);
    const placed = placeIceWall(state, cell);
    expect(enemyById(placed.state, back).x).toBeCloseTo(cell.col + 1 + half);
    expect(enemyById(placed.state, ahead).x).toBeCloseTo(cell.col - half);
    expect(enemyById(placed.state, outside).x).toBeCloseTo(cell.col + 1.3);
    // El de atras se para a morder el hielo; el de delante sigue su camino.
    const after = stepCombat(placed.state, 3000).state;
    expect(enemyById(after, back).attackMs).not.toBeNull();
    expect(enemyById(after, ahead).x).toBeLessThan(cell.col - half);
  });

  it('el que paso la mitad sale hacia atras si justo detras del muro hay una disparadora', () => {
    const half = enemyHalfLength({ kind: 'worm', clone: false });
    const behind = { lane: 2, col: cell.col - 1 };
    const worm = (s: MatchState) => spawnEnemy(s, 'worm', 2, cell.col + 0.3);
    // Con una disparadora detras, hacia atras, y se para a morder el hielo.
    const guarded = worm(put(attacking(), behind, createPlant()));
    const id = lastEnemy(guarded).id;
    expect(iceWallPushes(guarded, cell)).toEqual([{ enemyId: id, fromX: cell.col + 0.3, toX: cell.col + 1 + half }]);
    expect(stepCombat(placeIceWall(guarded, cell).state, 3000).state.enemies[0].attackMs).not.toBeNull();
    // Una mina, un muro o una disparadora en otro carril o mas lejos no cuentan: hacia delante, como siempre.
    for (const [at, sown] of [
      [behind, createMine('fire')],
      [behind, createWall()],
      [{ lane: 1, col: cell.col - 1 }, createPlant()],
      [{ lane: 2, col: cell.col - 2 }, createPlant()],
    ] as const) {
      const state = worm(put(attacking(), at, sown));
      expect(iceWallPushes(state, cell)[0].toX).toBeCloseTo(cell.col - half);
    }
    // En la primera columna no hay detras: hacia delante.
    const edge = { lane: 2, col: 0 };
    const atEdge = spawnEnemy(attacking(), 'worm', 2, 0.3);
    expect(iceWallPushes(atEdge, edge)[0].toX).toBeCloseTo(-half);
  });

  it('a los jefes, igual (O-06); a Creeper en el aire no lo mueve', () => {
    let state = attacking(createMatch(0, 8, 'creeper', false, ALL));
    state = spawnEnemy(state, 'creeper', 2, cell.col + 0.6);
    const creeper = lastEnemy(state);
    const half = enemyHalfLength(creeper);
    expect(placeIceWall(state, cell).state.enemies[0].x).toBeCloseTo(cell.col + 1 + half);
    const flying: Enemy = { ...creeper, jump: { stage: 'air', from: 0, to: 2, ms: 500, stageMs: 500 } };
    expect(iceWallPushes({ ...state, enemies: [flying] }, cell)).toEqual([]);
  });
});

describe('partida guardada', () => {
  it('guarda las cargas gastadas, las granadas en vuelo y el muro de hielo, con sus niveles (version 8)', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(8);
    let state = put(attacking(createMatch(0, 4, 'creeper', false, all(10))), { lane: 0, col: 0 }, createPlant());
    state = relocatePlant(state, { lane: 0, col: 0 }, { lane: 4, col: 4 });
    state = throwGrenade(state, { lane: 2, col: 6 });
    state = placeIceWall(state, { lane: 2, col: 3 }).state;
    state = stepCombat(state, 500).state;
    const loaded = decodeSave(encodeSave(state, null, 1));
    expect(loaded?.match).toEqual(state);
    // Recolocar de nivel 10 trae tres cargas: le quedan dos.
    expect(loaded?.match.powers.map((slot) => slot.charges)).toEqual([2, 0, 0]);
    expect(loaded?.match.grenades[0]).toMatchObject(grenadeAt(10));
    expect(iceAt(loaded!.match, { lane: 2, col: 3 })?.maxHp).toBe(iceWallAt(10).hp);
  });

  it('no carga una partida con cargas de mas para su nivel, un nivel o un poder que no existen', () => {
    const state = attacking();
    const save = (powers: unknown) => JSON.stringify({ version: SAVE_VERSION, savedAt: 1, match: { ...state, powers }, pendingUnlock: null });
    expect(decodeSave(save([{ id: 'grenade', level: 1, charges: 1 }]))).not.toBeNull();
    expect(decodeSave(save([{ id: 'relocate', level: 5, charges: 2 }]))).not.toBeNull();
    expect(decodeSave(save([{ id: 'relocate', level: 4, charges: 2 }]))).toBeNull();
    expect(decodeSave(save([{ id: 'grenade', level: 10, charges: 2 }]))).toBeNull();
    expect(decodeSave(save([{ id: 'grenade', level: 11, charges: 1 }]))).toBeNull();
    expect(decodeSave(save([{ id: 'grenade', charges: 1 }]))).toBeNull();
    expect(decodeSave(save([{ id: 'meteor', level: 1, charges: 1 }]))).toBeNull();
  });
});

describe('niveles de los poderes (T-022, T-01)', () => {
  it('cada nivel suma lo suyo y el 5 y el 10 dan premio', () => {
    expect(POWER_LEVELS.max).toBe(10);
    expect([1, 4, 5, 9, 10].map(powerMilestones)).toEqual([0, 0, 1, 1, 2]);
  });

  it('la granada: +15 % de dano por nivel y +40 % en el 5 y el 10; mas alcance en el 5 y el 10', () => {
    expect(grenadeAt(1)).toEqual({ damage: FIRE.blastDamage, radius: GRENADE.blastRadius });
    expect(grenadeAt(2).damage).toBe(230);
    expect(grenadeAt(4).damage).toBe(290);
    expect(grenadeAt(5)).toEqual({ damage: 370, radius: 2.1 });
    expect(grenadeAt(9)).toEqual({ damage: 490, radius: 2.1 });
    expect(grenadeAt(10)).toEqual({ damage: 570, radius: 2.4 });
  });

  it('el muro de hielo: +20 % de vida por nivel y +35 % en el 5 y el 10; 4 casillas desde el 5 y 5 en el 10', () => {
    expect(iceWallAt(1)).toEqual({ hp: SHOOTER.hp, span: 3 });
    expect(iceWallAt(2).hp).toBe(360);
    expect(iceWallAt(4)).toEqual({ hp: 480, span: 3 });
    expect(iceWallAt(5)).toEqual({ hp: 585, span: 4 });
    expect(iceWallAt(9)).toEqual({ hp: 825, span: 4 });
    expect(iceWallAt(10)).toEqual({ hp: 930, span: BOARD.lanes });
    expect(ICE_WALL_MAX_SPAN).toBe(BOARD.lanes);
  });

  it('recolocar: cura un 5 % por nivel y trae una carga mas en el 5 y otra en el 10', () => {
    expect(relocateAt(1)).toEqual({ charges: 1, heal: 0 });
    expect(relocateAt(4).charges).toBe(1);
    expect(relocateAt(5).charges).toBe(2);
    expect(relocateAt(5).heal).toBeCloseTo(0.2);
    expect(relocateAt(10).charges).toBe(3);
    expect(relocateAt(10).heal).toBeCloseTo(0.45);
    // La granada y el muro siempre traen una.
    expect(chargesAt('grenade', 10)).toBe(1);
    expect(chargesAt('iceWall', 10)).toBe(1);
    expect(createMatch(0, 0, 'creeper', false, [{ id: 'relocate', level: 5 }]).powers).toEqual([{ id: 'relocate', level: 5, charges: 2 }]);
  });

  it('la granada de nivel 10 dana mas y alcanza dos carriles mas alla', () => {
    const cell = { lane: 2, col: 5 };
    // Dos carriles por debajo y casi en la misma columna: a 2,06 casillas, fuera del alcance del nivel 1 (1,8).
    const place = (level: number) => spawnEnemy(attacking(createMatch(0, 8, 'creeper', false, all(level))), 'creeper', 4, cell.col + 1);
    const hp = lastEnemy(place(1)).hp;
    const missed = stepCombat(throwGrenade(place(1), cell), GRENADE.flightMs + GRENADE.fuseMs).state;
    expect(lastEnemy(missed).hp).toBe(hp);
    const hit = stepCombat(throwGrenade(place(10), cell), GRENADE.flightMs + GRENADE.fuseMs).state;
    expect(lastEnemy(hit).hp).toBeCloseTo(hp - grenadeAt(10).damage);
  });

  it('el muro de nivel 5 ocupa 4 casillas, una mas arriba que abajo; el de nivel 10, la columna entera', () => {
    const five = attacking(createMatch(0, 4, 'creeper', false, all(5)));
    expect(powerLevel(five, 'iceWall')).toBe(5);
    expect(iceWallCellsIn(five, { lane: 2, col: 4 }).map((c) => c.lane)).toEqual([0, 1, 2, 3]);
    expect(iceWallCellsIn(five, { lane: 4, col: 4 }).map((c) => c.lane)).toEqual([1, 2, 3, 4]);
    const placed = placeIceWall(five, { lane: 3, col: 4 });
    expect(placed.cells).toHaveLength(4);
    for (const c of placed.cells) expect(iceAt(placed.state, c)).toMatchObject({ hp: 585, maxHp: 585 });
    // Algo sembrado en la cuarta casilla lo impide, aunque con nivel 1 cabria.
    expect(iceWallBlocker(put(five, { lane: 1, col: 4 }, createPlant()), { lane: 3, col: 4 })).toBe('occupied');
    expect(iceWallBlocker(put(attacking(), { lane: 1, col: 4 }, createPlant()), { lane: 3, col: 4 })).toBeNull();
    const ten = attacking(createMatch(0, 4, 'creeper', false, all(10)));
    expect(placeIceWall(ten, { lane: 0, col: 2 }).cells.map((c) => c.lane)).toEqual([0, 1, 2, 3, 4]);
  });

  it('recolocar con nivel cura la planta al llegar, sin pasarse de su vida entera, y gasta solo una carga', () => {
    const from = { lane: 1, col: 2 };
    const to = { lane: 3, col: 6 };
    const plant = { ...createPlant(), hp: 50 };
    const full = plantMaxHp(plant.shooter);
    const state = put(createMatch(0, 4, 'creeper', false, all(10)), from, plant);
    const moved = relocatePlant(state, from, to);
    expect(plantAt(moved, to)?.hp).toBeCloseTo(50 + full * 0.45);
    expect(powerCharges(moved, 'relocate')).toBe(2);
    expect(relocatedHp({ ...plant, hp: full - 10 }, 10)).toBe(full);
    // En el nivel 1 llega igual que estaba.
    expect(relocatedHp(plant, 1)).toBe(50);
  });
});
