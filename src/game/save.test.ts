import { describe, expect, it } from 'vitest';
import { LIVES } from './config/balance';
import { spawnEnemy, stepCombat } from './core/combat';
import { createMatch, earn, playCard, type MatchState } from './core/match';
import { FIRST_OUTBREAK, roundCount } from './core/outbreaks';
import { createRound, startAttack } from './core/rounds';
import type { UnlockInfo } from './EventBus';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  decodeSave,
  encodeSave,
  readSave,
  summarizeSave,
  writeSave,
  type SaveStore,
} from './save';

/** Almacenamiento de mentira, como el `localStorage` del navegador. */
function memoryStore(): SaveStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/** Partida a mitad de un ataque: plantas, una mina, enemigos, balas en vuelo y un gusano quemado. */
function midAttack(): MatchState {
  let match = earn(createMatch(), 1000);
  match = { ...match, round: createRound(OUTBREAK, 4) };
  match = playCard(match, 'shooter', { lane: 2, col: 1 });
  match = playCard(match, 'fire', { lane: 2, col: 1 });
  match = playCard(match, 'ice', { lane: 0, col: 3 });
  match = startAttack(match);
  match = spawnEnemy(match, 'worm', 2, 6);
  match = spawnEnemy(match, 'armored', 0, 7, undefined, 1.25, 4);
  for (let i = 0; i < 40; i++) match = stepCombat(match, 50, () => 0.5).state;
  return match;
}

const unlock: UnlockInfo = { round: 5, items: [{ id: 'infuse' }] };
const OUTBREAK = FIRST_OUTBREAK;
const ROUND_COUNT = roundCount(OUTBREAK);

describe('partida guardada (T-011)', () => {
  it('guarda y recupera la partida entera, tambien a mitad de un ataque', () => {
    const match = midAttack();
    expect(match.bullets.length + match.enemies.length).toBeGreaterThan(0);
    expect(match.enemies.some((enemy) => enemy.burn !== null)).toBe(true);
    const save = decodeSave(encodeSave(match, null, 1234));
    expect(save).toEqual({ version: SAVE_VERSION, savedAt: 1234, match, pendingUnlock: null });
  });

  it('recuerda el aviso de lo desbloqueado que no se acepto', () => {
    const save = decodeSave(encodeSave(createMatch(), unlock, 0));
    expect(save?.pendingUnlock).toEqual(unlock);
  });

  it('la partida es de su brote y lo conserva al guardarse y cargarse (T-018)', () => {
    const save = decodeSave(encodeSave(midAttack(), null, 0));
    expect(save?.match.outbreak).toBe(OUTBREAK);
  });

  it('dice en que ronda va, con cuantas vidas y monedas, y cuando se guardo', () => {
    const match = { ...earn(createMatch(), 40), round: createRound(OUTBREAK, 3), lives: 2 };
    const save = decodeSave(encodeSave(match, null, 99));
    expect(save && summarizeSave(save)).toEqual({ outbreak: OUTBREAK, round: 4, total: ROUND_COUNT, lives: 2, balance: match.balance, savedAt: 99 });
  });

  it('se escribe en su clave y se borra', () => {
    const store = memoryStore();
    expect(readSave(store)).toBeNull();
    expect(writeSave(createMatch(), null, store, 5)).toBe(true);
    expect(store.data.has(SAVE_KEY)).toBe(true);
    expect(readSave(store)?.savedAt).toBe(5);
    clearSave(store);
    expect(readSave(store)).toBeNull();
  });

  it('una partida acabada no se guarda y borra la guardada: perder obliga a empezar de cero (I-04)', () => {
    const store = memoryStore();
    writeSave(createMatch(), null, store);
    const lost = { ...createMatch(), lives: 0 };
    expect(writeSave(lost, null, store)).toBe(false);
    expect(readSave(store)).toBeNull();

    writeSave(createMatch(), null, store);
    const won = { ...createMatch(), round: { ...createRound(OUTBREAK, ROUND_COUNT - 1), phase: 'won' as const } };
    expect(writeSave(won, null, store)).toBe(false);
    expect(readSave(store)).toBeNull();
  });

  it('ignora lo que no entiende: nada, texto roto, otra version u otra forma', () => {
    const good = JSON.parse(encodeSave(createMatch(), null, 0));
    expect(decodeSave(null)).toBeNull();
    expect(decodeSave('{roto')).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, version: SAVE_VERSION + 1 }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, plants: [[]] } }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, lives: LIVES.start + 1 } }))).toBeNull();
    // Una ronda que ya no existe (el guion cambio).
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, round: { ...good.match.round, index: ROUND_COUNT } } }))).toBeNull();
    // Un brote que este juego no tiene (T-018), o sin brote en la version 2.
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, outbreak: 'blaster' } }))).toBeNull();
    const { outbreak: _outbreak, ...noOutbreak } = good.match;
    expect(decodeSave(JSON.stringify({ ...good, match: noOutbreak }))).toBeNull();
    // Un enemigo de un tipo que no existe.
    const ghost = { id: 1, kind: 'ghost', lane: 0, x: 3, hp: 10, attackMs: null, burn: null, slow: null, haste: 1, level: 1, jump: null, jumpsUsed: 0 };
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, enemies: [ghost] } }))).toBeNull();
    // Un aviso que no se entiende se pierde, pero la partida se carga.
    expect(decodeSave(JSON.stringify({ ...good, pendingUnlock: { round: 'x' } }))?.pendingUnlock).toBeNull();
  });

  it('guarda las semillas que llevan las rondas, sin cobrar, y si el brote ya estaba vencido (T-020)', () => {
    const match: MatchState = { ...createMatch(undefined, 3, OUTBREAK, true), seeds: { replay: true, rounds: 3, earned: 31, payout: null } };
    expect(decodeSave(encodeSave(match, null, 0))?.match.seeds).toEqual({ replay: true, rounds: 3, earned: 31, payout: null });
  });

  it('una partida guardada sin semillas, con semillas rotas o ya cobradas no se carga (T-020)', () => {
    const good = JSON.parse(encodeSave(createMatch(), null, 0));
    const { seeds, ...noSeeds } = good.match;
    expect(decodeSave(JSON.stringify({ ...good, match: noSeeds }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, seeds: { ...seeds, earned: -4 } } }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, seeds: { ...seeds, earned: 2.5 } } }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, seeds: { ...seeds, rounds: ROUND_COUNT + 1 } } }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, seeds: { ...seeds, replay: 'no' } } }))).toBeNull();
    expect(decodeSave(JSON.stringify({ ...good, match: { ...good.match, seeds: { ...seeds, payout: { total: 10 } } } }))).toBeNull();
    // La version 2 (antes de las semillas) se ignora.
    expect(decodeSave(JSON.stringify({ ...good, version: 2, match: noSeeds }))).toBeNull();
  });

  it('sin almacenamiento o si falla, el juego sigue sin partida guardada', () => {
    const broken: SaveStore = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('sin espacio');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(readSave(broken)).toBeNull();
    expect(writeSave(createMatch(), null, broken)).toBe(false);
    expect(() => clearSave(broken)).not.toThrow();
    expect(readSave(null)).toBeNull();
    expect(writeSave(createMatch(), null, null)).toBe(false);
  });
});

describe('partida guardada: el nivel base (T-023)', () => {
  it('guarda el nivel base de la partida y lo recupera igual', () => {
    const match = createMatch(undefined, 0, OUTBREAK, false, undefined, 4);
    expect(decodeSave(encodeSave(match, null, 0))?.match.baseLevel).toBe(4);
  });

  it('una guardada sin nivel base, o con uno que no existe, no se carga', () => {
    const { baseLevel: _, ...without } = createMatch();
    expect(decodeSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, match: without, pendingUnlock: null }))).toBeNull();
    const broken = { ...createMatch(), baseLevel: 6 };
    expect(decodeSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, match: broken, pendingUnlock: null }))).toBeNull();
  });
});
