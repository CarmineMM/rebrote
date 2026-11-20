import { describe, expect, it } from 'vitest';
import { BOARD } from '../config/balance';
import type { Cell } from '../core/board';
import { createMatch, earn, playCard, type MatchState } from '../core/match';
import { lanesFromCenter, tourCells } from './tourSpots';

/** Ronda (desde 0) con saldo de sobra para sembrar lo que haga falta. */
const matchAt = (round: number) => earn(createMatch(undefined, round), 10_000);
const sow = (state: MatchState, card: 'shooter' | 'fire' | 'ice', ...cells: Cell[]) => cells.reduce((s, cell) => playCard(s, card, cell), state);

describe('lo que senala un tour de ayuda (T-013)', () => {
  it('los carriles van del centro hacia fuera', () => {
    expect(lanesFromCenter(5)).toEqual([2, 1, 3, 0, 4]);
    expect(lanesFromCenter(4)).toEqual([1, 2, 0, 3]);
  });

  it('en un cesped vacio, siembra en el carril del centro a la izquierda y la mina algo adelantada', () => {
    const cells = tourCells(matchAt(0));
    expect(cells.sowCell).toEqual({ lane: 2, col: 0 });
    expect(cells.mineCell).toEqual({ lane: 2, col: 5 });
    expect(cells.shooter).toBeNull();
    expect(cells.fusion).toBeNull();
  });

  it('salta las casillas ocupadas y, con el carril del centro lleno, pasa al de al lado', () => {
    let state = sow(matchAt(0), 'shooter', { lane: 2, col: 0 });
    expect(tourCells(state).sowCell).toEqual({ lane: 2, col: 1 });
    const full = Array.from({ length: BOARD.columns }, (_, col) => ({ lane: 2, col }));
    state = sow(matchAt(0), 'shooter', ...full);
    expect(tourCells(state).sowCell).toEqual({ lane: 1, col: 0 });
    expect(tourCells(state).mineCell).toEqual({ lane: 1, col: 5 });
  });

  it('senala una disparadora, primero la del carril del centro', () => {
    const state = sow(matchAt(1), 'shooter', { lane: 0, col: 0 }, { lane: 2, col: 3 });
    expect(tourCells(state).shooter).toEqual({ lane: 2, col: 3 });
  });

  it('solo senala para infundir una disparadora sin elemento y desde la ronda que lo desbloquea', () => {
    const before = sow(matchAt(3), 'shooter', { lane: 2, col: 0 });
    expect(tourCells(before).infusable).toBeNull();
    let state = sow(matchAt(4), 'shooter', { lane: 2, col: 0 }, { lane: 1, col: 0 });
    expect(tourCells(state).infusable).toEqual({ lane: 2, col: 0 });
    state = playCard(state, 'fire', { lane: 2, col: 0 });
    expect(tourCells(state).infusable).toEqual({ lane: 1, col: 0 });
  });

  it('busca una mina que espera y la disparadora mas cercana a la que puede infundir', () => {
    const state = sow(sow(matchAt(4), 'shooter', { lane: 2, col: 0 }, { lane: 2, col: 4 }), 'ice', { lane: 2, col: 5 });
    expect(tourCells(state).mineInfusion).toEqual({ mine: { lane: 2, col: 5 }, target: { lane: 2, col: 4 } });
    expect(tourCells(state).mines).toEqual({ fire: null, ice: { lane: 2, col: 5 } });
  });

  it('no propone infundir con una mina antes de la ronda de infundir', () => {
    const state = sow(sow(matchAt(3), 'shooter', { lane: 2, col: 0 }), 'ice', { lane: 2, col: 5 });
    expect(tourCells(state).mineInfusion).toBeNull();
  });

  it('busca dos disparadoras que se puedan fusionar, cercanas, desde la ronda de fusionar', () => {
    const plants = [
      { lane: 2, col: 0 },
      { lane: 2, col: 1 },
      { lane: 0, col: 0 },
    ];
    expect(tourCells(sow(matchAt(4), 'shooter', ...plants)).fusion).toBeNull();
    const state = sow(matchAt(5), 'shooter', ...plants);
    expect(tourCells(state).fusion).toEqual({ from: { lane: 2, col: 0 }, to: { lane: 2, col: 1 } });
  });

  it('no propone fusionar variantes distintas', () => {
    const state = playCard(sow(matchAt(5), 'shooter', { lane: 2, col: 0 }, { lane: 2, col: 1 }), 'fire', { lane: 2, col: 0 });
    expect(tourCells(state).fusion).toBeNull();
  });
});
