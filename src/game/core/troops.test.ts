import { describe, expect, it } from 'vitest';
import { CLONE, ENEMIES, MINE, SHIELD, SHOOTER, VERSE } from '../config/balance';
import { decodeSave, encodeSave, SAVE_VERSION } from '../save';
import type { Cell } from './board';
import {
  enemyDamage,
  enemyFront,
  enemyMaxHp,
  enemyPower,
  enemyReach,
  enemyReward,
  hasTarget,
  hpFraction,
  leavesClone,
  spawnEnemy,
  stepCombat,
  type Bullet,
  type CombatEvent,
  type Enemy,
  type EnemyKind,
} from './combat';
import { createMatch, createMine, createPlant, createWall, type MatchState, type Sown } from './match';
import { createShooter, plantMaxHp } from './plants';

/**
 * Tropas del brote 2 (T-025; F-01 a F-06 decididas el 22 nov 2026 con la recomendacion): los copiones dejan una copia
 * pequena y debil al caer, una sola vez, y el juglar recita versos, ondas que cruzan el carril por encima de las plantas
 * hasta el primer escudo.
 */

/** Vida de un enemigo que no muere durante la prueba. */
const TOUGH = 1e9;
const minstrel = ENEMIES.minstrel;
/** Lo que quita un verso de un juglar de nivel 1, con la fuerza de todos (T-010). */
const verseHit = enemyDamage({ kind: 'minstrel', level: 1 });
const shooterHp = plantMaxHp(createShooter());

function put(state: MatchState, cell: Cell, sown: Sown): MatchState {
  return { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? sown : p))) };
}

/** Una semilla a punto de dar al enemigo del carril que tiene el hocico en `front`. */
const bulletAt = (id: number, lane: number, front: number, damage = 10): Bullet => ({ id, lane, x: front - 0.01, damage, effect: null });

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
function runUntil<T extends CombatEvent['type']>(state: MatchState, type: T, limitMs = 120_000, stepMs = 16) {
  let current = state;
  for (let t = 0; t < limitMs; t += stepMs) {
    const step = stepCombat(current, stepMs);
    current = step.state;
    const event = ofType(step.events, type)[0];
    if (event) return { state: current, event, t: t + stepMs };
  }
  throw new Error(`No paso "${type}" en ${limitMs} ms`);
}

const last = (state: MatchState): Enemy => state.enemies[state.enemies.length - 1];
const hpAt = (state: MatchState, cell: Cell): number | undefined => state.plants[cell.lane][cell.col]?.hp;

describe('copiones (F-01)', () => {
  it('son las tres tropas del brote 1 con sus numeros', () => {
    expect(ENEMIES.copycat).toEqual(ENEMIES.worm);
    expect(ENEMIES.copycatArmored).toEqual(ENEMIES.armored);
    expect(ENEMIES.copycatSpitter).toEqual(ENEMIES.spitter);
  });

  it('al caer dejan en su sitio una copia pequena y debil, que ya no deja otra', () => {
    let state = spawnEnemy(createMatch(), 'copycat', 2, 5, 1, 1, 3);
    const parent = last(state);
    state = { ...state, bullets: [bulletAt(900, 2, enemyFront(parent))] };
    const fell = stepCombat(state, 16);
    const [killed] = ofType(fell.events, 'enemyKilled');
    const [cloned] = ofType(fell.events, 'cloned');
    expect(killed).toMatchObject({ enemyId: parent.id, kind: 'copycat', clone: false });
    expect(cloned.parentId).toBe(parent.id);
    expect(fell.events.indexOf(killed)).toBeLessThan(fell.events.indexOf(cloned));
    const clone = cloned.clone;
    expect(clone).toMatchObject({ kind: 'copycat', lane: 2, level: 3, clone: true, attackMs: null, burn: null, slow: null });
    expect(clone.x).toBeCloseTo(enemyFront(parent) + ENEMIES.copycat.halfLength - 0.004, 2);
    expect(clone.hp).toBeCloseTo(enemyMaxHp('copycat', 3) * CLONE.hp, 9);
    expect(hpFraction(clone)).toBeCloseTo(1, 9);
    expect(fell.state.enemies).toEqual([clone]);

    // La copia cae y no deja nada.
    const weak = { ...fell.state, enemies: [{ ...clone, hp: 1 }], bullets: [bulletAt(901, 2, enemyFront(clone))] };
    const gone = stepCombat(weak, 16);
    expect(ofType(gone.events, 'enemyKilled')).toEqual([expect.objectContaining({ enemyId: clone.id, clone: true })]);
    expect(ofType(gone.events, 'cloned')).toEqual([]);
    expect(gone.state.enemies).toEqual([]);
  });

  it('las tres dejan copia; las del brote 1, el juglar y las copias, no', () => {
    const kinds: EnemyKind[] = ['copycat', 'copycatArmored', 'copycatSpitter', 'worm', 'armored', 'spitter', 'minstrel', 'creeper'];
    expect(kinds.filter((kind) => leavesClone({ kind, clone: false }))).toEqual(['copycat', 'copycatArmored', 'copycatSpitter']);
    expect(leavesClone({ kind: 'copycat', clone: true })).toBe(false);
    for (const kind of ['worm', 'armored', 'spitter', 'minstrel'] as const) {
      let state = spawnEnemy(createMatch(), kind, 1, 6, 1);
      state = { ...state, bullets: [bulletAt(900, 1, enemyFront(last(state)))] };
      const step = stepCombat(state, 16);
      expect(ofType(step.events, 'enemyKilled'), kind).toHaveLength(1);
      expect(ofType(step.events, 'cloned'), kind).toEqual([]);
    }
  });

  it('la copia es mas pequena: su hocico va mas atras y muerde de mas cerca, con la boca donde la pondria su tipo', () => {
    const clone: Enemy = { ...last(spawnEnemy(createMatch(), 'copycat', 0, 5)), clone: true };
    expect(5 - enemyFront(clone)).toBeCloseTo(ENEMIES.copycat.halfLength * CLONE.size, 9);
    const reach = enemyReach(clone);
    expect(reach).toBeCloseTo(ENEMIES.copycat.reach - ENEMIES.copycat.halfLength * (1 - CLONE.size), 9);
    expect(reach - ENEMIES.copycat.halfLength * CLONE.size).toBeCloseTo(ENEMIES.copycat.reach - ENEMIES.copycat.halfLength, 9);
    // Avanza hasta tener la planta a su alcance y entonces muerde, con la mitad de fuerza.
    let state = put(createMatch(), { lane: 0, col: 2 }, createPlant());
    state = { ...state, enemies: [{ ...clone, x: 4 }] };
    const { state: biting, event } = runUntil(state, 'bite', 20_000);
    expect(event.cell).toEqual({ lane: 0, col: 2 });
    expect(biting.enemies[0].x - 2.5).toBeLessThanOrEqual(reach + 1e-9);
    expect(biting.enemies[0].x - 2.5).toBeGreaterThan(reach - 0.01);
    expect(hpAt(biting, { lane: 0, col: 2 })).toBeCloseTo(shooterHp - enemyDamage({ kind: 'copycat', level: 1 }) * CLONE.damage, 9);
    expect(enemyDamage(clone)).toBeCloseTo(enemyDamage({ kind: 'copycat', level: 1 }) * CLONE.damage, 9);
  });

  it('la copia del escupidor escupe, mas flojo', () => {
    let state = put(createMatch(), { lane: 3, col: 1 }, createPlant());
    state = spawnEnemy(state, 'copycatSpitter', 3, 3.5, 1);
    state = { ...state, bullets: [bulletAt(900, 3, enemyFront(last(state)))] };
    const { event } = runUntil(state, 'spat', 20_000);
    expect(event.spit.damage).toBeCloseTo(enemyDamage({ kind: 'copycatSpitter', level: 1 }) * CLONE.damage, 9);
  });

  it('hereda su nivel y lo acelerado, pero no la quemadura ni el frio', () => {
    let state = spawnEnemy(createMatch(), 'copycatArmored', 4, 7, 0.01, 1.25, 4);
    state = { ...state, enemies: [{ ...last(state), burn: { dps: 100, ms: 2000 }, slow: { amount: 0.5, ms: 2000 } }] };
    const step = stepCombat(state, 16);
    const [cloned] = ofType(step.events, 'cloned');
    expect(cloned.clone).toMatchObject({ kind: 'copycatArmored', level: 4, haste: 1.25, burn: null, slow: null, clone: true });
  });

  it('la copia da menos moneda que su tipo', () => {
    expect(enemyReward({ kind: 'copycat', clone: false })).toBe(ENEMIES.copycat.reward);
    expect(enemyReward({ kind: 'copycatArmored', clone: true })).toBe(CLONE.reward);
    expect(CLONE.reward).toBeLessThan(Math.min(ENEMIES.copycat.reward, ENEMIES.copycatSpitter.reward));
  });

  it('una mina que tumba a muchos copiones solo deja las copias de los primeros', () => {
    const mineCell = { lane: 2, col: 4 };
    let state = put(createMatch(), mineCell, { ...createMine('fire'), fuseMs: 10 });
    const spots: Array<[number, number]> = [
      [1, 4.5],
      [2, 5.5],
      [3, 4.5],
      [1, 5.3],
      [3, 5.3],
      [2, 5.9],
    ];
    for (const [lane, x] of spots) state = spawnEnemy(state, 'copycat', lane, x, 1);
    const step = stepCombat(state, 16);
    const exploded = ofType(step.events, 'mineExploded')[0];
    expect(exploded.enemyIds).toHaveLength(spots.length);
    expect(ofType(step.events, 'enemyKilled')).toHaveLength(spots.length);
    const cloned = ofType(step.events, 'cloned');
    expect(cloned).toHaveLength(CLONE.maxPerBlast);
    expect(cloned.map((c) => c.parentId)).toEqual(exploded.enemyIds.slice(0, CLONE.maxPerBlast));
    expect(step.state.enemies).toHaveLength(CLONE.maxPerBlast);
    expect(MINE.blastRadius).toBeGreaterThanOrEqual(Math.hypot(5.9 - 4.5, 0));
  });

  it('si cae el jefe, no sale ninguna copia', () => {
    let state = spawnEnemy(createMatch(), 'creeper', 2, 6, 1);
    const boss = last(state);
    state = spawnEnemy(state, 'copycat', 0, 5, 1);
    const copycat = last(state);
    state = spawnEnemy(state, 'copycatSpitter', 4, 7);
    state = { ...state, bullets: [bulletAt(900, 2, enemyFront(boss)), bulletAt(901, 0, enemyFront(copycat))] };
    const step = stepCombat(state, 16);
    expect(ofType(step.events, 'enemyKilled')).toHaveLength(3);
    expect(ofType(step.events, 'cloned')).toEqual([]);
    expect(step.state.enemies).toEqual([]);
  });
});

describe('juglar (F-02 a F-06)', () => {
  /** Carril 2 con lo sembrado que se diga y un juglar que no muere en `x`. */
  function lane2(sown: Array<[number, Sown]>, x: number, over: Partial<Enemy> = {}): MatchState {
    let state = createMatch();
    for (const [col, s] of sown) state = put(state, { lane: 2, col }, s);
    state = spawnEnemy(state, 'minstrel', 2, x, TOUGH);
    return { ...state, enemies: state.enemies.map((e) => ({ ...e, ...over })) };
  }

  it('se para a su distancia de lo primero sembrado y se hincha antes de cada verso (F-04)', () => {
    const start = lane2([[1, createPlant()]], 8);
    const warned = runUntil(start, 'verseWarned', 30_000);
    const stopX = 1.5 + minstrel.range;
    expect(warned.state.enemies[0].x).toBeLessThanOrEqual(stopX);
    expect(warned.state.enemies[0].x).toBeGreaterThan(stopX - 0.01);
    const sang = runUntil(warned.state, 'sang', 10_000);
    expect(sang.t).toBeGreaterThanOrEqual(minstrel.warnMs - 16);
    expect(sang.t).toBeLessThanOrEqual(minstrel.warnMs + 16);
    expect(sang.event.verse).toMatchObject({ lane: 2, damage: verseHit });
    expect(sang.event.verse.x).toBeCloseTo(sang.state.enemies[0].x, 9);
    // El siguiente: vuelve a avisar `warnMs` antes.
    const again = runUntil(sang.state, 'verseWarned', 10_000);
    expect(again.t).toBeGreaterThanOrEqual(minstrel.verseIntervalMs - minstrel.warnMs - 16);
    expect(again.t).toBeLessThanOrEqual(minstrel.verseIntervalMs - minstrel.warnMs + 16);
  });

  it('el primer verso tambien avisa: tarda mas que el aviso', () => {
    expect(minstrel.firstVerseMs).toBeGreaterThan(minstrel.warnMs);
    expect(minstrel.verseIntervalMs).toBeGreaterThan(minstrel.warnMs);
  });

  it('la onda recorre el carril y quita un poco de vida a cada planta y mina que atraviesa, una vez', () => {
    const start = lane2(
      [
        [0, createMine('ice')],
        [1, createPlant()],
        [2, createPlant()],
        [3, createPlant()],
      ],
      6.9,
    );
    const sang = runUntil(start, 'sang', 10_000);
    const { state, events } = run(sang.state, 4_000);
    const hits = ofType(events, 'verseHit').filter((e) => e.verseId === sang.event.verse.id);
    expect(hits.map((e) => e.cell.col)).toEqual([3, 2, 1, 0]);
    expect(hits.every((e) => !e.blocked)).toBe(true);
    for (const col of [1, 2, 3]) expect(hpAt(state, { lane: 2, col })).toBeCloseTo(shooterHp - verseHit, 9);
    expect(hpAt(state, { lane: 2, col: 0 })).toBeCloseTo(MINE.hp - verseHit, 9);
    // Poco: una mina aguanta varios versos (F-06).
    expect(verseHit * 4).toBeLessThan(MINE.hp);
    expect(ofType(events, 'verseGone').map((e) => e.verseId)).toContain(sang.event.verse.id);
    expect(state.verses.some((v) => v.id === sang.event.verse.id)).toBe(false);
  });

  it('va a su velocidad: cruza una casilla en 1 / VERSE.speed segundos', () => {
    const sang = runUntil(lane2([[0, createPlant()]], 4), 'sang', 10_000);
    const after = stepCombat(sang.state, 400).state;
    const verse = after.verses.find((v) => v.id === sang.event.verse.id) as { x: number };
    expect(sang.event.verse.x - verse.x).toBeCloseTo(VERSE.speed * 0.4, 6);
  });

  it('se para en el primer escudo, que recibe el dano: lo de detras no sufre nada', () => {
    const plants: Array<[number, Sown]> = [
      [1, createPlant()],
      [2, createPlant()],
      [3, createPlant()],
    ];
    const start = lane2([...plants, [4, createWall()]], 7.5);
    const sang = runUntil(start, 'sang', 10_000);
    const { state, events } = run(sang.state, 4_000);
    const hits = ofType(events, 'verseHit').filter((e) => e.verseId === sang.event.verse.id);
    expect(hits).toEqual([expect.objectContaining({ cell: { lane: 2, col: 4 }, blocked: true })]);
    expect(hpAt(state, { lane: 2, col: 4 })).toBeCloseTo(SHIELD.wallHp - verseHit, 9);
    for (const col of [1, 2, 3]) expect(hpAt(state, { lane: 2, col })).toBe(shooterHp);
    expect(ofType(events, 'verseGone').some((e) => e.verseId === sang.event.verse.id)).toBe(false);
    expect(state.verses.some((v) => v.id === sang.event.verse.id)).toBe(false);
  });

  it('con el muro entre la primera y las otras dos, la primera recibe dano y las otras no', () => {
    const start = lane2(
      [
        [1, createPlant()],
        [2, createPlant()],
        [3, createWall()],
        [4, createPlant()],
      ],
      7.5,
    );
    const sang = runUntil(start, 'sang', 10_000);
    const { state } = run(sang.state, 4_000);
    expect(hpAt(state, { lane: 2, col: 4 })).toBeCloseTo(shooterHp - verseHit, 9);
    expect(hpAt(state, { lane: 2, col: 3 })).toBeCloseTo(SHIELD.wallHp - verseHit, 9);
    expect(hpAt(state, { lane: 2, col: 2 })).toBe(shooterHp);
    expect(hpAt(state, { lane: 2, col: 1 })).toBe(shooterHp);
  });

  it('una disparadora con escudo tambien la para (F-05)', () => {
    const guard = createPlant({ ...createShooter(), element: 'shield' });
    const start = lane2(
      [
        [1, createPlant()],
        [3, guard],
      ],
      6.9,
    );
    const sang = runUntil(start, 'sang', 10_000);
    const { state, events } = run(sang.state, 4_000);
    expect(ofType(events, 'verseHit').filter((e) => e.verseId === sang.event.verse.id)).toEqual([
      expect.objectContaining({ cell: { lane: 2, col: 3 }, blocked: true }),
    ]);
    expect(hpAt(state, { lane: 2, col: 3 })).toBeCloseTo(guard.hp - verseHit, 9);
    expect(hpAt(state, { lane: 2, col: 1 })).toBe(shooterHp);
  });

  it('una planta que muere al paso de la onda no la para', () => {
    const start = lane2(
      [
        [1, createPlant()],
        [3, { ...createPlant(), hp: 1 }],
      ],
      6.9,
    );
    const sang = runUntil(start, 'sang', 10_000);
    const { state, events } = run(sang.state, 4_000);
    expect(ofType(events, 'plantDestroyed')).toEqual([expect.objectContaining({ cell: { lane: 2, col: 3 } })]);
    expect(hpAt(state, { lane: 2, col: 3 })).toBeUndefined();
    expect(hpAt(state, { lane: 2, col: 1 })).toBeCloseTo(shooterHp - verseHit, 9);
  });

  it('dos juglares en el mismo carril: cada onda hace su dano por separado', () => {
    let start = lane2([[1, createPlant()]], 4.9);
    start = spawnEnemy(start, 'minstrel', 2, 4.95, TOUGH);
    const { state, events } = run(start, 3_200);
    const sung = ofType(events, 'sang');
    expect(sung).toHaveLength(2);
    const hits = ofType(events, 'verseHit');
    expect(hits).toHaveLength(2);
    expect(new Set(hits.map((h) => h.verseId)).size).toBe(2);
    expect(hpAt(state, { lane: 2, col: 1 })).toBeCloseTo(shooterHp - 2 * verseHit, 9);
  });

  it('sin nada sembrado en su carril no ataca y avanza como una tropa normal', () => {
    let start = createMatch();
    start = put(start, { lane: 1, col: 2 }, createPlant());
    start = spawnEnemy(start, 'minstrel', 2, 9.75, TOUGH);
    const { state, events } = run(start, 45_000, 50);
    expect(ofType(events, 'sang')).toEqual([]);
    expect(ofType(events, 'verseWarned')).toEqual([]);
    expect(ofType(events, 'bite')).toEqual([]);
    expect(ofType(events, 'enemyEscaped')).toEqual([expect.objectContaining({ kind: 'minstrel', lane: 2 })]);
    expect(state.lives).toBe(start.lives - 1);
  });

  it('no se para antes de pisar el cesped, asi que las disparadoras de su carril le pueden dar', () => {
    const start = lane2([[8, createPlant()]], 12);
    const warned = runUntil(start, 'verseWarned', 30_000);
    const juglar = warned.state.enemies[0];
    expect(enemyFront(juglar)).toBeLessThanOrEqual(9);
    expect(hasTarget(warned.state.enemies, { lane: 2, col: 8 })).toBe(true);
    const shot = runUntil(warned.state, 'hit', 5_000);
    expect(shot.event.enemyId).toBe(juglar.id);
  });

  it('ralentizado por el hielo tarda mas entre versos, en la misma proporcion', () => {
    const plant: Array<[number, Sown]> = [[0, createPlant()]];
    const gap = (over: Partial<Enemy>) => {
      const first = runUntil(lane2(plant, 3.9, over), 'sang', 20_000);
      const second = runUntil(first.state, 'sang', 20_000);
      return second.t;
    };
    const normal = gap({});
    const slowed = gap({ slow: { amount: 0.5, ms: 1e9 } });
    expect(normal).toBeCloseTo(minstrel.verseIntervalMs, -2);
    expect(slowed).toBeCloseTo(minstrel.verseIntervalMs * 2, -2);
  });

  it('su verso pega mas con el nivel, como el resto de tropas', () => {
    expect(enemyDamage({ kind: 'minstrel', level: 5 })).toBeCloseTo(minstrel.verseDamage * enemyPower(5), 9);
    expect(enemyMaxHp('minstrel', 5)).toBeCloseTo(minstrel.hp * enemyPower(5), 9);
  });

  it('no muerde aunque tenga la planta encima', () => {
    const { events } = run(lane2([[4, createPlant()]], 4.9), 5_000);
    expect(ofType(events, 'bite')).toEqual([]);
    expect(ofType(events, 'sang').length).toBeGreaterThan(0);
    expect(SHOOTER.hp).toBe(shooterHp);
  });
});

describe('partida guardada (T-025)', () => {
  it('acepta copias y versos en vuelo (desde la version 5)', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(5);
    let state = put(createMatch(), { lane: 2, col: 1 }, createPlant());
    state = spawnEnemy(state, 'copycat', 0, 6);
    state = spawnEnemy(state, 'minstrel', 2, 5);
    state = { ...state, enemies: [{ ...state.enemies[0], clone: true }, state.enemies[1]], verses: [{ id: 77, lane: 2, x: 3.2, damage: verseHit, by: 'minstrel', poem: false }] };
    const loaded = decodeSave(encodeSave(state, null, 1));
    expect(loaded?.match).toEqual(state);
  });

  it('una sin versos, o con un enemigo que no dice si es copia, no se entiende', () => {
    const state = spawnEnemy(createMatch(), 'copycat', 0, 6);
    const { verses: _verses, ...withoutVerses } = state;
    expect(decodeSave(encodeSave(withoutVerses as MatchState, null, 1))).toBeNull();
    const { clone: _clone, ...oldEnemy } = state.enemies[0];
    expect(decodeSave(encodeSave({ ...state, enemies: [oldEnemy as Enemy] }, null, 1))).toBeNull();
  });
});
