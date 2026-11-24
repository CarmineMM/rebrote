import { describe, expect, it } from 'vitest';
import { roundFitsBesideLives } from './hudFit';

describe('roundFitsBesideLives', () => {
  it('cabe si entre la bandeja y los marcadores hay sitio para la ronda y las tres separaciones de la rejilla', () => {
    // 812 x 375 con cuatro cartas: bandeja hasta 378, ronda de 130, marcadores desde 564, separaciones de 8.
    expect(roundFitsBesideLives(378, 130, 564, 8)).toBe(true);
  });

  it('cabe justo, sin un pixel de sobra', () => {
    expect(roundFitsBesideLives(100, 50, 174, 8)).toBe(true);
  });

  it('no cabe si le falta un pixel', () => {
    expect(roundFitsBesideLives(100, 50, 173, 8)).toBe(false);
  });

  it('no cabe en un movil estrecho', () => {
    // 568 x 320 con cuatro cartas: entre la bandeja y los marcadores quedan unos 40 px.
    expect(roundFitsBesideLives(276, 120, 316, 8)).toBe(false);
  });
});
