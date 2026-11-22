import { describe, expect, it } from 'vitest';
import { BOARD, ELK_CLONER, ENEMIES, MINE } from '../config/balance';
import type { Cell } from '../core/board';
import { spawnEnemy, stepCombat, type Bullet, type CombatEvent, type Enemy } from '../core/combat';
import { createMatch, createMine, createPlant, createWall, type MatchState, type Mine } from '../core/match';
import { createShooter, type ElementType, type MineElement } from '../core/plants';
import { FIRST_OUTBREAK, roundCount } from '../core/outbreaks';
import { KEY_EVERY, VOICE_EVERY, actionCue, combatCues, keystrokeCue, mineTicks, roundCues, shopCue, voiceCue } from './cues';
import { panAt } from './voices';

const ids = (cues: ReadonlyArray<{ id: string }>) => cues.map((cue) => cue.id);

function withMine(state: MatchState, cell: Cell, over: Partial<Mine> = {}, element: MineElement = 'fire'): MatchState {
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
      { type: 'enemyKilled', enemyId: 7, kind: 'worm', clone: false, at: { x: 4.5, y: 1.5 } },
      { type: 'enemyKilled', enemyId: 8, kind: 'worm', clone: false, at: { x: 4.6, y: 1.5 } },
      { type: 'enemyKilled', enemyId: 9, kind: 'spitter', clone: false, at: { x: 7, y: 3.5 } },
    ];
    expect(ids(combatCues(events, empty))).toEqual(['fireExplosion', 'enemyKilled']);
    expect(ids(combatCues([{ type: 'mineExploded', cell: { lane: 0, col: 1 }, element: 'ice', enemyIds: [] }], empty))).toEqual(['iceExplosion']);
  });

  it('si cae el Creeper suena su derrota y no la de sus copias', () => {
    const events: CombatEvent[] = [
      { type: 'enemyKilled', enemyId: 1, kind: 'creeper', clone: false, at: { x: 5, y: 2.5 } },
      { type: 'enemyKilled', enemyId: 2, kind: 'worm', clone: false, at: { x: 6, y: 1.5 } },
      { type: 'enemyKilled', enemyId: 3, kind: 'worm', clone: false, at: { x: 6, y: 3.5 } },
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

describe('escudo (T-024)', () => {
  const at = { lane: 1, col: 2 };
  const put = (state: MatchState, sown: MatchState['plants'][number][number]): MatchState => ({
    ...state,
    plants: state.plants.map((lane, l) => lane.map((p, c) => (l === at.lane && c === at.col ? sown : p))),
  });

  it('un mordisco o un escupitajo que da a un escudo suena a madera', () => {
    const bite: CombatEvent = { type: 'bite', enemyId: 1, cell: at };
    const spitHit: CombatEvent = { type: 'spitHit', spitId: 9, cell: at };
    for (const shield of [createWall(), createPlant(createShooter())]) {
      const state = put(createMatch(), shield);
      const wood = shield.kind === 'wall';
      expect(ids(combatCues([bite, spitHit], state)), shield.kind).toEqual(wood ? ['wallHit', 'wallHit'] : ['bite', 'spitHit']);
    }
    const shielded = put(createMatch(), createPlant({ ...createShooter(), element: 'shield' }));
    expect(ids(combatCues([bite], shielded))).toEqual(['wallHit']);
  });

  it('el muro que se rompe suena a madera que se parte; una planta, como siempre', () => {
    const destroyed: CombatEvent = { type: 'plantDestroyed', cell: at };
    expect(ids(combatCues([destroyed], put(createMatch(), createWall())))).toEqual(['wallBreak']);
    expect(ids(combatCues([destroyed], put(createMatch(), createPlant({ ...createShooter(), element: 'shield' }))))).toEqual(['plantDestroyed']);
  });

  it('la de escudo dispara y da como una normal', () => {
    expect(ids(combatCues([shot(0, null)], createMatch()))).toEqual(['shot']);
  });

  it('sembrar el muro e infundir escudo suenan distinto de los demas', () => {
    expect(actionCue({ type: 'sow', card: 'shield' }, 2)?.id).toBe('sowWall');
    expect(actionCue({ type: 'infuse', element: 'shield', dragged: false }, 2)?.id).toBe('infuseShield');
    expect(actionCue({ type: 'infuse', element: 'shield', dragged: true }, 2)?.id).toBe('infuseShield');
  });
});

describe('tropas del brote 2 (T-025)', () => {
  const lane = 2;
  const cell = (col: number) => ({ lane, col });

  it('el juglar suena al tomar aire y al soltar su verso, desde donde esta', () => {
    const state = spawnEnemy(createMatch(), 'minstrel', lane, 7);
    const juglar = state.enemies[0];
    const verse = { id: 50, lane, x: juglar.x, damage: 15, by: 'minstrel' as const, poem: false };
    const cues = combatCues(
      [
        { type: 'verseWarned', enemyId: juglar.id },
        { type: 'sang', enemyId: juglar.id, verse },
      ],
      state,
    );
    expect(ids(cues)).toEqual(['minstrelInhale', 'verse']);
    expect(cues[0].pan).toBeGreaterThan(0);
  });

  it('el verso suena bajito en cada cosa que cruza y a madera en el escudo que lo para; al salir, nada', () => {
    const state = createMatch();
    const events: CombatEvent[] = [
      { type: 'verseHit', verseId: 50, cell: cell(5), blocked: false },
      { type: 'verseHit', verseId: 50, cell: cell(4), blocked: false },
      { type: 'verseHit', verseId: 50, cell: cell(3), blocked: true },
      { type: 'verseGone', verseId: 51 },
    ];
    expect(ids(combatCues(events, state))).toEqual(['verseHit', 'verseHit', 'wallHit']);
  });

  it('la copia que sale de un copion suena a copiarse; si cae el jefe, no', () => {
    const state = spawnEnemy(createMatch(), 'copycat', lane, 5);
    const copycat = state.enemies[0];
    const clone = { ...copycat, id: 99, clone: true };
    const killed: CombatEvent = { type: 'enemyKilled', enemyId: copycat.id, kind: 'copycat', clone: false, at: { x: 5, y: 2.5 } };
    expect(ids(combatCues([killed, { type: 'cloned', parentId: copycat.id, clone }], state))).toEqual(['enemyKilled', 'clone']);
    const boss: CombatEvent = { type: 'enemyKilled', enemyId: 1, kind: 'creeper', clone: false, at: { x: 5, y: 1.5 } };
    expect(ids(combatCues([boss, killed, { type: 'cloned', parentId: copycat.id, clone }], state))).toEqual(['creeperDefeated']);
  });

  it('la semilla normal que da a un acorazado copion suena a metal', () => {
    const state = { ...spawnEnemy(createMatch(), 'copycatArmored', 1, 5), bullets: [bullet(7, null)] };
    const hit: CombatEvent = { type: 'hit', bulletId: 7, enemyId: state.enemies[0].id, at: { x: 4.5, y: 1.5 } };
    expect(ids(combatCues([hit], state))).toEqual(['hitArmor']);
  });

  it('en una partida de verdad, un juglar frente a una planta suena con cada verso', () => {
    let state = createMatch();
    state = { ...state, plants: state.plants.map((row, l) => row.map((p, c) => (l === lane && c === 1 ? createPlant(createShooter()) : p))) };
    state = spawnEnemy(state, 'minstrel', lane, 4.9, 1e9);
    const heard: string[] = [];
    for (let t = 0; t < 4_000; t += 16) {
      const before = state;
      const step = stepCombat(state, 16);
      state = step.state;
      heard.push(...ids(combatCues(step.events, before)));
    }
    expect(heard.filter((id) => id === 'minstrelInhale')).toHaveLength(1);
    expect(heard.filter((id) => id === 'verse')).toHaveLength(1);
    expect(heard.filter((id) => id === 'verseHit')).toHaveLength(1);
  });
});

describe('Elk Cloner (T-026)', () => {
  const lane = 2;
  const withBoss = (over: Partial<Enemy> = {}): MatchState => {
    const state = spawnEnemy(createMatch(0, 7, 'elkCloner'), 'elkCloner', lane, 7.5, 1e9);
    return { ...state, enemies: [{ ...state.enemies[0], ...over }] };
  };
  const run = (state: MatchState, totalMs: number) => {
    const heard: string[] = [];
    let current = state;
    for (let t = 0; t < totalMs; t += 16) {
      const before = current;
      const step = stepCombat(current, 16);
      current = step.state;
      heard.push(...ids(combatCues(step.events, before)));
    }
    return heard;
  };

  it('toma aire y recita sus versos como el juglar', () => {
    const heard = run(withBoss(), ENEMIES.elkCloner.firstVerseMs + 50);
    expect(heard).toContain('minstrelInhale');
    expect(heard).toContain('verse');
  });

  it('el aviso del poema entero suena al empezar, una vez, y el poema al soltarlo, desde donde esta', () => {
    const heard = run(withBoss({ recital: { ms: 1, sung: ELK_CLONER.poemEvery, poemMs: null } }), ELK_CLONER.poemWarnMs + 100);
    expect(heard.filter((id) => id === 'poemWarn')).toHaveLength(1);
    expect(heard.filter((id) => id === 'poem')).toHaveLength(1);
    expect(heard.indexOf('poemWarn')).toBeLessThan(heard.indexOf('poem'));
    const state = withBoss();
    const cue = combatCues([{ type: 'poemWarned', enemyId: state.enemies[0].id, warnMs: ELK_CLONER.poemWarnMs }], state)[0];
    expect(cue.pan).toBeGreaterThan(0);
  });

  it('si cae, suena su derrota y no la de los que caen con el', () => {
    let state = withBoss();
    state = spawnEnemy(state, 'copycat', 0, 6);
    const boss = state.enemies[0];
    const events: CombatEvent[] = [
      { type: 'enemyKilled', enemyId: boss.id, kind: 'elkCloner', clone: false, at: { x: boss.x, y: 2.5 } },
      { type: 'enemyKilled', enemyId: state.enemies[1].id, kind: 'copycat', clone: false, at: { x: 6, y: 0.5 } },
    ];
    expect(ids(combatCues(events, state))).toEqual(['elkClonerDefeated']);
  });
});

describe('shopCue (T-022)', () => {
  it('comprar suena a compra y mejorar, a mejora; los niveles 5 y 10, a premio, como en las plantas', () => {
    expect(shopCue({ type: 'buy' })).toEqual({ id: 'purchase', pan: 0 });
    expect(shopCue({ type: 'upgrade', level: 2 }).id).toBe('powerUpgrade');
    expect(shopCue({ type: 'upgrade', level: 9 }).id).toBe('powerUpgrade');
    for (const level of [5, 10]) expect(shopCue({ type: 'upgrade', level }).id).toBe('unlock');
  });

  it('subir el nivel base (T-023) suena a mejora, y llegar al 5, el premio de las plantas, a desbloqueo', () => {
    for (const level of [2, 3, 4]) expect(shopCue({ type: 'baseLevel', level })).toEqual({ id: 'powerUpgrade', pan: 0 });
    expect(shopCue({ type: 'baseLevel', level: 5 }).id).toBe('unlock');
  });
});

describe('actionCue', () => {
  it('sembrar, infundir con cada elemento, fusionar y subir de nivel suenan; seleccionar no', () => {
    expect(actionCue({ type: 'sow', card: 'shooter' }, 2)?.id).toBe('sow');
    expect(actionCue({ type: 'sow', card: 'fire' }, 2)?.id).toBe('sow');
    expect(actionCue({ type: 'infuse', element: 'fire', dragged: false }, 2)?.id).toBe('infuseFire');
    expect(actionCue({ type: 'infuse', element: 'ice', dragged: true }, 2)?.id).toBe('infuseIce');
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

describe('teclado de los tours', () => {
  it('suena una tecla de cada dos, desde el centro, y los espacios no cuentan', () => {
    const text = '¡No hay tiempo!';
    const typed: number[] = [];
    for (let i = 0; i < Array.from(text).length; i++) if (keystrokeCue(text, i, i + 1)) typed.push(i);
    // Teclas: ¡ N o h a y t i e m p o !; suenan la 1.a (¡), la 3.a (o), la 5.a (a)...
    expect(typed).toEqual([0, 2, 5, 8, 10, 12, 14]);
    expect(KEY_EVERY).toBe(2);
    expect(keystrokeCue(text, 0, 1)).toEqual({ id: 'keystroke', pan: 0 });
    expect(keystrokeCue(text, 3, 4)).toBeNull();
  });

  it('un salto grande suena una sola vez, y sin letras nuevas no suena', () => {
    expect(keystrokeCue('Arrastra una planta.', 0, 15)).toEqual({ id: 'keystroke', pan: 0 });
    expect(keystrokeCue('Hola', 4, 4)).toBeNull();
    expect(keystrokeCue('Hola', 4, 9)).toBeNull();
  });
});

describe('tropas del brote 3 (T-038)', () => {
  it('el Skipper suena al saltar, desde donde despega; caer no suena', () => {
    const state = spawnEnemy(createMatch(), 'skipper', 2, 7);
    const id = state.enemies[0].id;
    const cues = combatCues(
      [
        { type: 'hopped', enemyId: id, from: 7, to: 5 },
        { type: 'hopLanded', enemyId: id, x: 5 },
      ],
      state,
    );
    expect(cues).toEqual([{ id: 'hop', pan: panAt(7, BOARD.columns) }]);
  });

  it('un Lurker suena al descubrirse, donde esta; volver a ocultarse no suena', () => {
    const state = spawnEnemy(createMatch(), 'lurker', 1, 6);
    const id = state.enemies[0].id;
    const cues = combatCues(
      [
        { type: 'revealed', enemyId: id },
        { type: 'concealed', enemyId: id },
      ],
      state,
    );
    expect(cues).toEqual([{ id: 'reveal', pan: panAt(6, BOARD.columns) }]);
  });

  it('una semilla normal suena a metal en el Lurker acorazado, como en los otros acorazados', () => {
    const state = spawnEnemy(createMatch(), 'lurkerArmored', 1, 5);
    const hit: CombatEvent = { type: 'hit', bulletId: 7, enemyId: state.enemies[0].id, at: { x: 4.6, y: 1.5 } };
    expect(ids(combatCues([hit], { ...state, bullets: [bullet(7, null)] }))).toEqual(['hitArmor']);
  });

  it('un Lurker que se acerca a lo sembrado se descubre y suena una vez, en el combate de verdad', () => {
    let state = createMatch();
    state = { ...state, plants: state.plants.map((lane, l) => lane.map((p, c) => (l === 1 && c === 1 ? createPlant() : p))) };
    state = spawnEnemy(state, 'lurker', 1, 6);
    const heard: string[] = [];
    for (let t = 0; t < 4000; t += 50) {
      const step = stepCombat(state, 50);
      heard.push(...ids(combatCues(step.events, state)));
      state = step.state;
    }
    expect(heard.filter((id) => id === 'reveal')).toHaveLength(1);
  });
});
