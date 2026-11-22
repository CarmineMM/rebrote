import { describe, expect, it } from 'vitest';
import { FIRST_OUTBREAK, type OutbreakId } from '../core/outbreaks';
import { simulate, type BotStyle, type SimResult } from './bot';

/**
 * Simulacion de los brotes con bots (T-026): no va con `npm test`, sino con `npm run sim`, porque tarda. Juega cada brote
 * varias veces con cada bot (con azar fijo, asi que repetirla da lo mismo) y saca una tabla. Lo que dio esta en
 * `docs/specs/05-brote-2-elk-cloner.md`. Lo que comprueba es lo que pide la task: sin escudos se pierde el brote 2 casi
 * siempre; usandolos bien, se gana la mayoria. Desde T-035 (curva compuesta y tope 5), usarlos bien es con disparadoras de
 * 3 canones, o con 2 y algo de nivel base comprado.
 */

const RUNS = 10;

const SHIELDLESS: BotStyle = { name: 'sin escudos', shields: 'never', columns: 3, cannons: 2 };
const SHIELDED: BotStyle = { name: 'con escudos', shields: 'always', columns: 3, cannons: 2 };
/** Con escudos y disparadoras de 3 canones: lo que pide el brote 2 sin mejoras compradas (T-035). */
const SHIELDED_STRONG: BotStyle = { name: 'con escudos y 3 canones', shields: 'always', columns: 3, cannons: 3 };
/** Sin escudos, pero con disparadoras de 3 canones: mas fuego en el carril del jefe para tumbarlo antes. */
const SHIELDLESS_STRONG: BotStyle = { name: 'sin escudos y con 3 canones', shields: 'never', columns: 3, cannons: 3 };
/** Llega al jefe sin escudos y solo siembra muros cuando anuncia el poema entero (caso limite de la task). */
const LATE: BotStyle = { name: 'escudos solo al oir el poema', shields: 'poem', columns: 3, cannons: 2 };

const minutes = (ms: number) => Math.round((ms / 60_000) * 10) / 10;

function play(outbreak: OutbreakId, style: BotStyle, baseLevel = 1): SimResult[] {
  return Array.from({ length: RUNS }, (_, i) => simulate(outbreak, style, 1000 + i, baseLevel));
}

function report(outbreak: OutbreakId, style: BotStyle, results: readonly SimResult[], baseLevel = 1): void {
  const wins = results.filter((r) => r.outcome === 'won').length;
  const fights = results.flatMap((r) => (r.bossFightMs === null ? [] : [r.bossFightMs]));
  const average = (list: readonly number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
  const rounds = Math.max(...results.map((r) => r.attackMs.length));
  const perRound = Array.from({ length: rounds }, (_, i) => Math.round(average(results.flatMap((r) => (r.attackMs[i] === undefined ? [] : [r.attackMs[i]]))) / 1000));
  console.log(
    `\n${outbreak} · bot ${style.name}${baseLevel > 1 ? ` · nivel base ${baseLevel}` : ''}: ${wins} de ${results.length} ganadas · ` +
      `${minutes(average(results.map((r) => r.timeMs)))} min de media · combate final ${Math.round(average(fights) / 1000)} s de media · ` +
      `ataque de cada ronda superada (s): ${perRound.join(', ')}`,
  );
  console.table(results.map((r) => ({ resultado: r.outcome, ronda: r.round, vidas: r.lives, minutos: minutes(r.timeMs), jefe_s: r.bossFightMs === null ? '-' : Math.round(r.bossFightMs / 1000) })));
}

describe('brote 2: Elk Cloner (T-026)', () => {
  it('sin escudos se pierde casi siempre', () => {
    const results = play('elkCloner', SHIELDLESS);
    report('elkCloner', SHIELDLESS, results);
    expect(results.filter((r) => r.outcome === 'won').length).toBeLessThanOrEqual(RUNS * 0.2);
  });

  it('sin escudos, ni con mas canones se gana: el poema acaba con el tablero antes', () => {
    const results = play('elkCloner', SHIELDLESS_STRONG);
    report('elkCloner', SHIELDLESS_STRONG, results);
    expect(results.filter((r) => r.outcome === 'won').length).toBeLessThanOrEqual(RUNS * 0.2);
  });

  it('con escudos bien puestos y disparadoras de 3 canones se gana la mayoria', () => {
    const results = play('elkCloner', SHIELDED_STRONG);
    report('elkCloner', SHIELDED_STRONG, results);
    expect(results.filter((r) => r.outcome === 'won').length).toBeGreaterThan(RUNS / 2);
  });

  it('con escudos y 2 canones hace falta nivel base (T-035): sin el se pierde, con el 3 se gana la mayoria', () => {
    const bare = play('elkCloner', SHIELDED);
    report('elkCloner', SHIELDED, bare);
    expect(bare.filter((r) => r.outcome === 'won').length).toBeLessThanOrEqual(RUNS * 0.2);
    const bought = play('elkCloner', SHIELDED, 3);
    report('elkCloner', SHIELDED, bought, 3);
    expect(bought.filter((r) => r.outcome === 'won').length).toBeGreaterThan(RUNS / 2);
  });

  it('llegando sin escudos, el aviso del poema da tiempo a reaccionar (se anota, no se exige)', () => {
    const results = play('elkCloner', LATE);
    report('elkCloner', LATE, results);
    // T-035: con 2 canones y sin mejoras, a veces ni llega al jefe (cae en la ronda 7).
    expect(results.every((r) => r.round >= 7)).toBe(true);
  });
});

describe('brote 1: Creeper (referencia)', () => {
  it('el mismo bot lo gana', () => {
    const results = play(FIRST_OUTBREAK, SHIELDLESS);
    report(FIRST_OUTBREAK, SHIELDLESS, results);
    expect(results.filter((r) => r.outcome === 'won').length).toBeGreaterThan(RUNS / 2);
  });
});

/**
 * Nivel base (T-023): el brote 1 con las disparadoras naciendo en el nivel 1 (sin comprar nada) y en el 5 (todo comprado,
 * al tope del brote). Con el 1 se tiene que seguir ganando: ningun jefe cuenta con la mejora. Lo que da esta en
 * `docs/specs/01-mecanicas.md` ("Nivel base").
 */
describe('brote 1 con nivel base (T-023)', () => {
  for (const baseLevel of [1, 3, 5]) {
    it(`con nivel base ${baseLevel} se gana`, () => {
      const results = play(FIRST_OUTBREAK, SHIELDLESS, baseLevel);
      report(FIRST_OUTBREAK, SHIELDLESS, results, baseLevel);
      expect(results.filter((r) => r.outcome === 'won').length).toBeGreaterThan(RUNS / 2);
    });
  }
});

/**
 * Brote 3 en preparacion (T-038): sus 3 rondas provisionales con las tropas nuevas (Lurker ocultos y, en la 3, el Skipper).
 * Sin jefe, ganar es acabar las tres. Se anota en `docs/specs/06-brote-3-brain.md` para que T-039 ajuste vida y cantidades
 * con su guion de verdad. Ojo: aqui el bot con escudos juega como el que no los usa, porque gasta cada 100 monedas en
 * disparadoras antes de juntar las 150 de un muro. Solo se exige que el brote se pueda ganar.
 */
describe('brote 3: Brain, en preparacion (T-038)', () => {
  for (const style of [SHIELDLESS, SHIELDED, SHIELDED_STRONG]) {
    it(`bot ${style.name} (se anota)`, () => {
      const results = play('brain', style);
      report('brain', style, results);
      if (style === SHIELDED) expect(results.some((r) => r.outcome === 'won')).toBe(true);
    });
  }
});
