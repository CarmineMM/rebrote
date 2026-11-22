import { describe, expect, it } from 'vitest';
import { BOARD } from '../config/balance';
import { FIRST_OUTBREAK } from '../core/outbreaks';
import { ownedSoFar, type Owned } from '../core/route';
import type { Feature } from '../core/rounds';
import { greenhouseCast } from './greenhouseGarden';

const owned = (features: Feature[], levelCap = 1): Owned => ({ features: new Set(features), levelCap });

describe('jardin del Invernadero (T-019)', () => {
  it('nunca tiene enemigos', () => {
    expect(greenhouseCast(ownedSoFar([FIRST_OUTBREAK])).enemies).toEqual([]);
    expect(greenhouseCast(owned([])).enemies).toEqual([]);
  });

  it('con el brote 1 vencido salen todas sus plantas: normal, de nivel, fusionadas, de fuego, de hielo y las dos minas', () => {
    const cast = greenhouseCast(ownedSoFar([FIRST_OUTBREAK]));
    const shooters = cast.plants.map((p) => `${p.cannons}${p.element ?? 'normal'}:${p.level}`).sort();
    expect(shooters).toEqual(['1fire:1', '1ice:1', '1normal:1', '1normal:5', '2normal:1', '3normal:1']);
    expect(cast.mines.map((m) => m.element).sort()).toEqual(['fire', 'ice']);
  });

  it('solo sale lo que el jugador ya tiene', () => {
    const cast = greenhouseCast(owned(['shooter', 'fireMine']));
    expect(cast.plants).toMatchObject([{ cell: { lane: 1, col: 0 }, cannons: 1, element: null, level: 1 }]);
    expect(cast.mines).toMatchObject([{ cell: { lane: 4, col: 1 }, element: 'fire' }]);
    // Sin la disparadora no hay disparadoras de ningun tipo, aunque se tenga fusionar o infundir.
    expect(greenhouseCast(owned(['fuse', 'fireInfuse'])).plants).toEqual([]);
    // Sin infundir, nada de fuego en las disparadoras aunque se tenga la mina.
    expect(greenhouseCast(owned(['shooter', 'fireMine'])).plants.some((p) => p.element === 'fire')).toBe(false);
  });

  it('con el escudo (T-024) sale tambien la disparadora con escudo, sin pisar a las demas', () => {
    const all: Feature[] = ['shooter', 'levelUp', 'fuse', 'fireInfuse', 'iceInfuse', 'fireMine', 'iceMine', 'shield'];
    const cast = greenhouseCast(owned(all, 5));
    expect(cast.plants.some((p) => p.element === 'shield')).toBe(true);
    const at = [...cast.plants, ...cast.mines].map(({ cell, nudge }) => ({ x: cell.col + 0.5 + (nudge?.x ?? 0), y: cell.lane + 0.5 + (nudge?.y ?? 0) }));
    for (let i = 0; i < at.length; i++) {
      for (let j = i + 1; j < at.length; j++) expect(Math.hypot(at[i].x - at[j].x, at[i].y - at[j].y)).toBeGreaterThan(0.9);
    }
    expect(greenhouseCast(ownedSoFar([FIRST_OUTBREAK])).plants.some((p) => p.element === 'shield')).toBe(false);
  });

  it('la de nivel llega al tope que ya se alcanza, con su medallita y su jardincito', () => {
    const leveled = (cap: number) => greenhouseCast(owned(['shooter', 'levelUp'], cap)).plants.find((p) => p.level > 1)?.level;
    expect(leveled(5)).toBe(5);
    expect(leveled(20)).toBe(20);
  });

  it('sembradas a mano: corridas del centro de su casilla, sin pisarse y dentro del cesped', () => {
    const cast = greenhouseCast(ownedSoFar([FIRST_OUTBREAK]));
    const spots = [...cast.plants, ...cast.mines];
    const at = spots.map(({ cell, nudge }) => ({ x: cell.col + 0.5 + (nudge?.x ?? 0), y: cell.lane + 0.5 + (nudge?.y ?? 0) }));
    // No estan alineadas como en el tablero: casi todas fuera del centro, y no todas en la misma fila ni columna.
    expect(spots.filter((s) => s.nudge && (s.nudge.x !== 0 || s.nudge.y !== 0)).length).toBe(spots.length);
    for (const { nudge } of spots) {
      expect(Math.abs(nudge?.x ?? 0)).toBeLessThanOrEqual(0.35);
      expect(Math.abs(nudge?.y ?? 0)).toBeLessThanOrEqual(0.2);
    }
    for (let i = 0; i < at.length; i++) {
      for (let j = i + 1; j < at.length; j++) expect(Math.hypot(at[i].x - at[j].x, at[i].y - at[j].y)).toBeGreaterThan(0.9);
    }
  });

  it('cada pieza en su casilla, sin repetir, en el cesped y a la izquierda del panel (columnas 0 a 4)', () => {
    const cast = greenhouseCast(owned(['shooter', 'levelUp', 'fuse', 'fireInfuse', 'iceInfuse', 'fireMine', 'iceMine'], 5));
    const cells = [...cast.plants.map((p) => p.cell), ...cast.mines.map((m) => m.cell)];
    expect(new Set(cells.map((c) => `${c.lane}:${c.col}`)).size).toBe(cells.length);
    for (const cell of cells) {
      expect(cell.lane).toBeGreaterThanOrEqual(0);
      expect(cell.lane).toBeLessThan(BOARD.lanes);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThanOrEqual(4);
    }
  });
});
