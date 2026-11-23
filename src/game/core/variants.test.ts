import { describe, expect, it } from 'vitest';
import { BOARD, ENEMY_LEVELS, OUTBREAKS } from '../config/balance';
import { decodeSave, encodeSave } from '../save';
import { BOSS_KINDS, enemyDamage, enemyFront, enemyMaxHp, enemyReward, isBoss, isHidden, spawnEnemy, stepCombat, type CombatEvent, type Enemy, type EnemyKind } from './combat';
import { createMatch, type MatchState } from './match';
import { isOutbreakOpen, isOutbreakReady, outbreakFromParam, outbreakNumber, outbreakScript, outbreaksBefore, type OutbreakId } from './outbreaks';
import { routeStops } from './route';
import { carriedFeatures, newFeaturesAt, roundUnlocks, startAttack, stepRound, unlockedAt, type Feature } from './rounds';
import { recruitingOutbreaks, troopHome, troopVariant } from './variants';

/**
 * Tropas reutilizadas con variante de color (T-041; MT-01 a MT-05 cerradas el 23 nov 2026 con la recomendacion) y el brote 4,
 * que T-041 dejo en preparacion y T-042 abrio con su jefe. Una tropa de un brote anterior sale en el brote que la recluta con su
 * variante, sin cambiar nada mas.
 */

const MORRIS: OutbreakId = 'morris';
const TROOPS: readonly EnemyKind[] = ['worm', 'armored', 'spitter', 'copycat', 'copycatArmored', 'copycatSpitter', 'minstrel', 'lurker', 'lurkerSpitter', 'lurkerArmored', 'skipper'];
const ALL_FEATURES: readonly Feature[] = ['shooter', 'levelUp', 'fireMine', 'fireInfuse', 'iceMine', 'iceInfuse', 'fuse', 'shield', 'shieldInfuse', 'uproot'];
const last = (state: MatchState): Enemy => state.enemies[state.enemies.length - 1];
const ofType = <T extends CombatEvent['type']>(events: readonly CombatEvent[], type: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
/** Todo lo que dice como es un enemigo, menos su id y su variante. */
const rules = ({ id: _id, variant: _variant, ...rest }: Enemy) => rest;

describe('brote de origen de cada tropa (T-041)', () => {
  it('cada tropa es del primer brote cuyo guion la saca', () => {
    expect(TROOPS.map(troopHome)).toEqual(['creeper', 'creeper', 'creeper', 'elkCloner', 'elkCloner', 'elkCloner', 'elkCloner', 'brain', 'brain', 'brain', 'brain']);
  });

  it('todas las tropas y todos los jefes tienen uno', () => {
    for (const kind of [...TROOPS, ...BOSS_KINDS]) expect(troopHome(kind), kind).not.toBeNull();
  });
});

describe('variante de una tropa (T-041, MT-01)', () => {
  it('en el brote 4, las once tropas que vuelven salen con la variante de Morris', () => {
    for (const kind of TROOPS) expect(troopVariant(kind, MORRIS), kind).toBe(MORRIS);
  });

  it('en su brote de origen, y en los brotes que no reclutan, se ven como siempre', () => {
    for (const outbreak of ['creeper', 'elkCloner', 'brain'] as const) {
      for (const kind of TROOPS) expect(troopVariant(kind, outbreak), `${kind} en ${outbreak}`).toBeNull();
    }
  });

  it('los jefes nunca vuelven con otro color', () => {
    for (const boss of BOSS_KINDS) expect(troopVariant(boss, MORRIS)).toBeNull();
  });

  it('solo el brote 4 recluta, por ahora', () => {
    expect(recruitingOutbreaks()).toEqual([MORRIS]);
  });

  it('la partida pone la variante al sacar una tropa: rejugar el brote 1 tras vencer el 4 saca los gusanos de su color', () => {
    expect(last(spawnEnemy(createMatch(0, 0, MORRIS), 'worm', 2, 6)).variant).toBe(MORRIS);
    const replay = createMatch(undefined, 0, 'creeper', true, undefined, 1, carriedFeatures('creeper', OUTBREAKS.map((o) => o.id)));
    expect(last(spawnEnemy(replay, 'worm', 2, 6)).variant).toBeNull();
    // Se puede pedir otra a mano (el catalogo y las galerias).
    expect(last(spawnEnemy(createMatch(), 'worm', 2, 6, undefined, 1, 1, MORRIS)).variant).toBe(MORRIS);
  });

  it('las rondas del brote 4 sacan sus tropas con la variante', () => {
    let state = startAttack(createMatch(undefined, 0, MORRIS));
    const spawned: Enemy[] = [];
    for (let t = 0; t < 60_000; t += 500) {
      const step = stepRound(state, 500, BOARD.columns + 0.5, () => 0.5);
      spawned.push(...step.spawned);
      state = step.state;
    }
    expect(spawned.length).toBeGreaterThan(10);
    expect(spawned.every((enemy) => enemy.variant === MORRIS)).toBe(true);
  });

  it('la copia de un Copycat de variante sale con la misma variante', () => {
    let state = spawnEnemy(createMatch(0, 1, MORRIS), 'copycat', 2, 5, 1, 1, 3);
    const parent = last(state);
    expect(parent.variant).toBe(MORRIS);
    state = { ...state, bullets: [{ id: 900, lane: 2, x: enemyFront(parent) - 0.01, damage: 10, effect: null }] };
    const [cloned] = ofType(stepCombat(state, 16).events, 'cloned');
    expect(cloned.clone).toMatchObject({ kind: 'copycat', clone: true, variant: MORRIS });
  });
});

describe('una tropa de variante sigue siendo la misma (MT-03 y MT-04)', () => {
  it('mismo tipo, mismas reglas y mismos numeros que en su brote de origen: solo cambia la variante', () => {
    for (const kind of TROOPS) {
      const home = troopHome(kind) as OutbreakId;
      for (const level of [1, 5, 9]) {
        const original = last(spawnEnemy(createMatch(0, 0, home), kind, 1, 7, undefined, 1, level));
        const recruited = last(spawnEnemy(createMatch(0, 0, MORRIS), kind, 1, 7, undefined, 1, level));
        expect(original.variant).toBeNull();
        expect(recruited.variant).toBe(MORRIS);
        expect(rules(recruited), `${kind} ${level}`).toEqual(rules(original));
        expect(enemyMaxHp(recruited.kind, recruited.level)).toBe(enemyMaxHp(original.kind, original.level));
        expect(enemyDamage(recruited)).toBe(enemyDamage(original));
        expect(enemyReward(recruited)).toBe(enemyReward(original));
      }
    }
  });

  it('los Lurker siguen llegando ocultos y el Skipper, saltando', () => {
    const state = createMatch(0, 0, MORRIS);
    for (const kind of ['lurker', 'lurkerSpitter', 'lurkerArmored'] as const) expect(isHidden(last(spawnEnemy(state, kind, 1, 8))), kind).toBe(true);
    expect(last(spawnEnemy(state, 'skipper', 1, 8)).hop?.stage).toBe('rest');
  });

  it('la partida guardada conserva de que brote es la variante', () => {
    let match = startAttack(createMatch(undefined, 0, MORRIS));
    match = spawnEnemy(match, 'lurker', 3, 7);
    match = spawnEnemy(match, 'worm', 1, 6, undefined, 1, 1, null);
    const save = decodeSave(encodeSave(match, null, 0));
    expect(save?.match.enemies.map((enemy) => enemy.variant)).toEqual([MORRIS, null]);
    // Una variante que no es un brote no se entiende: la guardada se ignora.
    const broken = { ...match, enemies: [{ ...match.enemies[0], variant: 'nadie' }] } as unknown as MatchState;
    expect(decodeSave(encodeSave(broken, null, 0))).toBeNull();
  });
});

describe('brote 4 (T-041; abierto con su jefe en T-042)', () => {
  const script = outbreakScript(MORRIS);

  it('va despues de Brain, con Morris de jefe, y se abre al vencer a Brain', () => {
    expect(outbreakNumber(MORRIS)).toBe(4);
    expect(outbreaksBefore(MORRIS).map((o) => o.id)).toEqual(['creeper', 'elkCloner', 'brain']);
    expect(script.boss).toBe('morris');
    expect(isOutbreakReady(MORRIS)).toBe(true);
    expect(isOutbreakOpen(MORRIS, ['creeper', 'elkCloner'])).toBe(false);
    expect(isOutbreakOpen(MORRIS, ['creeper', 'elkCloner', 'brain'])).toBe(true);
    // La ruta lo da por el que toca y, vencido, por superado; despues, "Proximamente" el brote 5.
    expect(routeStops(['creeper', 'elkCloner', 'brain']).at(-3)).toEqual({ kind: 'outbreak', id: MORRIS, standing: 'open', current: true });
    expect(routeStops(['creeper', 'elkCloner', 'brain', MORRIS]).slice(-3)).toEqual([
      { kind: 'outbreak', id: MORRIS, standing: 'defeated', current: false },
      { kind: 'soon', number: 5 },
      { kind: 'final' },
    ]);
  });

  it('en desarrollo se juega con ?brote=4', () => {
    expect(outbreakFromParam('4')).toBe(MORRIS);
    expect(outbreakFromParam('morris')).toBe(MORRIS);
  });

  it('empieza con 600 monedas (el doble que el brote 3) y el tablero vacio', () => {
    expect(script.startingBalance).toBe(600);
    expect(script.startingBalance).toBe(outbreakScript('brain').startingBalance * 2);
    const match = createMatch(undefined, 0, MORRIS);
    expect(match.balance).toBe(600);
    expect(match.plants.flat().every((sown) => sown === null)).toBe(true);
    expect(match.enemies).toEqual([]);
  });

  it('trae desbloqueado desde la ronda 1 todo lo de los brotes anteriores, tambien la infusion del escudo', () => {
    expect([...unlockedAt(MORRIS, 0)].sort()).toEqual([...ALL_FEATURES].sort());
  });

  it('no desbloquea nada nuevo en ninguna ronda', () => {
    script.rounds.forEach((round, index) => {
      expect(round.unlocks, `ronda ${index + 1}`).toEqual([]);
      expect(newFeaturesAt(MORRIS, index)).toEqual([]);
      expect(roundUnlocks(MORRIS, index)).toEqual([]);
    });
  });

  it('su guion saca todas las tropas de los brotes anteriores, ninguna nueva, y de jefe solo a Morris', () => {
    const kinds = new Set(script.rounds.flatMap((round) => round.groups.map((group) => group.kind)));
    for (const outbreak of outbreaksBefore(MORRIS)) {
      const theirs = TROOPS.filter((kind) => troopHome(kind) === outbreak.id);
      expect(theirs.length, outbreak.id).toBeGreaterThan(0);
      for (const kind of theirs) expect(kinds.has(kind), `${kind} de ${outbreak.id}`).toBe(true);
    }
    const troops = [...kinds].filter((kind) => kind !== 'morris');
    expect(troops.every((kind) => !isBoss(kind) && troopHome(kind) !== MORRIS)).toBe(true);
    expect(troopHome('morris')).toBe(MORRIS);
  });

  it('ninguna tropa pasa del nivel 9 (MR-01): el 10, solo la escolta de su combate', () => {
    script.rounds.forEach((round, index) => {
      const table = round.levels ?? ENEMY_LEVELS.tables.early;
      expect(Math.max(...Object.keys(table).map(Number))).toBeLessThanOrEqual(9);
      const bossRound = round.groups.some((group) => group.kind === 'morris');
      for (const group of round.groups) expect(group.level ?? 1, `ronda ${index + 1}`).toBeLessThanOrEqual(bossRound ? 10 : 9);
    });
  });
});
