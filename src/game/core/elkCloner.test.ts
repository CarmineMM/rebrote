import { describe, expect, it } from 'vitest';
import { BOARD, ELK_CLONER, ENEMIES, ICE, MINE, SHIELD, SHOOTER, VERSE } from '../config/balance';
import { decodeSave, encodeSave, SAVE_VERSION } from '../save';
import type { Cell } from './board';
import {
  BOSS_KINDS,
  enemyDamage,
  enemyMaxHp,
  enemyPower,
  isBoss,
  isDefeated,
  poemDamage,
  poemHit,
  poemWarning,
  spawnEnemy,
  stepCombat,
  verseDamage,
  type Bullet,
  type CombatEvent,
  type Enemy,
} from './combat';
import { createMatch, createMine, createPlant, createWall, sownAt, type MatchState, type Sown } from './match';
import { bossFirstSeenRound, bossRoundIndex, isBossPreparing, isBossRound, levelCapAt, roundScript, roundThreat, stepRound } from './rounds';
import { OUTBREAKS } from '../config/balance';
import { isOutbreakOpen, isOutbreakReady, outbreakOfBoss, outbreakScript, roundCount } from './outbreaks';
import { createShooter, infuse, plantMaxHp } from './plants';

/**
 * Elk Cloner, el Poeta (T-026; L-02 a L-06 cerradas el 21 y 22 nov 2026): avanza despacio y muerde, recita versos por su
 * carril y, cada pocos versos, el poema entero por los cinco carriles tras un aviso largo. Sus ondas las para el primer
 * escudo; el poema no mata lo que tenia la vida entera.
 */

const BROTE2 = 'elkCloner' as const;
const boss = ENEMIES.elkCloner;
const bossHp = enemyMaxHp('elkCloner');
const HOLE_X = BOARD.columns + 0.75;
const BOSS_ROUND = roundCount(BROTE2) - 1;
const shooterHp = plantMaxHp(createShooter());

function put(state: MatchState, cell: Cell, sown: Sown): MatchState {
  return { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? sown : p))) };
}

/** Partida en la ronda del jefe con Elk Cloner en `x` del carril `lane`; `over` cambia lo que haga falta de el. */
function withBoss(lane = 2, x = 7, over: Partial<Enemy> = {}): MatchState {
  const state = spawnEnemy(createMatch(1000, BOSS_ROUND, BROTE2), 'elkCloner', lane, x);
  const [elk] = state.enemies;
  return { ...state, enemies: [{ ...elk, ...over }] };
}

const elkOf = (state: MatchState) => state.enemies.find((e) => e.kind === 'elkCloner') as Enemy;

const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);

/** Avanza `totalMs` en pasos de `stepMs` y junta los eventos. */
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

/** Elk Cloner a punto de anunciar el poema entero: ya recito sus versos y le falta un paso para empezar el aviso. */
const aboutToWarn = { recital: { ms: 1, sung: ELK_CLONER.poemEvery, poemMs: null } } as const;
/** Elk Cloner a punto de soltar el poema entero. */
const aboutToRecite = { recital: { ms: 0, sung: ELK_CLONER.poemEvery, poemMs: 1 } } as const;

describe('jefe del brote 2', () => {
  it('es Elk Cloner, el brote ya no esta en preparacion y se abre al vencer a Creeper', () => {
    expect(outbreakScript(BROTE2).boss).toBe('elkCloner');
    expect(outbreakOfBoss('elkCloner')).toBe(BROTE2);
    expect(isOutbreakReady(BROTE2)).toBe(true);
    expect(isOutbreakOpen(BROTE2, [])).toBe(false);
    expect(isOutbreakOpen(BROTE2, ['creeper'])).toBe(true);
  });

  it('cada jefe es el de un brote, y cada brote listo tiene uno', () => {
    for (const kind of BOSS_KINDS) expect(outbreakOfBoss(kind), kind).not.toBeNull();
    for (const outbreak of OUTBREAKS) if (outbreak.boss) expect(isBoss(outbreak.boss)).toBe(true);
    expect(isBoss('minstrel')).toBe(false);
  });

  it('sale en la ultima ronda (la 8) y se le ve prepararse en la 6 y la 7', () => {
    expect(roundCount(BROTE2)).toBe(8);
    expect(bossRoundIndex(BROTE2)).toBe(BOSS_ROUND);
    expect(isBossRound(BROTE2, BOSS_ROUND)).toBe(true);
    expect(bossFirstSeenRound(BROTE2)).toBe(5);
    expect(isBossPreparing(createMatch(0, 5, BROTE2))).toBe(true);
    expect(isBossPreparing(createMatch(0, 6, BROTE2))).toBe(true);
    expect(isBossPreparing(createMatch(0, 4, BROTE2))).toBe(false);
    expect(isBossPreparing(createMatch(0, BOSS_ROUND, BROTE2))).toBe(true);
  });

  it('trae escolta de acorazados y Minstrel (L-06) y grita al mandarla', () => {
    const { groups } = roundScript(BROTE2, BOSS_ROUND);
    const bossAt = groups.findIndex((group) => group.kind === 'elkCloner');
    const escort = groups.slice(0, bossAt);
    expect(escort.some((group) => group.kind === 'copycatArmored' && group.shout === 'escort')).toBe(true);
    expect(escort.some((group) => group.kind === 'minstrel')).toBe(true);
    expect(groups[bossAt].lanes).toEqual([2]);
  });

  it('no tiene nivel: su vida y su mordisco llevan solo la fuerza de todos', () => {
    const state = spawnEnemy(createMatch(), 'elkCloner', 2, 7, undefined, 1, 9);
    expect(state.enemies[0].level).toBe(1);
    expect(bossHp).toBeCloseTo(boss.hp * enemyPower(1), 6);
    expect(enemyDamage(state.enemies[0])).toBeCloseTo(boss.biteDamage * enemyPower(1), 6);
    expect(verseDamage(state.enemies[0])).toBeCloseTo(boss.verseDamage * enemyPower(1), 6);
    expect(poemDamage()).toBeCloseTo(ELK_CLONER.poemDamage * enemyPower(1), 6);
  });

  it('su verso es mas fuerte que el de un Minstrel de nivel 1', () => {
    expect(verseDamage({ kind: 'elkCloner', level: 1 })).toBeGreaterThan(verseDamage({ kind: 'minstrel', level: 1 }));
  });
});

describe('avanza y muerde (L-05)', () => {
  it('avanza despacio por su carril aunque recite', () => {
    const { state, events } = run(withBoss(2, 7), 6000);
    expect(ofType(events, 'sang').length).toBeGreaterThan(0);
    expect(elkOf(state).x).toBeCloseTo(7 - boss.speed * 6, 3);
  });

  it('muerde lo que toca, tambien un muro', () => {
    const cell = { lane: 2, col: 5 };
    const state = put(withBoss(2, 5.5 + boss.reach), cell, createWall());
    const { state: after, events } = run(state, boss.firstBiteMs + 50);
    expect(ofType(events, 'bite')).toEqual([{ type: 'bite', enemyId: 1, cell }]);
    expect(sownAt(after, cell)?.hp).toBeCloseTo(SHIELD.wallHp - boss.biteDamage * enemyPower(1), 6);
  });

  it('si cruza el jardin se pierde la partida, queden las vidas que queden', () => {
    const { state, events } = run(withBoss(2, 0.02), 500);
    expect(ofType(events, 'enemyEscaped')).toMatchObject([{ kind: 'elkCloner' }]);
    expect(isDefeated(state)).toBe(true);
  });
});

describe('versos de su carril', () => {
  it('no recita antes de pisar el cesped', () => {
    const { events } = run(withBoss(2, HOLE_X + 0.5), boss.firstVerseMs + 200);
    expect(ofType(events, 'sang')).toEqual([]);
  });

  it('toma aire antes de cada verso, como el Minstrel, y lo suelta por su carril', () => {
    const { events } = run(withBoss(2, 7), boss.firstVerseMs + 50);
    const warned = events.findIndex((e) => e.type === 'verseWarned');
    const sang = events.findIndex((e) => e.type === 'sang');
    expect(warned).toBeGreaterThanOrEqual(0);
    expect(sang).toBeGreaterThan(warned);
    expect(ofType(events, 'sang')[0].verse).toMatchObject({ lane: 2, by: 'elkCloner', poem: false });
  });

  it('el verso cruza todo lo que no es escudo y lo para el primer escudo, que lo recibe', () => {
    let state = withBoss(2, 8.6, { recital: { ms: 1, sung: 0, poemMs: null } });
    state = put(state, { lane: 2, col: 6 }, createPlant());
    state = put(state, { lane: 2, col: 4 }, createWall());
    state = put(state, { lane: 2, col: 1 }, createPlant());
    const { state: after, events } = run(state, 4000);
    const hits = ofType(events, 'verseHit');
    expect(hits.map((h) => [h.cell.col, h.blocked])).toEqual([
      [6, false],
      [4, true],
    ]);
    const hit = verseDamage({ kind: 'elkCloner', level: 1 });
    expect(sownAt(after, { lane: 2, col: 6 })?.hp).toBeCloseTo(shooterHp - hit, 6);
    expect(sownAt(after, { lane: 2, col: 4 })?.hp).toBeCloseTo(SHIELD.wallHp - hit, 6);
    expect(sownAt(after, { lane: 2, col: 1 })?.hp).toBe(shooterHp);
  });

  it('ralentizado, tarda mas entre versos', () => {
    const slow = { amount: ICE.blastSlow, ms: 60_000 };
    const normal = ofType(run(withBoss(2, 8), 9000).events, 'sang').length;
    const frozen = ofType(run(withBoss(2, 8, { slow }), 9000).events, 'sang').length;
    expect(frozen).toBeLessThan(normal);
  });
});

describe('poema entero (L-03)', () => {
  it(`tras ${ELK_CLONER.poemEvery} versos anuncia el poema entero en vez del siguiente verso`, () => {
    const { events } = run(withBoss(2, 8.5), boss.firstVerseMs + boss.verseIntervalMs * ELK_CLONER.poemEvery + 100);
    const types = events.filter((e) => e.type === 'sang' || e.type === 'poemWarned').map((e) => e.type);
    expect(types).toEqual([...Array(ELK_CLONER.poemEvery).fill('sang'), 'poemWarned']);
    expect(ofType(events, 'poemWarned')[0]).toMatchObject({ enemyId: 1, warnMs: ELK_CLONER.poemWarnMs });
  });

  it('mientras lo anuncia no avanza ni muerde, aunque toque algo; el aviso no va mas lento frenado', () => {
    const cell = { lane: 2, col: 5 };
    const slow = { amount: ICE.blastSlow, ms: 60_000 };
    let state = withBoss(2, 5.5 + boss.reach, { ...aboutToWarn, slow });
    state = put(state, cell, createWall());
    const warned = run(state, 32);
    expect(ofType(warned.events, 'poemWarned')).toHaveLength(1);
    const during = run(warned.state, ELK_CLONER.poemWarnMs - 100);
    expect(ofType(during.events, 'bite')).toEqual([]);
    expect(elkOf(during.state).x).toBeCloseTo(5.5 + boss.reach, 6);
    expect(poemWarning(elkOf(during.state))).toBeGreaterThan(0);
    const after = run(during.state, 200);
    expect(ofType(after.events, 'poemRecited')).toHaveLength(1);
  });

  it('lo que le queda al aviso, de 1 a 0', () => {
    const start = run(withBoss(2, 7, aboutToWarn), 16).state;
    expect(poemWarning(elkOf(start))).toBeCloseTo(1, 1);
    const half = run(start, ELK_CLONER.poemWarnMs / 2).state;
    expect(poemWarning(elkOf(half))).toBeCloseTo(0.5, 1);
    expect(poemWarning(elkOf(withBoss()))).toBeNull();
  });

  it('suelta una onda por cada carril, todas desde el, y vuelve a sus versos', () => {
    const { state, events } = run(withBoss(2, 7, aboutToRecite), 16);
    const [recited] = ofType(events, 'poemRecited');
    expect(recited.verses.map((v) => v.lane)).toEqual([0, 1, 2, 3, 4]);
    expect(recited.verses.every((v) => v.poem && v.by === 'elkCloner' && v.x === 7)).toBe(true);
    expect(state.verses).toHaveLength(BOARD.lanes);
    expect(elkOf(state).recital).toEqual({ ms: boss.verseIntervalMs, sung: 0, poemMs: null });
  });

  it('tres carriles con escudo quedan a salvo y dos se llevan el golpe (ejemplo de la task)', () => {
    let state = withBoss(2, 8.6, aboutToRecite);
    // Disparadoras ya tocadas: el poema entero se las lleva si no las tapa un escudo.
    const damaged = { ...createPlant(), hp: shooterHp / 2 };
    for (let lane = 0; lane < BOARD.lanes; lane++) state = put(state, { lane, col: 2 }, damaged);
    for (const lane of [0, 2, 4]) state = put(state, { lane, col: 5 }, createWall());
    // Lo que tarda la onda en cruzar hasta la columna 2, antes de su siguiente verso.
    const { state: after } = run(state, 3500);
    for (const lane of [0, 2, 4]) {
      expect(sownAt(after, { lane, col: 2 })?.hp, `carril ${lane}`).toBe(damaged.hp);
      expect(sownAt(after, { lane, col: 5 })?.hp).toBeCloseTo(SHIELD.wallHp - poemDamage(), 6);
    }
    for (const lane of [1, 3]) expect(sownAt(after, { lane, col: 2 }), `carril ${lane}`).toBeNull();
  });

  it('no mata lo que tenia la vida entera: lo deja con una parte de su vida (L-04)', () => {
    let state = withBoss(2, 8.6, aboutToRecite);
    state = put(state, { lane: 0, col: 3 }, createPlant());
    state = put(state, { lane: 1, col: 3 }, createMine('fire'));
    state = put(state, { lane: 3, col: 3 }, { ...createPlant(), hp: shooterHp * 0.9 });
    const fused = createPlant(infuse(createShooter(), 'shield'));
    state = put(state, { lane: 4, col: 3 }, { ...fused, shooter: { ...fused.shooter, cannons: 3 }, hp: plantMaxHp({ ...fused.shooter, cannons: 3 }) });
    const { state: after, events } = run(state, 5000);
    expect(sownAt(after, { lane: 0, col: 3 })?.hp).toBeCloseTo(shooterHp * ELK_CLONER.spareFraction, 6);
    expect(sownAt(after, { lane: 1, col: 3 })?.hp).toBeCloseTo(MINE.hp * ELK_CLONER.spareFraction, 6);
    expect(sownAt(after, { lane: 3, col: 3 })).toBeNull();
    // Mucha vida: el golpe entero, sin rebajas.
    const big = plantMaxHp({ ...fused.shooter, cannons: 3 });
    expect(sownAt(after, { lane: 4, col: 3 })?.hp).toBeCloseTo(big - poemDamage(), 6);
    expect(ofType(events, 'plantDestroyed').map((e) => e.cell)).toEqual([{ lane: 3, col: 3 }]);
  });

  it('poemHit: todo el golpe a lo danado; a lo entero, lo que le deja su parte', () => {
    const plant = createPlant();
    expect(poemHit(plant, 9999)).toBeCloseTo(shooterHp * (1 - ELK_CLONER.spareFraction), 6);
    expect(poemHit(plant, 10)).toBe(10);
    expect(poemHit({ ...plant, hp: 299 }, 9999)).toBe(9999);
    expect(poemHit(createWall(), 100)).toBe(100);
  });

  it('una mina tocada que rompe el poema no explota', () => {
    let state = withBoss(2, 8.6, aboutToRecite);
    state = put(state, { lane: 1, col: 3 }, { ...createMine('fire'), hp: MINE.hp / 2 });
    const { events } = run(state, 3500);
    expect(ofType(events, 'plantDestroyed').map((e) => e.cell)).toEqual([{ lane: 1, col: 3 }]);
    expect(ofType(events, 'mineExploded')).toEqual([]);
  });
});

describe('al caer', () => {
  /** Una semilla a punto de dar al hocico de Elk Cloner. */
  const killing = (state: MatchState): Bullet => ({ id: 900, lane: 2, x: elkOf(state).x - boss.halfLength - 0.01, damage: 1e9, effect: null });

  it('caen todos, nadie deja copia y los versos en vuelo se deshacen', () => {
    let state = withBoss(2, 7);
    state = spawnEnemy(state, 'copycat', 0, 6);
    state = spawnEnemy(state, 'minstrel', 4, 6);
    state = { ...state, verses: [{ id: 50, lane: 4, x: 4, damage: 15, by: 'minstrel', poem: false }, { id: 51, lane: 1, x: 5, damage: 200, by: 'elkCloner', poem: true }] };
    state = { ...state, bullets: [killing(state)] };
    const { state: after, events } = stepCombat(state, 16);
    expect(ofType(events, 'enemyKilled').map((e) => e.kind).sort()).toEqual(['copycat', 'elkCloner', 'minstrel']);
    expect(ofType(events, 'cloned')).toEqual([]);
    expect(ofType(events, 'verseGone').map((e) => e.verseId).sort()).toEqual([50, 51]);
    expect(after.enemies).toEqual([]);
    expect(after.verses).toEqual([]);
  });

  it('se gana el brote aunque falten refuerzos por salir', () => {
    let state = createMatch(1000, BOSS_ROUND, BROTE2);
    state = { ...state, round: { ...state.round, phase: 'attack', elapsedMs: 0 } };
    const bossAt = roundScript(BROTE2, BOSS_ROUND).groups.findIndex((group) => group.kind === 'elkCloner');
    const atMs = roundScript(BROTE2, BOSS_ROUND).groups[bossAt].atMs;
    state = stepRound(state, atMs + 10, HOLE_X, () => 0).state;
    expect(state.round.released).toBe(bossAt + 1);
    // Cae el jefe: con el, todos los demas.
    state = { ...state, bullets: [killing(state)] };
    state = stepCombat(state, 16).state;
    expect(state.enemies).toEqual([]);
    const step = stepRound(state, 16, HOLE_X, () => 0);
    expect(step.spawned).toEqual([]);
    expect(step.events.map((e) => e.type)).toEqual(['roundCleared', 'won']);
  });

  it('mientras vive, sus refuerzos siguen saliendo', () => {
    let state = createMatch(1000, BOSS_ROUND, BROTE2);
    state = { ...state, round: { ...state.round, phase: 'attack', elapsedMs: 0 } };
    const { groups } = roundScript(BROTE2, BOSS_ROUND);
    const bossAt = groups.findIndex((group) => group.kind === 'elkCloner');
    state = stepRound(state, groups[bossAt + 1].atMs + 10, HOLE_X, () => 0).state;
    expect(state.round.released).toBe(bossAt + 2);
  });
});

describe('partida guardada (T-026)', () => {
  it('guarda su recital, el aviso del poema y los versos del poema en vuelo (version 6)', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(6);
    let state = withBoss(2, 7, { recital: { ms: 0, sung: 3, poemMs: 1200 } });
    state = { ...state, verses: [{ id: 60, lane: 0, x: 6, damage: poemDamage(), by: 'elkCloner', poem: true }] };
    expect(decodeSave(encodeSave(state, null, 1))?.match).toEqual(state);
  });

  it('una sin recital o con un verso que no dice quien lo recita no se entiende', () => {
    const state = withBoss();
    const { recital: _recital, ...old } = state.enemies[0];
    expect(decodeSave(encodeSave({ ...state, enemies: [old as Enemy] }, null, 1))).toBeNull();
    const verse = { id: 61, lane: 0, x: 6, damage: 15 };
    expect(decodeSave(encodeSave({ ...state, verses: [verse as never] }, null, 1))).toBeNull();
  });
});

describe('guion del brote 2 (L-01, L-07 y L-08)', () => {
  it('8 rondas, con el escudo en la 2 y el Minstrel en la 3, y tope de nivel 10 desde la 1', () => {
    expect(roundCount(BROTE2)).toBe(8);
    expect(roundScript(BROTE2, 1).unlocks).toEqual(['shield']);
    const first = (kind: Enemy['kind']) => outbreakScript(BROTE2).rounds.findIndex((round) => round.groups.some((group) => group.kind === kind));
    expect(first('minstrel')).toBe(2);
    expect(first('copycat')).toBe(0);
    for (let i = 0; i < roundCount(BROTE2); i++) expect(levelCapAt(BROTE2, i)).toBe(10);
  });

  it('la dificultad sube de ronda en ronda hasta el combate final', () => {
    for (let i = 1; i < BOSS_ROUND; i++) expect(roundThreat(BROTE2, i), `ronda ${i + 1}`).toBeGreaterThan(roundThreat(BROTE2, i - 1));
  });

  it('es mayor que la del final del brote 1: empieza mas fuerte y acaba mas fuerte', () => {
    const creeperLast = roundCount('creeper') - 2;
    expect(roundThreat(BROTE2, 0)).toBeGreaterThan(roundThreat('creeper', 0));
    expect(roundThreat(BROTE2, BOSS_ROUND - 1)).toBeGreaterThan(roundThreat('creeper', creeperLast));
    expect(roundThreat(BROTE2, BOSS_ROUND - 2)).toBeGreaterThan(roundThreat('creeper', creeperLast));
  });
});

describe('numeros', () => {
  it('va mas despacio que Creeper y que todas sus tropas', () => {
    expect(boss.speed).toBeLessThan(ENEMIES.creeper.speed);
    for (const kind of ['copycat', 'copycatArmored', 'copycatSpitter', 'minstrel'] as const) expect(boss.speed).toBeLessThan(ENEMIES[kind].speed);
  });

  it('el aviso del poema da tiempo a sembrar: dura mas que la recarga de una disparadora y que cruzar una casilla un verso', () => {
    expect(ELK_CLONER.poemWarnMs).toBeGreaterThan(SHOOTER.fireIntervalMs * 2);
    expect(ELK_CLONER.poemWarnMs).toBeGreaterThan(1000 / VERSE.speed);
  });

  it('el poema hace mas dano que una disparadora sola tiene de vida, salvo por L-04', () => {
    expect(poemDamage()).toBeGreaterThan(shooterHp * (1 - ELK_CLONER.spareFraction));
  });
});
