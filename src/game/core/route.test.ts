import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentOutbreak, isGreenhouseOpen, isPlayable, lastOutbreak, outbreakStanding, ownedSoFar, reachedEnd, readyOutbreaks, routeStops, type RouteStop } from './route';
import type { OutbreakId } from './outbreaks';

/**
 * Brotes de prueba (T-019): tres inventados, en orden ("alpha", "beta", "gamma"), para probar la ruta con varios. La
 * lista se puede recortar en un test (con un solo brote, como el juego de hoy) y vuelve a estar entera despues.
 */
const outbreaks = vi.hoisted(() => [] as unknown[]);
vi.mock('../config/balance', async (importOriginal) => {
  const real = await importOriginal<typeof import('../config/balance')>();
  const groups = [{ atMs: 1_000, kind: 'worm', lanes: [2] }];
  // alpha ensena la disparadora y subir de nivel (tope 5); beta, la mina de fuego y sube el tope a 10; gamma, fusionar.
  outbreaks.push(
    { id: 'alpha', boss: 'worm', startingBalance: 250, rounds: [{ unlocks: ['shooter'], quiet: true, groups }, { unlocks: ['levelUp'], levelCap: 5, groups }] },
    { id: 'beta', boss: 'armored', startingBalance: 250, rounds: [{ unlocks: ['fireMine'], groups }, { unlocks: [], levelCap: 10, groups }] },
    { id: 'gamma', boss: 'spitter', startingBalance: 250, rounds: [{ unlocks: ['fuse'], groups }] },
  );
  return { ...real, OUTBREAKS: outbreaks };
});

const ALPHA = 'alpha' as OutbreakId;
const BETA = 'beta' as OutbreakId;
const GAMMA = 'gamma' as OutbreakId;
const ALL = [...outbreaks];

afterEach(() => outbreaks.splice(0, outbreaks.length, ...ALL));

/** La ruta en corto: "alpha:defeated", "beta:open*" (el que toca), "soon:4", "final". */
function sketch(stops: readonly RouteStop[]): string[] {
  return stops.map((stop) => {
    if (stop.kind === 'outbreak') return `${stop.id}:${stop.standing}${stop.current ? '*' : ''}`;
    return stop.kind === 'soon' ? `soon:${stop.number}` : 'final';
  });
}

describe('Invernadero (T-019, R-01)', () => {
  it('se abre al vencer al jefe del primer brote, y no antes', () => {
    expect(isGreenhouseOpen([])).toBe(false);
    expect(isGreenhouseOpen(['beta'])).toBe(false);
    expect(isGreenhouseOpen(['otro-de-una-version-nueva'])).toBe(false);
    expect(isGreenhouseOpen(['alpha'])).toBe(true);
    expect(isGreenhouseOpen(['beta', 'alpha'])).toBe(true);
  });
});

describe('lo que el jugador ya tiene, para el jardin del Invernadero (T-019)', () => {
  const sorted = (features: ReadonlySet<string>) => [...features].sort();

  it('sin brotes vencidos no tiene nada', () => {
    expect(sorted(ownedSoFar([]).features)).toEqual([]);
    expect(ownedSoFar(['de-otra-version']).features.size).toBe(0);
  });

  it('tiene lo de todas las rondas hasta el brote vencido mas avanzado, con los de antes (B-01), y su tope de nivel', () => {
    expect(sorted(ownedSoFar(['alpha']).features)).toEqual(['levelUp', 'shooter']);
    expect(ownedSoFar(['alpha']).levelCap).toBe(5);
    expect(sorted(ownedSoFar(['alpha', 'beta']).features)).toEqual(['fireMine', 'levelUp', 'shooter']);
    expect(ownedSoFar(['beta', 'alpha']).levelCap).toBe(10);
    expect(sorted(ownedSoFar(['alpha', 'beta', 'gamma']).features)).toEqual(['fireMine', 'fuse', 'levelUp', 'shooter']);
  });

  it('lo que solo desbloqueo una partida a medias no cuenta: solo los brotes vencidos', () => {
    expect(ownedSoFar(['alpha']).features.has('fireMine')).toBe(false);
  });
});

describe('estado de cada brote (T-019)', () => {
  it('vencido, abierto o cerrado, con la regla de B-04', () => {
    expect(outbreakStanding(ALPHA, [])).toBe('open');
    expect(outbreakStanding(BETA, [])).toBe('locked');
    expect(outbreakStanding(ALPHA, ['alpha'])).toBe('defeated');
    expect(outbreakStanding(BETA, ['alpha'])).toBe('open');
    expect(outbreakStanding(GAMMA, ['alpha'])).toBe('locked');
  });

  it('se elige en la ruta lo vencido (para volver a jugarlo) y lo abierto, nunca lo cerrado', () => {
    expect(isPlayable('defeated')).toBe(true);
    expect(isPlayable('open')).toBe(true);
    expect(isPlayable('locked')).toBe(false);
  });

  it('toca jugar el primer brote abierto sin vencer; ninguno si ya se vencieron todos', () => {
    expect(currentOutbreak([])).toBe(ALPHA);
    expect(currentOutbreak(['alpha'])).toBe(BETA);
    expect(currentOutbreak(['alpha', 'beta'])).toBe(GAMMA);
    expect(currentOutbreak(['alpha', 'beta', 'gamma'])).toBeNull();
  });
});

describe('ruta de brotes (T-019, R-03)', () => {
  it('sin nada vencido: el primero destaca, el segundo en sombra, el tercero no se ensena, y el final a lo lejos', () => {
    expect(sketch(routeStops([]))).toEqual(['alpha:open*', 'beta:locked', 'final']);
  });

  it('con el primero vencido: superado, el segundo destaca y el tercero en sombra', () => {
    expect(sketch(routeStops(['alpha']))).toEqual(['alpha:defeated', 'beta:open*', 'gamma:locked', 'final']);
  });

  it('con todos vencidos, el siguiente aun no existe: un lugar "Proximamente" con su numero', () => {
    expect(sketch(routeStops(['alpha', 'beta', 'gamma']))).toEqual(['alpha:defeated', 'beta:defeated', 'gamma:defeated', 'soon:4', 'final']);
  });

  it('va en el orden de la lista, no en el orden en que se vencieron', () => {
    expect(sketch(routeStops(['beta', 'alpha']))).toEqual(['alpha:defeated', 'beta:defeated', 'gamma:open*', 'soon:4', 'final']);
  });

  it('un brote vencido de una version mas nueva no ensena nada raro', () => {
    expect(sketch(routeStops(['delta', 'alpha']))).toEqual(['alpha:defeated', 'beta:open*', 'gamma:locked', 'final']);
  });

  it('solo destaca un lugar, aunque haya otro abierto mas adelante (progreso con huecos)', () => {
    const stops = sketch(routeStops(['beta']));
    expect(stops).toEqual(['alpha:open*', 'beta:defeated', 'gamma:open', 'soon:4', 'final']);
  });

  it('con un solo brote en el juego (como hoy) la ruta tiene sus tres lugares y no parece rota', () => {
    outbreaks.splice(1);
    expect(sketch(routeStops([]))).toEqual(['alpha:open*', 'soon:2', 'final']);
    expect(sketch(routeStops(['alpha']))).toEqual(['alpha:defeated', 'soon:2', 'final']);
    expect(currentOutbreak(['alpha'])).toBeNull();
  });

  it('nunca esta vacia y siempre acaba en el destino final', () => {
    for (const defeated of [[], ['alpha'], ['alpha', 'beta'], ['alpha', 'beta', 'gamma'], ['x']]) {
      const stops = routeStops(defeated);
      expect(stops[0]).toMatchObject({ kind: 'outbreak', id: ALPHA });
      expect(stops.at(-1)).toEqual({ kind: 'final' });
      expect(stops.filter((stop) => stop.kind === 'outbreak' && stop.current).length).toBeLessThanOrEqual(1);
    }
  });
});

describe('el ultimo brote del juego: el final de la beta (T-044)', () => {
  it('es el ultimo de la lista', () => {
    expect(readyOutbreaks()).toEqual([ALPHA, BETA, GAMMA]);
    expect(lastOutbreak()).toBe(GAMMA);
  });

  it('al anadir un brote terminado, el final pasa solo a el', () => {
    outbreaks.push({ id: 'delta', boss: 'worm', startingBalance: 250, rounds: [{ unlocks: [], groups: [] }] });
    expect(lastOutbreak()).toBe('delta');
    expect(reachedEnd(['alpha', 'beta', 'gamma'])).toBe(false);
    expect(reachedEnd(['alpha', 'beta', 'gamma', 'delta'])).toBe(true);
  });

  it('uno en preparacion (sin jefe) no cuenta: el final es el de antes, y lo que va detras tampoco', () => {
    outbreaks.splice(2, 0, { id: 'prep', boss: null, startingBalance: 250, rounds: [{ unlocks: [], groups: [] }] });
    expect(readyOutbreaks()).toEqual([ALPHA, BETA]);
    expect(lastOutbreak()).toBe(BETA);
    expect(reachedEnd(['alpha', 'beta'])).toBe(true);
    expect(sketch(routeStops(['alpha', 'beta']))).toEqual(['alpha:defeated', 'beta:defeated', 'soon:3', 'final']);
  });

  it('con un solo brote, el final es el primero', () => {
    outbreaks.splice(1);
    expect(lastOutbreak()).toBe(ALPHA);
  });

  it('se llega al final al vencer al ultimo, no a otro, en cualquier orden', () => {
    expect(reachedEnd([])).toBe(false);
    expect(reachedEnd(['alpha', 'beta'])).toBe(false);
    expect(reachedEnd(['gamma'])).toBe(true);
    expect(reachedEnd(['beta', 'gamma', 'alpha'])).toBe(true);
  });
});

