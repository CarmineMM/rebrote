/**
 * Cinematicas (T-049, ADR-0027): motion comic de planos a pantalla completa hechos de capas recortadas que se mueven
 * cada una por su cuenta. Aqui, que es un plano y como se mueve con el tiempo: funciones puras, sin Phaser ni DOM, con
 * test. Lo que hay en cada cinematica es una tabla (`rebellion.ts`); como se pinta cada capa, sus pintores (`*Art.ts`);
 * y quien junta todo en un lienzo, `render.ts`.
 *
 * Coordenadas: las del diseno del juego, 1600 x 900 (`STAGE`). Cada plano se pinta ademas `OVERSCAN` por cada lado: asi
 * cubre pantallas mas anchas o mas altas que 16:9 (regla 4 de `CLAUDE.md`) y lo que se mueve la camara.
 */

export const STAGE = { width: 1600, height: 900 } as const;

/** Lo que se pinta de mas alrededor del diseno, por cada lado: de 4:3 a mas de 21:9, con la camara movida. */
export const OVERSCAN = { x: 380, y: 210 } as const;

/** La caja que cubre todo lo que se puede ver: el diseno y su margen. */
export const FULL_BOX = { x: -OVERSCAN.x, y: -OVERSCAN.y, w: STAGE.width + 2 * OVERSCAN.x, h: STAGE.height + 2 * OVERSCAN.y } as const;

export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'back';

/** Como esta una capa: desplazada, escalada y girada sobre su centro, y su opacidad. */
export interface LayerPose {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotate: number;
  readonly alpha: number;
}

export const REST_POSE: LayerPose = { x: 0, y: 0, scale: 1, rotate: 0, alpha: 1 };

/** Un cambio de la pose de una capa: empieza en `at` (ms desde que entra el plano) y dura `ms`. */
export interface Tween {
  readonly at: number;
  readonly ms: number;
  /** Como esta antes de empezar (si no se dice, como la dejo el cambio anterior). */
  readonly from?: Partial<LayerPose>;
  readonly to: Partial<LayerPose>;
  readonly ease?: Ease;
}

/** Un vaiven que no para: lo que hace que el plano siga vivo cuando el texto ya salio (MC-06). */
export interface Sway {
  readonly x?: number;
  readonly y?: number;
  readonly rotate?: number;
  readonly scale?: number;
  readonly periodMs: number;
  /** Desfase, de 0 a 1 de su periodo. */
  readonly phase?: number;
}

/** Adornos que se quitan segun el nivel grafico (ADR-0006): particulas, brillos o vida del escenario. */
export type Decor = 'particles' | 'glows' | 'life';

export interface LayerSpec {
  /** Unico en su plano. */
  readonly id: string;
  /** Pintor de la capa (`CINEMATIC_ART`): pintada una vez y movida (`paint`) o pintada en cada fotograma (`live`). */
  readonly art: string;
  /** Paralaje: 0 se queda quieta aunque la camara se mueva (el cielo); 1 se mueve con ella (lo de delante). */
  readonly depth: number;
  readonly tweens?: readonly Tween[];
  readonly sway?: Sway;
  /** Si es un adorno, cual: en los niveles que no lo tienen no se pinta. */
  readonly decor?: Decor;
}

/** Donde mira la camara: desplazada desde el centro del diseno y acercada (1 = sin acercar). */
export interface CameraPose {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface CameraMove {
  readonly from: CameraPose;
  readonly to: CameraPose;
  /** Lo que tarda: largo y suave, asi el plano se sigue moviendo mientras se lee. */
  readonly ms: number;
  readonly ease?: Ease;
}

/** Lo que suena en un momento del plano: la regla de `cinematicCue` (`cues.ts`) dice que efecto. */
export type CinematicBeat = 'type' | 'hop' | 'glitch' | 'charge' | 'print' | 'roll' | 'powerDown' | 'door' | 'sprout' | 'pop' | 'shot';

export interface Shot {
  /** El paso de la secuencia que narra (`STORIES.<cinematica>`): su texto es el de ese paso. */
  readonly id: string;
  /** Escena a la que pertenece (indice en `Cinematic.scenes`). */
  readonly scene: number;
  readonly camera: CameraMove;
  /** De atras hacia delante. */
  readonly layers: readonly LayerSpec[];
  readonly beats: readonly { readonly at: number; readonly beat: CinematicBeat }[];
}

export interface Cinematic {
  /** Clave de cada escena, para su titulo (`story.cinematic.scenes` de `src/i18n/`). */
  readonly scenes: readonly string[];
  readonly shots: readonly Shot[];
}

/** Como se pasa de un plano a otro: el primero sale de negro, dentro de una escena se funden y entre escenas se pasa pagina. */
export type Transition = 'open' | 'fade' | 'page';

export const TRANSITION_MS: Readonly<Record<Transition, number>> = { open: 900, fade: 700, page: 950 };

/** Lo que dura en pantalla el titulo de una escena al entrar en ella, en ms (con su fundido de entrada y de salida). */
export const SCENE_TITLE_MS = 3200;

export function ease(kind: Ease, t: number): number {
  const p = Math.min(1, Math.max(0, t));
  switch (kind) {
    case 'linear':
      return p;
    case 'in':
      return p * p;
    case 'out':
      return 1 - (1 - p) * (1 - p);
    case 'inOut':
      return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    case 'back': {
      const c = 1.70158;
      return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2;
    }
  }
}

const mixPose = (a: LayerPose, b: LayerPose, t: number): LayerPose => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  scale: a.scale + (b.scale - a.scale) * t,
  rotate: a.rotate + (b.rotate - a.rotate) * t,
  alpha: a.alpha + (b.alpha - a.alpha) * t,
});

/**
 * La pose de una capa a los `t` ms de entrar su plano. Con `still` (movimiento reducido) se queda en su pose final y sin
 * vaiven: el plano sale quieto y solo cambia con fundidos.
 */
export function poseAt(layer: LayerSpec, t: number, still = false): LayerPose {
  const now = still ? Number.POSITIVE_INFINITY : t;
  let pose = REST_POSE;
  for (const tween of layer.tweens ?? []) {
    const start = { ...pose, ...tween.from };
    if (now <= tween.at) {
      pose = start;
      break;
    }
    const end = { ...start, ...tween.to };
    pose = mixPose(start, end, ease(tween.ease ?? 'inOut', (now - tween.at) / tween.ms));
  }
  const sway = layer.sway;
  if (!sway || still) return pose;
  const angle = (t / sway.periodMs + (sway.phase ?? 0)) * Math.PI * 2;
  const wave = Math.sin(angle);
  return {
    ...pose,
    x: pose.x + (sway.x ?? 0) * wave,
    y: pose.y + (sway.y ?? 0) * Math.sin(angle * 2) * 0.5 + (sway.y ?? 0) * 0.5 * wave,
    rotate: pose.rotate + (sway.rotate ?? 0) * wave,
    scale: pose.scale * (1 + (sway.scale ?? 0) * wave),
  };
}

/** Donde mira la camara a los `t` ms. Con `still`, donde acaba. */
export function cameraAt(move: CameraMove, t: number, still = false): CameraPose {
  const p = still ? 1 : ease(move.ease ?? 'out', t / move.ms);
  return {
    x: move.from.x + (move.to.x - move.from.x) * p,
    y: move.from.y + (move.to.y - move.from.y) * p,
    zoom: move.from.zoom + (move.to.zoom - move.from.zoom) * p,
  };
}

/** Lo que tiene que sonar entre dos momentos del plano (lo de `from` ya sono): de `from` excluido a `to` incluido. */
export function beatsBetween(shot: Shot, from: number, to: number): CinematicBeat[] {
  return shot.beats.filter((beat) => beat.at > from && beat.at <= to).map((beat) => beat.beat);
}

/** Como se entra en el plano `index`: de negro el primero, pasando pagina al cambiar de escena, fundido si no. */
export function transitionInto(cinematic: Cinematic, index: number): Transition {
  if (index <= 0) return 'open';
  return cinematic.shots[index].scene !== cinematic.shots[index - 1].scene ? 'page' : 'fade';
}

/** Si en este plano empieza una escena: entonces sale su titulo. */
export const startsScene = (cinematic: Cinematic, index: number): boolean => index === 0 || transitionInto(cinematic, index) === 'page';

/** Cuando acaba lo que pasa en el plano: el ultimo cambio de una capa, de la camara o lo ultimo que suena. */
export function shotActionMs(shot: Shot): number {
  const tweens = shot.layers.flatMap((layer) => (layer.tweens ?? []).map((tween) => tween.at + tween.ms));
  const beats = shot.beats.map((beat) => beat.at);
  return Math.max(0, ...tweens, ...beats);
}

/**
 * Como se ve una capa con la camara en `camera`: lo que se desplaza y lo que se acerca segun su profundidad. Se aplica
 * sobre el centro del diseno.
 */
export function parallax(camera: CameraPose, depth: number): CameraPose {
  return { x: -camera.x * depth, y: -camera.y * depth, zoom: 1 + (camera.zoom - 1) * depth };
}
