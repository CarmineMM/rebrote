import { describe, expect, it } from 'vitest';
import { PANEL_MARGIN, placeLevelPanel, type PanelAnchors, type PageRect } from './levelPanelPlace';

const at = (pageX: number, pageY: number) => ({ pageX, pageY });
/** Planta con la cabeza en `headY`, los pies 60 px mas abajo y el cuerpo a 30 px de cada lado. */
const plant = (x: number, headY: number): PanelAnchors => ({
  above: at(x, headY),
  below: at(x, headY + 60),
  right: at(x + 30, headY + 30),
  left: at(x - 30, headY + 30),
});
const PANEL = { width: 180, height: 120 };
const DESKTOP = { width: 1600, height: 900 };
/** Movil en horizontal (unos 760 x 345): bandeja a la izquierda y ronda en la segunda fila del HUD. */
const PHONE = { width: 760, height: 345 };
const PHONE_HUD: PageRect[] = [
  { left: 16, top: 12, right: 220, bottom: 66 },
  { left: 270, top: 70, right: 490, bottom: 104 },
  { left: 520, top: 12, right: 744, bottom: 60 },
];

describe('placeLevelPanel', () => {
  it('va encima de la cabeza si cabe, con la flechita apuntando a la planta', () => {
    const place = placeLevelPanel(PANEL, plant(800, 500), [], DESKTOP);
    expect(place.side).toBe('above');
    expect(place.top + PANEL.height).toBeLessThanOrEqual(500);
    expect(place.left + place.arrow).toBe(800);
  });

  it('va bajo los pies si encima choca con el HUD', () => {
    const place = placeLevelPanel(PANEL, plant(380, 140), PHONE_HUD, PHONE);
    expect(place.side).toBe('below');
  });

  it('en un movil en horizontal, en la fila de abajo, va a un lado y no se sale de la pantalla', () => {
    const place = placeLevelPanel(PANEL, plant(200, 230), PHONE_HUD, PHONE);
    expect(place.side).toBe('right');
    expect(place.left).toBeGreaterThanOrEqual(230);
    expect(place.top + PANEL.height).toBeLessThanOrEqual(PHONE.height - PANEL_MARGIN);
    expect(place.top + place.arrow).toBe(260);
  });

  it('a la izquierda si a la derecha no cabe', () => {
    const place = placeLevelPanel(PANEL, plant(700, 190), PHONE_HUD, PHONE);
    expect(place.side).toBe('left');
    expect(place.left + PANEL.width).toBeLessThanOrEqual(670);
  });

  it('a un lado, no se mete bajo lo que del HUD le cae encima', () => {
    const place = placeLevelPanel(PANEL, plant(300, 190), PHONE_HUD, PHONE);
    expect(['right', 'left']).toContain(place.side);
    expect(place.top).toBeGreaterThanOrEqual(104 + PANEL_MARGIN);
  });

  it('sin sitio limpio, se queda dentro de la pantalla', () => {
    const tiny = { width: 200, height: 130 };
    const place = placeLevelPanel(PANEL, plant(100, 70), [], tiny);
    expect(place.top).toBeGreaterThanOrEqual(PANEL_MARGIN);
    expect(place.left).toBeGreaterThanOrEqual(PANEL_MARGIN);
  });
});
