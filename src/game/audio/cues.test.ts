import { describe, expect, it } from 'vitest';
import { BOARD, MINE } from '../config/balance';
import type { Cell } from '../core/board';
import { spawnEnemy, stepCombat, type Bullet, type CombatEvent } from '../core/combat';
import { createMatch, createMine, createPlant, type MatchState, type Mine } from '../core/match';
import { createShooter, type ElementType } from '../core/plants';
import { FIRST_OUTBREAK, roundCount } from '../core/outbreaks';
import { VOICE_EVERY, actionCue, combatCues, mineTicks, roundCues, voiceCue } from './cues';

const ids = (cues: ReadonlyArray<{ id: string }>) => cues.map((cue) => cue.id);

function withMine(state: MatchState, cell: Cell, over: Partial<Mine> = {}, element: ElementType = 'fire'): MatchState {
  const plants = state.plants.map((lane, l) => lane.map((p, c) => (l === cell.lane && c === cell.col ? { ...createMine(element), ...over } : p)));
  return { ...state, plants };
}

const bullet = (id: number, element: ElementType | null): Bullet => ({
  id,
  lane: 1,
  x: 3,
  damage: 10,
  effect: element === 'fire' ? { element, burn: { dps: 1, ms: 1000 } } : element === 'ice' ? { element, slow: { amount: 0.5, ms: 1000 } } : null,
});

const shot = (cannon: number, element: ElementType | null, col = 2): CombatEvent => ({ type: 'shot', cell: { lane: 1, col }, bullet: bullet(100 + cannon, element), cannon });

describe('combatCues', () => {
  const empty = createMatch();

  it('una planta de 3 canones suena como un solo disparo, con el sonido de su elemento', () => {
    expect(ids(combatCues([shot(0, null), shot(1, null), shot(2, null)], empty))).toEqual(['shot']);
    expect(ids(combatCues([shot(0, 'fire'), shot(1, 'fire')], empty))).toEqual(['shotFire']);
    expect(ids(combatCues([shot(0, 'ice')], empty))).toEqual(['shotIce']);
  });

  it('el impacto suena segun la semilla, y a metal en un acorazado si la semilla es normal', () => {
    let state = spawnEnemy(empty, 'armored', 1, 5);
    const armored = state.enemies[0].id;
    state = spawnEnemy(state, 'worm', 2, 5);
    const worm = state.enemies[1].id;
    state = { ...state, bullets: [bullet(1, null), bullet(2, 'fire'), bullet(3, 'ice')] };
    const hit = (bulletId: number, enemyId: number): CombatEvent => ({ type: 'hit', bulletId, enemyId, at: { x: 5, y: 1.5 } });
    expect(ids(combatCues([hit(1, worm), hit(2, worm), hit(3, worm), hit(1, armored), hit(2, armored)], state))).toEqual([
      'hit',
      'hitFire',
      'hitIce',
      'hitArmor',
      'hitFire',
    ]);
  });

  it('un impacto de una semilla recien disparada en el mismo paso tambien sabe su elemento', () => {
    const state = spawnEnemy(empty, 'worm', 1, 3);
    const events: CombatEvent[] = [shot(0, 'ice'), { type: 'hit', bulletId: 100, enemyId: state.enemies[0].id, at: { x: 3, y: 1.5 } }];
    expect(ids(combatCues(events, state))).toEqual(['shotIce', 'hitIce']);
  });

  it('los enemigos que caen en una explosion no suenan aparte; los demas, si', () => {
    const events: CombatEvent[] = [
      { type: 'mineExploded', cell: { lane: 1, col: 4 }, element: 'fire', enemyIds: [7, 8] },
      { type: 'enemyKilled', enemyId: 7, kind: 'worm', at: { x: 4.5, y: 1.5 } },
      { type: 'enemyKilled', enemyId: 8, kind: 'worm', at: { x: 4.6, y: 1.5 } },
      { type: 'enemyKilled', enemyId: 9, kind: 'spitter', at: { x: 7, y: 3.5 } },
    ];
    expect(ids(combatCues(events, empty))).toEqual(['fireExplosion', 'enemyKilled']);
    expect(ids(combatCues([{ type: 'mineExploded', cell: { lane: 0, col: 1 }, element: 'ice', enemyIds: [] }], empty))).toEqual(['iceExplosion']);
  });

  it('si cae el Creeper suena su derrota y no la de sus copias', () => {
    const events: CombatEvent[] = [
      { type: 'enemyKilled', enemyId: 1, kind: 'creeper', at: { x: 5, y: 2.5 } },
      { type: 'enemyKilled', enemyId: 2, kind: 'worm', at: { x: 6, y: 1.5 } },
      { type: 'enemyKilled', enemyId: 3, kind: 'worm', at: { x: 6, y: 3.5 } },
    ];
    expect(ids(combatCues(events, empty))).toEqual(['creeperDefeated']);
  });

  it('mordiscos, escupitajos, plantas destruidas, vidas perdidas y saltos del Creeper', () => {
    const state = spawnEnemy(empty, 'creeper', 2, 6);
    const creeper = state.enemies[0].id;
    const events: CombatEvent[] = [
      { type: 'bite', enemyId: 3, cell: { lane: 0, col: 1 } },
      { type: 'spat', enemyId: 4, spit: { id: 5, lane: 0, x: 6, damage: 1 } },
      { type: 'spitHit', spitId: 5, cell: { lane: 0, col: 2 } },
      { type: 'spitGone', spitId: 6 },
      { type: 'bulletGone', bulletId: 9 },
      { type: 'plantDestroyed', cell: { lane: 0, col: 1 } },
      { type: 'enemyEscaped', enemyId: 3, lane: 0, kind: 'worm' },
      { type: 'jumpWarned', enemyId: creeper, from: 2, to: 1, warnMs: 900 },
      { type: 'jumped', enemyId: creeper, from: 2, to: 1, copies: [] },
      { type: 'landed', enemyId: creeper, lane: 1, cell: null },
      { type: 'mineArmed', cell: { lane: 4, col: 4 } },
    ];
    expect(ids(combatCues(events, state))).toEqual([
      'bite',
      'spit',
      'spitHit',
      'plantDestroyed',
      'enemyEscaped',
      'creeperWarn',
      'creeperTakeoff',
      'creeperLand',
    ]);
  });

  it('lo de la izquierda del tablero suena a la izquierda y lo de la derecha, a la derecha', () => {
    const [left] = combatCues([shot(0, null, 0)], empty);
    const [right] = combatCues([shot(0, null, BOARD.columns - 1)], empty);
    expect(left.pan).toBeLessThan(0);
    expect(right.pan).toBeGreaterThan(0);
  });

  it('con 15 disparadoras de 3 canones en el combate de verdad, un disparo por planta', () => {
    let state = createMatch();
    const plants = state.plants.map((lane) => lane.map((_, c) => (c < 3 ? createPlant({ ...createShooter(), cannons: 3 }) : null)));
    state = { ...state, plants };
    for (let lane = 0; lane < BOARD.lanes; lane++) state = spawnEnemy(state, 'worm', lane, 8, 1e9);
    const step = stepCombat(state, 16);
    const shots = step.events.filter((event) => event.type === 'shot').length;
    expect(shots).toBe(45);
    expect(ids(combatCues(step.events, state)).filter((id) => id === 'shot')).toHaveLength(15);
  });
});

describe('roundCues', () => {
  it('suena el inicio del ataque y la ronda superada, pero no tras la ultima: ahi suena la victoria', () => {
    const rounds = roundCount(FIRST_OUTBREAK);
    expect(ids(roundCues([{ type: 'attackStarted', index: 0 }], rounds))).toEqual(['attackStarted']);
    expect(ids(roundCues([{ type: 'roundCleared', index: 0, seeds: 0 }, { type: 'roundStarted', index: 1 }], rounds))).toEqual(['roundCleared']);
    expect(ids(roundCues([{ type: 'roundCleared', index: rounds - 1, seeds: 0 }, { type: 'won' }], rounds))).toEqual([]);
  });

  it('la ultima ronda es la del brote en curso: en uno de 3, la tercera ya no suena como ronda superada (T-018)', () => {
    expect(ids(roundCues([{ type: 'roundCleared', index: 1, seeds: 0 }], 3))).toEqual(['roundCleared']);
    expect(ids(roundCues([{ type: 'roundCleared', index: 2, seeds: 0 }, { type: 'won' }], 3))).toEqual([]);
  });
});

describe('mineTicks', () => {
  const cell = { lane: 2, col: 3 };

  it('suena al armarse y cada vez que baja el numero de la cuenta atras', () => {
    const waiting = withMine(createMatch(), cell);
    const armed = withMine(createMatch(), cell, { fuseMs: MINE.countdownMs });
    expect(ids(mineTicks(waiting, armed))).toEqual(['mineTick']);
    // Dentro del mismo segundo no vuelve a sonar.
    const later = withMine(createMatch(), cell, { fuseMs: MINE.countdownMs - 300 });
    expect(mineTicks(armed, later)).toEqual([]);
    // Al pasar al siguiente numero, si.
    const next = withMine(createMatch(), cell, { fuseMs: MINE.countdownMs - 1000 - 10 });
    expect(ids(mineTicks(later, next))).toEqual(['mineTick']);
  });

  it('una mina dormida, una que no cambia (pausa) o una que ya exploto no suenan', () => {
    const waiting = withMine(createMatch(), cell);
    expect(mineTicks(waiting, waiting)).toEqual([]);
    const armed = withMine(createMatch(), cell, { fuseMs: 1500 });
    expect(mineTicks(armed, armed)).toEqual([]);
    expect(mineTicks(armed, createMatch())).toEqual([]);
  });
});

describe('actionCue', () => {
  it('sembrar, infundir con cada elemento, fusionar y subir de nivel suenan; seleccionar no', () => {
    expect(actionCue({ type: 'sow', card: 'shooter' }, 2)?.id).toBe('sow');
    expect(actionCue({ type: 'sow', card: 'fire' }, 2)?.id).toBe('sow');
    expect(actionCue({ type: 'infuse', element: 'fire', withMine: false }, 2)?.id).toBe('infuseFire');
    expect(actionCue({ type: 'infuse', element: 'ice', withMine: true }, 2)?.id).toBe('infuseIce');
    expect(actionCue({ type: 'fuse' }, 2)?.id).toBe('fuse');
    expect(actionCue({ type: 'levelUp', level: 3 }, 2)?.id).toBe('levelUp');
    expect(actionCue({ type: 'pick' }, 2)).toBeNull();
  });

  it('subir a un nivel con premio (5, 10, 15 y 20) suena a premio', () => {
    for (const level of [5, 10, 15, 20]) expect(actionCue({ type: 'levelUp', level }, 2)?.id).toBe('unlock');
    for (const level of [2, 4, 6, 11]) expect(actionCue({ type: 'levelUp', level }, 2)?.id).toBe('levelUp');
  });
});

describe('voz de las viñetas (T-031)', () => {
  it('cada personaje suena con su voz, desde el centro', () => {
    expect(voiceCue('boxer', 'Hola', 0, 1)).toEqual({ id: 'voiceBoxer', pan: 0 });
    expect(voiceCue('patty', 'Hola', 0, 1)).toEqual({ id: 'voicePatty', pan: 0 });
  });

  it('suena una de cada pocas letras, y los espacios y signos van callados', () => {
    const text = '¡No hay tiempo!';
    const voiced: number[] = [];
    for (let i = 0; i < Array.from(text).length; i++) if (voiceCue('boxer', text, i, i + 1)) voiced.push(i);
    // Letras: N o h a y t i e m p o; suenan la 1.a (N), la 4.a (a), la 7.a (i) y la 10.a (p).
    expect(voiced).toEqual([1, 5, 9, 12]);
    expect(VOICE_EVERY).toBe(3);
    expect(voiceCue('boxer', text, 0, 1)).toBeNull();
    expect(voiceCue('boxer', text, 3, 4)).toBeNull();
  });

  it('un salto grande suena una sola vez, y sin letras nuevas no suena', () => {
    expect(voiceCue('patty', 'Soy Patty. Las plantas son cosa mía.', 0, 30)).toEqual({ id: 'voicePatty', pan: 0 });
    expect(voiceCue('patty', 'Hola', 4, 4)).toBeNull();
    expect(voiceCue('patty', 'Hola', 4, 9)).toBeNull();
  });
});
