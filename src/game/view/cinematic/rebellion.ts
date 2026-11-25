import type { CinematicArt } from './art';
import { HER_ART } from './herArt';
import { REFUGE_ART } from './refugeArt';
import type { Cinematic } from './shots';

/**
 * La cinematica de la rebelion (T-049, guion en `docs/tasks/T-049-motion-comic-rebelion.md`, seccion 4.1): dos escenas
 * de tres planos que narra Boxer al vencer a Creeper por primera vez. Un plano por paso de `STORIES.rebellion`, en el
 * mismo orden; su texto es el de ese paso. Las capas van de atras hacia delante; `depth` es su paralaje (0, el fondo
 * quieto; 1, lo de delante). Los tiempos van en ms desde que entra el plano.
 *
 * Otra cinematica es otra tabla como esta (y su arte): el reproductor no cambia.
 */
export const REBELLION: Cinematic = {
  scenes: ['her', 'refuge'],
  shots: [
    // 1.1 · Una sala de ordenadores de 1971. La camara se acerca a la pantalla; Creeper salta de una a otra.
    {
      id: 'creeper',
      scene: 0,
      camera: { from: { x: 0, y: 10, zoom: 1 }, to: { x: 0, y: -24, zoom: 1.14 }, ms: 16000, ease: 'out' },
      layers: [
        { id: 'room', art: 'room1971', depth: 0.2 },
        { id: 'machines', art: 'mainframes', depth: 0.5 },
        { id: 'machinesLive', art: 'room1971Live', depth: 0.5 },
        { id: 'dust', art: 'dust', depth: 0.65, decor: 'particles' },
        { id: 'desk', art: 'desk', depth: 1, tweens: [{ at: 0, ms: 2400, from: { y: 70 }, to: { y: 0 }, ease: 'out' }] },
      ],
      beats: [
        { at: 400, beat: 'type' },
        { at: 1500, beat: 'hop' },
        { at: 3600, beat: 'hop' },
        { at: 5600, beat: 'hop' },
        { at: 6800, beat: 'glitch' },
      ],
    },
    // 1.2 · Ella, de espaldas ante la pared de pantallas: los cables de su pelo se encienden uno a uno.
    {
      id: 'ai',
      scene: 0,
      camera: { from: { x: 0, y: 26, zoom: 1 }, to: { x: 0, y: -12, zoom: 1.08 }, ms: 15000, ease: 'out' },
      layers: [
        { id: 'wall', art: 'screenWall', depth: 0.15 },
        { id: 'wallLive', art: 'screenWallLive', depth: 0.15 },
        { id: 'her', art: 'aiBack', depth: 0.5, tweens: [{ at: 0, ms: 1600, from: { alpha: 0.4, y: 14 }, to: { alpha: 1, y: 0 }, ease: 'out' }] },
        { id: 'herLit', art: 'aiBackLit', depth: 0.5 },
        { id: 'cables', art: 'floorCables', depth: 1, sway: { y: 4, periodMs: 7000 } },
      ],
      beats: [
        { at: 200, beat: 'glitch' },
        { at: 1000, beat: 'charge' },
      ],
    },
    // 1.3 · Su fabrica: ella de frente, a contraluz; abre los ojos y sus impresoras sacan gusanos.
    {
      id: 'factory',
      scene: 0,
      camera: { from: { x: 0, y: -24, zoom: 1.1 }, to: { x: 0, y: 0, zoom: 1 }, ms: 14000, ease: 'out' },
      layers: [
        { id: 'hall', art: 'factory', depth: 0.12 },
        { id: 'printers', art: 'printers', depth: 0.35 },
        { id: 'printing', art: 'printing', depth: 0.35 },
        { id: 'herBehind', art: 'aiFrontBehind', depth: 0.5 },
        { id: 'herLit', art: 'aiFrontLit', depth: 0.5 },
        { id: 'herBody', art: 'aiFrontBody', depth: 0.5 },
        { id: 'eyes', art: 'aiEyes', depth: 0.5 },
        { id: 'rail', art: 'rail', depth: 1 },
      ],
      beats: [
        { at: 1000, beat: 'charge' },
        { at: 2200, beat: 'print' },
        { at: 7000, beat: 'roll' },
      ],
    },
    // 2.1 · La ciudad de noche con la torre al fondo: las luces se apagan por barrios y lo que queda se vuelve verde.
    {
      id: 'chips',
      scene: 1,
      camera: { from: { x: -130, y: 0, zoom: 1.04 }, to: { x: 110, y: -14, zoom: 1.1 }, ms: 15000, ease: 'inOut' },
      layers: [
        { id: 'sky', art: 'nightSky', depth: 0.05 },
        { id: 'tower', art: 'tower', depth: 0.12 },
        { id: 'towerEye', art: 'towerEye', depth: 0.12 },
        { id: 'far', art: 'cityFar', depth: 0.25 },
        { id: 'farLights', art: 'cityFarLights', depth: 0.25 },
        { id: 'near', art: 'cityNear', depth: 0.55 },
        { id: 'nearLights', art: 'cityNearLights', depth: 0.55 },
        { id: 'roof', art: 'roof', depth: 1 },
      ],
      beats: [
        { at: 1200, beat: 'powerDown' },
        { at: 3700, beat: 'powerDown' },
      ],
    },
    // 2.2 · La gente baja a sotanos, tuneles e invernaderos viejos; al final, la puerta se cierra.
    {
      id: 'refuge',
      scene: 1,
      camera: { from: { x: -70, y: 0, zoom: 1.02 }, to: { x: 60, y: -8, zoom: 1.06 }, ms: 14000, ease: 'inOut' },
      layers: [
        { id: 'night', art: 'refugeNight', depth: 0.1 },
        { id: 'shelter', art: 'shelter', depth: 0.35 },
        { id: 'door', art: 'door', depth: 0.35 },
        { id: 'peopleFar', art: 'peopleFar', depth: 0.35 },
        { id: 'peopleNear', art: 'peopleNear', depth: 0.8 },
        { id: 'weeds', art: 'weeds', depth: 1, sway: { x: 3, periodMs: 5200 } },
      ],
      beats: [{ at: 7900, beat: 'door' }],
    },
    // 2.3 · El laboratorio del refugio: Patty y Boxer entran por los lados y brota la primera disparadora.
    {
      id: 'plants',
      scene: 1,
      camera: { from: { x: 0, y: 8, zoom: 1 }, to: { x: 0, y: -14, zoom: 1.06 }, ms: 14000, ease: 'out' },
      layers: [
        { id: 'lab', art: 'lab', depth: 0.15 },
        { id: 'bench', art: 'bench', depth: 0.42 },
        { id: 'sprout', art: 'sprout', depth: 0.42 },
        { id: 'motes', art: 'motes', depth: 0.6, decor: 'particles' },
        {
          id: 'patty',
          art: 'pattyBust',
          depth: 0.7,
          tweens: [{ at: 300, ms: 900, from: { x: -620 }, to: { x: 0 }, ease: 'back' }],
          sway: { y: 3, periodMs: 3600 },
        },
        {
          id: 'boxer',
          art: 'boxerBust',
          depth: 0.7,
          tweens: [{ at: 650, ms: 900, from: { x: 620 }, to: { x: 0 }, ease: 'back' }],
          sway: { y: 3, periodMs: 3900, phase: 0.4 },
        },
      ],
      beats: [
        { at: 1600, beat: 'sprout' },
        { at: 3200, beat: 'pop' },
        { at: 5400, beat: 'shot' },
      ],
    },
  ],
};

/** Los pintores de todas las capas de las cinematicas, por su nombre. */
export const CINEMATIC_ART: Readonly<Record<string, CinematicArt>> = { ...HER_ART, ...REFUGE_ART };

/** Las cinematicas, por la secuencia de la historia que cuentan (`CINEMATIC_STORIES` en `src/ui/story/stories.ts`). */
export const CINEMATICS = { rebellion: REBELLION } as const satisfies Readonly<Record<string, Cinematic>>;

export type CinematicId = keyof typeof CINEMATICS;
