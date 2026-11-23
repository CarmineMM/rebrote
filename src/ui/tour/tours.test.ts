import { describe, expect, it } from 'vitest';
import { OUTBREAKS } from '../../game/config/balance';
import { FIRST_OUTBREAK, roundCount } from '../../game/core/outbreaks';
import type { Feature } from '../../game/core/rounds';
import type { TourBoard } from '../../game/EventBus';
import { MINE } from '../../game/config/balance';
import { LANGUAGES, formatSeconds, setLanguage, text, type Language } from '../../i18n';
import { BUBBLE_MARGIN, overlap, placeBubble } from './placeBubble';
import {
  HINT_MAX_SHOWS,
  emptyProgress,
  hintDone,
  hintPending,
  hintShown,
  markTourDone,
  parseTourProgress,
  pendingTours,
  readTourProgress,
  writeTourProgress,
} from './tourProgress';
import { TOURS, TOUR_GUIDE, TOUR_OF_FEATURE, TOUR_OF_POWER, cueOf, hudTargetsOf, placeStep, toursOfPowers, toursOfRound, type Box, type TourId } from './tours';
import { POWER_IDS } from '../../game/core/powers';

const box = (left: number, top: number, width: number, height: number): Box => ({ left, top, width, height });

describe('tours de ayuda (T-013)', () => {
  it('cada cosa que desbloquea una ronda de cualquier brote tiene su tour', () => {
    const features = new Set<Feature>();
    for (const outbreak of OUTBREAKS) outbreak.rounds.forEach((round) => round.unlocks.forEach((feature) => features.add(feature)));
    for (const feature of features) expect(TOURS[TOUR_OF_FEATURE[feature]].length, feature).toBeGreaterThan(0);
  });

  it('las rondas 1 a 6 del brote 1 traen su tour y las siguientes ninguno', () => {
    const tours = (index: number) => toursOfRound(FIRST_OUTBREAK, index);
    expect([0, 1, 2, 3, 4, 5].map(tours)).toEqual([['basics'], ['levelUp'], ['fireMine'], ['iceMine'], ['infuse'], ['fuse']]);
    for (let i = 6; i < roundCount(FIRST_OUTBREAK); i++) expect(tours(i)).toEqual([]);
  });

  it('cada paso tiene su frase en los dos idiomas', () => {
    for (const language of LANGUAGES) {
      const steps = text(language).tour.steps as Record<string, Record<string, unknown>>;
      for (const [tour, list] of Object.entries(TOURS)) {
        expect(text(language).tour.names[tour as TourId], `${language} ${tour}`).toBeTruthy();
        for (const step of list) expect(steps[tour]?.[step.id], `${language} ${tour}.${step.id}`).toBeDefined();
      }
    }
  });

  it('lo que hace el jugador completa el paso que lo ensena', () => {
    expect(cueOf({ type: 'sow', card: 'shooter' })).toBe('sowShooter');
    expect(cueOf({ type: 'sow', card: 'fire' })).toBe('sowFire');
    expect(cueOf({ type: 'sow', card: 'ice' })).toBe('sowIce');
    expect(cueOf({ type: 'infuse', element: 'ice', dragged: false })).toBe('infuseCard');
    expect(cueOf({ type: 'infuse', element: 'fire', dragged: true })).toBe('infuseMine');
    expect(cueOf({ type: 'fuse' })).toBe('fuse');
    // T-024: el muro, y el escudo infundido con la carta o arrastrando el muro.
    expect(cueOf({ type: 'sow', card: 'shield' })).toBe('sowWall');
    expect(cueOf({ type: 'infuse', element: 'shield', dragged: false })).toBe('infuseShield');
    expect(cueOf({ type: 'infuse', element: 'shield', dragged: true })).toBe('infuseShield');
  });

  it('cada poder tiene su tour (T-021), y recolocar se completa haciendolo', () => {
    for (const power of POWER_IDS) expect(TOURS[TOUR_OF_POWER[power]].length, power).toBeGreaterThan(0);
    expect(toursOfPowers(['iceWall', 'relocate'])).toEqual(['iceWall', 'relocate']);
    expect(toursOfPowers([])).toEqual([]);
    expect(cueOf({ type: 'powerPicked', power: 'relocate' })).toBe('pickRelocate');
    expect(cueOf({ type: 'power', power: 'relocate' })).toBe('relocate');
    // La granada y el muro solo van en el ataque (O-07): su paso se pasa con "Siguiente".
    expect(cueOf({ type: 'power', power: 'grenade' })).toBeNull();
    expect(TOURS.grenade.every((step) => step.doneWhen === null)).toBe(true);
    expect(TOURS.iceWall.every((step) => step.doneWhen === null)).toBe(true);
  });

  it('la ronda 2 del brote 2 trae el tour del escudo (T-024), y la 1 ninguno', () => {
    expect(toursOfRound('elkCloner', 0)).toEqual([]);
    expect(toursOfRound('elkCloner', 1)).toEqual(['shield']);
  });

  it('el tour del escudo acaba en el muro, y la infusion tiene el suyo en la ronda 2 del brote 3 (T-037)', () => {
    expect(TOURS.shield.map((step) => step.id)).toEqual(['wall', 'block']);
    expect(TOURS.shield.some((step) => step.doneWhen === 'infuseShield')).toBe(false);
    expect(TOUR_OF_FEATURE.shieldInfuse).toBe('shieldInfuse');
    expect(toursOfRound('brain', 0)).toEqual([]);
    expect(toursOfRound('brain', 1)).toEqual(['shieldInfuse']);
    // Con la carta o arrastrando un muro, el primer paso queda hecho; el del muro se ensena sin exigirlo.
    expect(TOURS.shieldInfuse.map((step) => step.doneWhen)).toEqual(['infuseShield', null]);
    expect(cueOf({ type: 'infuse', element: 'shield', dragged: true })).toBe('infuseShield');
  });

  it('un paso sin su objetivo en el tablero sale sin iluminarlo ni gesto (no se atasca)', () => {
    const step = TOURS.fuse[0];
    expect(placeStep(step, { spots: {}, areas: {} }, {})).toEqual({ shapes: [], gesture: null });
    const board: TourBoard = { spots: { fuseFrom: { x: 100, y: 200, rx: 20, ry: 30 }, fuseTo: { x: 180, y: 200, rx: 20, ry: 30 } }, areas: {} };
    const placed = placeStep(step, board, {});
    expect(placed.shapes).toHaveLength(2);
    expect(placed.gesture).toEqual({ kind: 'drag', from: { pageX: 100, pageY: 200 }, to: { pageX: 180, pageY: 200 }, carry: undefined });
  });

  it('una carta del HUD se ilumina con margen y el arrastre sale de su centro', () => {
    const step = TOURS.basics[0];
    expect(hudTargetsOf(step)).toEqual(['card-shooter']);
    const board: TourBoard = { spots: { sowCell: { x: 300, y: 500, rx: 40, ry: 25 } }, areas: {} };
    const placed = placeStep(step, board, { 'card-shooter': box(20, 10, 100, 40) });
    expect(placed.shapes[0]).toEqual({ kind: 'rect', box: box(14, 4, 112, 52) });
    expect(placed.gesture).toEqual({ kind: 'drag', from: { pageX: 70, pageY: 30 }, to: { pageX: 300, pageY: 500 }, carry: 'shooter' });
    // Sin la casilla, la carta sigue iluminada pero la mano no sabe a donde ir.
    expect(placeStep(step, null, { 'card-shooter': box(20, 10, 100, 40) }).gesture).toBeNull();
  });
});

describe('tours vistos (T-013, G-05)', () => {
  it('un tour visto deja de estar pendiente; con la ayuda apagada no hay ninguno', () => {
    const progress = markTourDone(emptyProgress(), 'basics');
    expect(pendingTours(FIRST_OUTBREAK, 0, progress, true)).toEqual([]);
    expect(pendingTours(FIRST_OUTBREAK, 1, progress, true)).toEqual(['levelUp']);
    expect(pendingTours(FIRST_OUTBREAK, 1, emptyProgress(), false)).toEqual([]);
    expect(markTourDone(progress, 'basics')).toBe(progress);
  });

  it('se guarda y se lee, y lo que no se entiende se ignora', () => {
    const memory = new Map<string, string>();
    const store = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) };
    const progress = hintShown(markTourDone(markTourDone(emptyProgress(), 'fuse'), 'basics'), 'droppedCoin');
    writeTourProgress(progress, store);
    expect(readTourProgress(store)).toEqual(progress);
    expect(parseTourProgress('{"done":["fuse","nope",3],"hints":{"droppedCoin":{"shown":"x","done":1}}}')).toEqual({
      done: ['fuse'],
      hints: { droppedCoin: { shown: 0, done: false } },
    });
    expect(parseTourProgress('no es json')).toEqual(emptyProgress());
    expect(readTourProgress({ getItem: () => { throw new Error('bloqueado'); }, setItem: () => {} })).toEqual(emptyProgress());
  });

  it('la pista de la moneda sale hasta que se aprende o hasta salir sus veces', () => {
    let progress = emptyProgress();
    for (let i = 0; i < HINT_MAX_SHOWS; i++) {
      expect(hintPending(progress, 'droppedCoin')).toBe(true);
      progress = hintShown(progress, 'droppedCoin');
    }
    expect(hintPending(progress, 'droppedCoin')).toBe(false);
    expect(hintPending(hintDone(emptyProgress(), 'droppedCoin'), 'droppedCoin')).toBe(false);
  });
});

describe('donde va el bocadillo (T-013)', () => {
  const size = { width: 320, height: 120 };
  const inside = (place: { left: number; top: number }, viewport: { width: number; height: number }) =>
    place.left >= BUBBLE_MARGIN &&
    place.top >= BUBBLE_MARGIN &&
    place.left + size.width <= viewport.width - BUBBLE_MARGIN &&
    place.top + size.height <= viewport.height - BUBBLE_MARGIN;

  it('junto a lo iluminado, sin taparlo y dentro de la pantalla', () => {
    const viewport = { width: 1600, height: 900 };
    for (const target of [box(700, 400, 120, 120), box(40, 20, 160, 50), box(1300, 780, 100, 100), box(700, 10, 140, 60)]) {
      const place = placeBubble(size, [target], viewport);
      expect(inside(place, viewport)).toBe(true);
      expect(overlap({ ...place, ...size }, target)).toBe(0);
    }
  });

  it('con dos cosas iluminadas no tapa ninguna', () => {
    const viewport = { width: 1600, height: 900 };
    const targets = [box(14, 4, 160, 56), box(300, 520, 90, 60)];
    const place = placeBubble(size, targets, viewport);
    for (const target of targets) expect(overlap({ ...place, ...size }, target)).toBe(0);
  });

  it('en un movil en horizontal tambien cabe y no tapa la casilla', () => {
    const viewport = { width: 568, height: 320 };
    const target = box(240, 150, 60, 50);
    const place = placeBubble({ width: 280, height: 96 }, [target], viewport);
    expect(place.left + 280).toBeLessThanOrEqual(viewport.width - BUBBLE_MARGIN);
    expect(place.top + 96).toBeLessThanOrEqual(viewport.height - BUBBLE_MARGIN);
    expect(overlap({ ...place, width: 280, height: 96 }, target)).toBe(0);
  });

  it('sin nada que iluminar va en el centro, algo bajo', () => {
    const place = placeBubble(size, [], { width: 1000, height: 600 });
    expect(place.left).toBe(340);
    expect(place.top).toBeGreaterThan(600 / 2 - size.height / 2);
  });

  it('esquiva lo que se le pide (la mano) si hay sitio', () => {
    const viewport = { width: 1600, height: 900 };
    const target = box(700, 300, 100, 100);
    const below = placeBubble(size, [target], viewport);
    const hand = { ...below, ...size };
    const place = placeBubble(size, [target], viewport, [hand]);
    expect(overlap({ ...place, ...size }, hand)).toBe(0);
  });
});

/** Lo que media cada frase de los tours en T-013, en letras, con la cuenta atras de la mina ("2 s"). */
const LENGTH_BEFORE_T032: Record<Language, Record<TourId, Record<string, number>>> = {
  es: {
    basics: { sow: 33, lane: 44, coins: 47, lives: 48, info: 43, go: 20 },
    levelUp: { pick: 20, up: 43 },
    fireMine: { sow: 29, boom: 42 },
    iceMine: { sow: 29, freeze: 43 },
    infuse: { card: 42, mine: 39 },
    fuse: { drag: 41 },
    // T-024: pasos nuevos, con lo que miden. T-037: la infusion del escudo pasa a su tour, con lo que mide.
    shield: { wall: 33, block: 33 },
    shieldInfuse: { card: 38, wall: 29 },
    // T-046: arrancar, con lo que mide.
    uproot: { pick: 35, pull: 45 },
    // T-021: los poderes, con lo que miden.
    relocate: { pick: 32, move: 38 },
    grenade: { throw: 41 },
    iceWall: { place: 45 },
  },
  en: {
    basics: { sow: 30, lane: 45, coins: 47, lives: 46, info: 38, go: 21 },
    levelUp: { pick: 13, up: 43 },
    fireMine: { sow: 26, boom: 52 },
    iceMine: { sow: 25, freeze: 50 },
    infuse: { card: 31, mine: 30 },
    fuse: { drag: 34 },
    shield: { wall: 31, block: 22 },
    shieldInfuse: { card: 32, wall: 38 },
    uproot: { pick: 33, pull: 36 },
    relocate: { pick: 26, move: 33 },
    grenade: { throw: 37 },
    iceWall: { place: 42 },
  },
};

describe('Boxer da los tours (T-032)', () => {
  it('la voz de todos los tours es Boxer', () => {
    expect(TOUR_GUIDE).toBe('boxer');
  });

  it.each(LANGUAGES)('%s: con su voz, ninguna frase es mas larga que la de antes (VT-01)', (language) => {
    setLanguage(language);
    const steps = text(language).tour.steps as Record<string, Record<string, string | ((countdown: string) => string)>>;
    for (const [tour, list] of Object.entries(TOURS)) {
      for (const step of list) {
        const entry = steps[tour][step.id];
        const phrase = typeof entry === 'function' ? entry(formatSeconds(MINE.countdownMs)) : entry;
        expect(Array.from(phrase).length, `${tour}.${step.id}: ${phrase}`).toBeLessThanOrEqual(LENGTH_BEFORE_T032[language][tour as TourId][step.id]);
      }
    }
    setLanguage('es');
  });
});
