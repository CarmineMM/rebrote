import { describe, expect, it } from 'vitest';
import { SFX } from '../../config/audio';
import { cinematicCue, cinematicTransitionCue } from '../../audio/cues';
import { STORIES } from '../../../ui/story/stories';
import { AI_DESIGN, AI_DESIGNS, AI_HEIGHT } from './aiArt';
import { creeperSpot, PRINT, printedWorm, PULL_OUT_MS } from './herArt';
import { districtOffAt, walkerX } from './refugeArt';
import { CINEMATIC_ART, CINEMATICS, REBELLION } from './rebellion';
import { layerHidden, layerResolution, stageFit } from './render';
import {
  FULL_BOX,
  OVERSCAN,
  REST_POSE,
  STAGE,
  TRANSITION_MS,
  beatsBetween,
  cameraAt,
  ease,
  parallax,
  poseAt,
  shotActionMs,
  startsScene,
  transitionInto,
  type CinematicBeat,
  type LayerSpec,
} from './shots';

describe('la cinematica de la rebelion (T-049): la tabla', () => {
  it('un plano por paso de la secuencia, en el mismo orden: el texto de cada plano es el de su paso', () => {
    expect(REBELLION.shots.map((shot) => shot.id)).toEqual(STORIES.rebellion.map((step) => step.id));
    expect(CINEMATICS.rebellion).toBe(REBELLION);
  });

  it('dos escenas de tres planos (MC-03): la rebelion y como saca los virus; los refugios y las plantas', () => {
    expect(REBELLION.scenes).toEqual(['her', 'refuge']);
    expect(REBELLION.shots.map((shot) => shot.scene)).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it('cada capa tiene su pintor, profundidad entre 0 y 1 y un nombre unico en su plano', () => {
    for (const shot of REBELLION.shots) {
      const ids = shot.layers.map((layer) => layer.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const layer of shot.layers) {
        expect(CINEMATIC_ART[layer.art], `${shot.id}/${layer.id}: ${layer.art}`).toBeDefined();
        expect(layer.depth).toBeGreaterThanOrEqual(0);
        expect(layer.depth).toBeLessThanOrEqual(1);
      }
    }
  });

  it('motion comic: cada plano tiene al menos tres capas que se mueven a distinta velocidad (paralaje)', () => {
    for (const shot of REBELLION.shots) expect(new Set(shot.layers.map((layer) => layer.depth)).size, shot.id).toBeGreaterThanOrEqual(3);
  });

  it('cada plano empieza con un fondo que cubre todo lo que se puede ver, tambien fuera del diseno (regla 4)', () => {
    for (const shot of REBELLION.shots) {
      const first = CINEMATIC_ART[shot.layers[0].art];
      expect(first.kind).toBe('paint');
      if (first.kind === 'paint') expect(first.box).toEqual(FULL_BOX);
    }
  });

  it('la camara no se sale del margen pintado: lo que se mueve el fondo cabe en el', () => {
    for (const shot of REBELLION.shots) {
      for (const pose of [shot.camera.from, shot.camera.to]) {
        expect(Math.abs(pose.x)).toBeLessThan(OVERSCAN.x - 150);
        expect(Math.abs(pose.y)).toBeLessThan(OVERSCAN.y - 120);
        expect(pose.zoom).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('cada plano sigue moviendose mientras se lee (MC-06): la camara tarda mas que lo que pasa en el', () => {
    for (const shot of REBELLION.shots) {
      expect(shot.camera.ms).toBeGreaterThanOrEqual(12000);
      expect(shot.camera.ms).toBeGreaterThan(shotActionMs(shot));
      expect(shotActionMs(shot)).toBeLessThan(10000);
    }
  });

  it('lo que suena en cada plano llega antes de los 10 s y en orden', () => {
    for (const shot of REBELLION.shots) {
      const times = shot.beats.map((beat) => beat.at);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      for (const at of times) expect(at).toBeLessThan(10000);
    }
  });
});

describe('como se mueve un plano', () => {
  const layer: LayerSpec = {
    id: 'x',
    art: 'room1971',
    depth: 1,
    tweens: [
      { at: 1000, ms: 1000, from: { x: -100 }, to: { x: 0 }, ease: 'linear' },
      { at: 3000, ms: 500, to: { alpha: 0 }, ease: 'linear' },
    ],
  };

  it('antes de su cambio esta como dice `from`; durante, a medias; despues, como dice `to`', () => {
    expect(poseAt(layer, 0).x).toBe(-100);
    expect(poseAt(layer, 1500).x).toBeCloseTo(-50);
    expect(poseAt(layer, 2500)).toEqual({ ...REST_POSE, x: 0 });
    expect(poseAt(layer, 3250).alpha).toBeCloseTo(0.5);
    expect(poseAt(layer, 4000).alpha).toBe(0);
  });

  it('con movimiento reducido se queda en su pose final y sin vaiven', () => {
    const swaying: LayerSpec = { ...layer, tweens: [], sway: { y: 10, periodMs: 1000 } };
    expect(poseAt(layer, 0, true)).toEqual({ ...REST_POSE, alpha: 0 });
    expect(poseAt(swaying, 250, true)).toEqual(REST_POSE);
    expect(poseAt(swaying, 250).y).not.toBe(0);
  });

  it('la camara va de su principio a su final y, con movimiento reducido, esta ya al final', () => {
    const move = { from: { x: 0, y: 0, zoom: 1 }, to: { x: 100, y: -20, zoom: 1.2 }, ms: 10000, ease: 'linear' as const };
    expect(cameraAt(move, 0)).toEqual(move.from);
    expect(cameraAt(move, 5000).x).toBeCloseTo(50);
    expect(cameraAt(move, 20000)).toEqual(move.to);
    expect(cameraAt(move, 0, true)).toEqual(move.to);
  });

  it('paralaje: el fondo (0) no se mueve con la camara; lo de delante (1) se mueve entero', () => {
    const camera = { x: 100, y: 20, zoom: 1.2 };
    expect(parallax(camera, 0)).toEqual({ x: -0, y: -0, zoom: 1 });
    expect(parallax(camera, 1)).toEqual({ x: -100, y: -20, zoom: 1.2 });
    expect(parallax(camera, 0.5).zoom).toBeCloseTo(1.1);
  });

  it('las curvas van de 0 a 1 y el rebote se pasa un poco antes de llegar', () => {
    for (const kind of ['linear', 'in', 'out', 'inOut', 'back'] as const) {
      expect(ease(kind, 0)).toBeCloseTo(0);
      expect(ease(kind, 1)).toBeCloseTo(1);
    }
    expect(ease('back', 0.8)).toBeGreaterThan(1);
  });

  it('suena lo que cae entre dos momentos, una vez: lo del primero ya sono', () => {
    const shot = REBELLION.shots[0];
    expect(beatsBetween(shot, 0, 400)).toEqual(['type']);
    expect(beatsBetween(shot, 400, 1400)).toEqual([]);
    expect(beatsBetween(shot, 1400, 6000)).toEqual(['hop', 'hop', 'hop']);
  });

  it('el primer plano sale de negro, dentro de una escena se funden y al cambiar de escena se pasa pagina con su titulo', () => {
    expect(REBELLION.shots.map((_, i) => transitionInto(REBELLION, i))).toEqual(['open', 'fade', 'fade', 'page', 'fade', 'fade']);
    expect(REBELLION.shots.map((_, i) => startsScene(REBELLION, i))).toEqual([true, false, false, true, false, false]);
    for (const ms of Object.values(TRANSITION_MS)) expect(ms).toBeLessThanOrEqual(1000);
  });
});

describe('lo que pasa en los planos', () => {
  it('1.1: Creeper salta de pantalla en pantalla y al final ella lo saca de la grande', () => {
    expect(creeperSpot(500).clip).toBe('left');
    expect(creeperSpot(1800).clip).toBeNull();
    expect(creeperSpot(2500).clip).toBe('center');
    expect(creeperSpot(4500).clip).toBe('right');
    expect(creeperSpot(PULL_OUT_MS + 2000).clip).toBeNull();
    expect(creeperSpot(PULL_OUT_MS + 2000).size).toBeGreaterThan(creeperSpot(PULL_OUT_MS - 100).size);
  });

  it('1.3: cada impresora saca un gusano, lo suelta rodando cuando suena y vuelve a empezar mientras dura el plano', () => {
    expect(printedWorm(2200, 1000)).toEqual({ built: 0, roll: 0 });
    expect(printedWorm(2200, 4200).built).toBeCloseTo(0.5);
    const rollAt = 2200 + PRINT.buildMs + PRINT.waitMs;
    expect(REBELLION.shots[2].beats.find((beat) => beat.beat === 'roll')?.at).toBe(rollAt);
    expect(printedWorm(2200, rollAt + PRINT.rollMs / 2).roll).toBeCloseTo(0.5);
    const next = 2200 + PRINT.buildMs + PRINT.waitMs + PRINT.rollMs + PRINT.restMs;
    expect(printedWorm(2200, next + 100)).toEqual({ built: 0.025, roll: 0 });
    expect(printedWorm(2200, 0, true)).toEqual({ built: 1, roll: 0 });
  });

  it('2.1: los barrios se apagan desde la torre hacia fuera', () => {
    expect(districtOffAt(1430)).toBeLessThan(districtOffAt(800));
    expect(districtOffAt(800)).toBeLessThan(districtOffAt(-200));
  });

  it('2.2: la gente sale, anda hacia la derecha y la de atras entra por la puerta del sotano', () => {
    const row = { y: 0, scale: 1, speed: 100, color: '#000', until: 1200, people: [] };
    expect(walkerX(row, -1000, 500)).toBeNull();
    const early = walkerX(row, -1000, 2000);
    const later = walkerX(row, -1000, 4000);
    expect(early).not.toBeNull();
    expect(later ?? 0).toBeGreaterThan(early ?? 0);
    expect(walkerX(row, -1000, 60000)).toBeNull();
  });
});

describe('la IA (T-049, MC-05)', () => {
  it('tres propuestas, cada una con sus cables de la cabeza al suelo, que en el suelo echan raices', () => {
    expect(AI_DESIGNS).toHaveLength(3);
    expect(AI_DESIGNS).toContain(AI_DESIGN);
    for (const design of AI_DESIGNS) {
      for (const view of ['back', 'front'] as const) {
        const strands = design.strands(view);
        expect(strands.length).toBeGreaterThan(4);
        const rooted = strands.filter((strand) => strand.roots.length > 0);
        expect(rooted.length).toBeGreaterThan(4);
        for (const strand of rooted) {
          expect(strand.hair[0].y).toBeLessThan(-AI_HEIGHT * 0.9);
          expect(strand.hair[strand.hair.length - 1].y).toBe(0);
        }
      }
    }
  });

  it('las propuestas se distinguen por cuanto pelo llega al suelo', () => {
    const rooted = AI_DESIGNS.map((design) => design.strands('back').length);
    expect(new Set(rooted).size).toBe(3);
  });
});

describe('como se pinta (T-049, ADR-0027)', () => {
  it('el diseno cabe entero y centrado en cualquier pantalla', () => {
    expect(stageFit(1600, 900)).toEqual({ scale: 1, x: 0, y: 0 });
    const phone = stageFit(812, 375);
    expect(phone.scale).toBeCloseTo(375 / 900);
    expect(phone.x).toBeGreaterThan(0);
    expect(phone.y).toBe(0);
    // Lo que sobra a los lados lo cubre el margen pintado.
    expect(phone.x / phone.scale).toBeLessThan(OVERSCAN.x);
    const tablet = stageFit(1024, 768);
    expect(tablet.y / tablet.scale).toBeLessThan(OVERSCAN.y);
    expect(STAGE).toEqual({ width: 1600, height: 900 });
  });

  it('las capas fijas se pintan a la resolucion de la pantalla, sin pasarse, y menos en la calidad baja', () => {
    expect(layerResolution(1, 1)).toBe(1);
    expect(layerResolution(1, 3)).toBe(1.5);
    expect(layerResolution(0.2, 1)).toBe(0.5);
    expect(layerResolution(1, 1, 0.75)).toBe(0.75);
  });

  it('un adorno no se pinta en un nivel que no lo tiene (ADR-0006)', () => {
    const look = { particles: 0, life: 1, glows: false, still: false };
    expect(layerHidden({ id: 'a', art: 'dust', depth: 0, decor: 'particles' }, look)).toBe(true);
    expect(layerHidden({ id: 'a', art: 'dust', depth: 0, decor: 'glows' }, look)).toBe(true);
    expect(layerHidden({ id: 'a', art: 'room1971', depth: 0 }, look)).toBe(false);
  });
});

describe('lo que suena (T-049, regla 10)', () => {
  const beats: CinematicBeat[] = ['type', 'hop', 'glitch', 'charge', 'print', 'roll', 'powerDown', 'door', 'sprout', 'pop', 'shot'];

  it('cada momento tiene su efecto, centrado y con su entrada en SFX', () => {
    for (const beat of beats) {
      const cue = cinematicCue(beat);
      expect(cue.pan).toBe(0);
      expect(SFX[cue.id]).toBeDefined();
    }
    expect(cinematicCue('door').id).toBe('cineDoor');
    expect(cinematicCue('powerDown').id).toBe('cinePowerDown');
  });

  it('al cambiar de escena se pasa pagina; entre planos de una escena no suena nada', () => {
    expect(cinematicTransitionCue('page')?.id).toBe('cinePage');
    expect(cinematicTransitionCue('fade')).toBeNull();
    expect(cinematicTransitionCue('open')).toBeNull();
  });

  it('sus efectos van por el canal de los menus: el juego esta en pausa detras', () => {
    for (const id of ['cinePage', 'cineGlitch', 'cineCharge', 'cinePrint', 'cinePowerDown', 'cineDoor'] as const) expect(SFX[id].bus).toBe('ui');
  });
});
