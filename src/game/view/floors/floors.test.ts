import { describe, expect, it } from 'vitest';
import { BOARD } from '../../config/balance';
import { BEDS, bedBand, bedStakes } from './beds';
import { FLOOR_DESIGNS, FLOOR_NAMES } from './catalog';
import { FLOOR_GRIDS } from './design';
import { PATIO, patioSlabs, slabBand } from './patio';
import { ROOTS, laneLineY, rootKnots, rootNetwork } from './roots';

/**
 * Suelos del tablero (T-050): la geometria de las propuestas, sin pintar. Lo que se apoya en un carril (las plantas en el
 * 0,62 del carril, `PLANT_LOOK.footY`; los enemigos en el 0,64, `WORM_LOOK.footY`; las minas, el muro y las sombras) tiene
 * que caer en su carril y no en la linea que lo separa del siguiente: se comprueba con la franja de 0,15 a 0,85.
 */
const FEET = { from: 0.15, to: 0.85 } as const;
const lanes = Array.from({ length: BOARD.lanes }, (_v, lane) => lane);
const inner = Array.from({ length: BOARD.columns - 1 }, (_v, i) => i + 1);

describe('catalogo de suelos', () => {
  it('cada suelo tiene su clave, su nombre y su idea para la galeria', () => {
    const ids = FLOOR_DESIGNS.map((floor) => floor.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('legacy');
    for (const id of ids) {
      expect(FLOOR_NAMES[id]?.name).toBeTruthy();
      expect(FLOOR_NAMES[id]?.idea).toBeTruthy();
    }
  });
});

describe('A: bancales', () => {
  it('lo que se apoya en un carril cae en la tierra de su bancal, no en el pasillo', () => {
    for (const lane of lanes) {
      const { top, bottom } = bedBand(lane);
      expect(top).toBeLessThan(lane + FEET.from);
      expect(bottom).toBeGreaterThan(lane + FEET.to);
    }
  });

  it('entre bancal y bancal queda un pasillo, y ninguno se sale del tablero', () => {
    for (const lane of lanes) {
      const { top, bottom } = bedBand(lane);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(BOARD.lanes);
      if (lane > 0) expect(top - bedBand(lane - 1).bottom).toBeCloseTo(BEDS.walk * 2);
    }
  });

  it('las estaquillas van en la linea de cada columna: insinuadas, solo atras y delante; a la vista, en todos los pasillos', () => {
    const hinted = bedStakes('hinted');
    const shown = bedStakes('shown');
    expect(hinted).toHaveLength(inner.length * 2);
    expect(shown).toHaveLength(inner.length * (BOARD.lanes + 1));
    for (const stake of [...hinted, ...shown]) expect(inner).toContain(stake.x);
    expect(new Set(hinted.map((stake) => stake.y)).size).toBe(2);
  });
});

describe('B: patio', () => {
  it('sale siempre igual', () => {
    for (const grid of FLOOR_GRIDS) expect(patioSlabs(grid)).toEqual(patioSlabs(grid));
  });

  it('cada losa se queda en su carril, entre los bordillos, y dentro del tablero', () => {
    for (const grid of FLOOR_GRIDS) {
      for (const slab of patioSlabs(grid)) {
        const { top, bottom } = slabBand(slab.lane);
        for (const [x, y] of slab.corners) {
          expect(y).toBeGreaterThanOrEqual(top);
          expect(y).toBeLessThanOrEqual(bottom);
          expect(x).toBeGreaterThanOrEqual(PATIO.sideKerb);
          expect(x).toBeLessThanOrEqual(BOARD.columns - PATIO.sideKerb);
        }
      }
    }
  });

  it('el carril entero esta enlosado: entre los bordillos no queda hueco mas ancho que una junta', () => {
    for (const grid of FLOOR_GRIDS) {
      for (const lane of lanes) {
        const spans = patioSlabs(grid)
          .filter((slab) => slab.lane === lane)
          .map((slab) => [Math.min(slab.corners[0][0], slab.corners[3][0]), Math.max(slab.corners[1][0], slab.corners[2][0])] as const)
          .sort((a, b) => a[0] - b[0]);
        let reach: number = PATIO.sideKerb;
        for (const [from, to] of spans) {
          expect(from - reach).toBeLessThan(PATIO.joint + 2 * PATIO.jitter + 1e-9);
          reach = Math.max(reach, to);
        }
        expect(BOARD.columns - PATIO.sideKerb - reach).toBeLessThan(PATIO.joint + 2 * PATIO.jitter + 1e-9);
      }
    }
  });

  it('con las columnas a la vista, ninguna losa cruza una columna; insinuadas, las losas rompen la cuadricula', () => {
    const crosses = (grid: 'hinted' | 'shown', lane: number, col: number) =>
      patioSlabs(grid).some((slab) => slab.lane === lane && slab.corners[0][0] < col - 0.05 && slab.corners[1][0] > col + 0.05);
    for (const lane of lanes) {
      expect(inner.filter((col) => crosses('shown', lane, col))).toEqual([]);
      expect(inner.filter((col) => crosses('hinted', lane, col)).length).toBeGreaterThanOrEqual(inner.length / 2);
    }
  });

  it('el alcorque de cada casilla cae bajo los pies de lo sembrado', () => {
    expect(PATIO.pit.y - PATIO.pit.ry).toBeLessThan(0.62);
    expect(PATIO.pit.y + PATIO.pit.ry).toBeGreaterThan(0.62);
  });
});

describe('C: raices', () => {
  it('sale siempre igual', () => {
    for (const grid of FLOOR_GRIDS) expect(rootNetwork(grid)).toEqual(rootNetwork(grid));
  });

  it('la raiz de cada linea entre carriles no se aparta de ella: los carriles se leen y lo de encima no la pisa', () => {
    const mains = rootNetwork('hinted').filter((strand) => strand.kind === 'lane');
    expect(mains).toHaveLength(BOARD.lanes + 1);
    mains.forEach((main, line) => {
      for (const point of main.points) {
        expect(Math.abs(point.y - laneLineY(line))).toBeLessThanOrEqual(ROOTS.sway + 1e-9);
        const lane = Math.floor(point.y);
        if (lane >= 0 && lane < BOARD.lanes) expect(point.y - lane < FEET.from || point.y - lane > FEET.to).toBe(true);
      }
    });
  });

  it('las raices se paran antes del suelo corrupto', () => {
    for (const grid of FLOOR_GRIDS) {
      for (const strand of rootNetwork(grid)) for (const point of strand.points) expect(point.x).toBeLessThan(BOARD.columns);
    }
  });

  it('a la vista, una raiz cruza cada carril en cada columna; insinuadas, solo salen raicillas cortas de los nudos', () => {
    expect(rootNetwork('shown').filter((strand) => strand.kind === 'cross')).toHaveLength(BOARD.lanes * inner.length);
    expect(rootNetwork('hinted').filter((strand) => strand.kind === 'cross')).toHaveLength(0);
    for (const sprig of rootNetwork('hinted').filter((strand) => strand.kind === 'sprig')) {
      const ys = sprig.points.map((point) => point.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.4);
    }
  });

  it('hay un nudo donde cada columna cruza cada linea entre carriles', () => {
    const knots = rootKnots();
    expect(knots).toHaveLength((BOARD.lanes + 1) * inner.length);
    for (const knot of knots) expect(inner.some((col) => Math.abs(knot.x - col) <= 0.03)).toBe(true);
  });
});
