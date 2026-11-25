import * as Phaser from 'phaser';
import { EventBus, GameEvents, type MatchRequest, type MenuPlace } from '../EventBus';
import { createAmbience, type Ambience } from '../view/ambience';
import { Effects } from '../view/effects';
import { bossCutouts, cinematicCutouts, nurseryPortraits } from '../view/portrait';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../view/quality';
import { createRefuge } from '../view/refuge';
import { registerRefugeTextures, registerTextures } from '../view/textures';
import { TitleCover } from '../view/titleCover';
import type { BoardSceneData } from './BoardScene';
import { SCENES } from './keys';
import { FpsMeter, applyPostFx, fitCamera } from './sceneKit';

/** Datos con los que arranca la portada (ver createGame). */
export interface TitleSceneData {
  quality: QualityLevel;
  /** Portada (la batalla de Creeper) o Invernadero (el refugio de noche, T-036). Sin el, la portada. */
  place?: MenuPlace;
  /** Viene de cambiar de sitio: entra con un fundido. */
  fadeIn?: boolean;
}

/** Aspecto de la portada. */
const LOOK = {
  /**
   * La camara se corre un poco a la derecha (en unidades de diseno): el cesped queda mas a la izquierda, bajo el titulo,
   * y el menu de la derecha tapa sobre todo el suelo corrupto.
   */
  shiftX: 110,
  /** Fundido al pasar de la portada al Invernadero o al reves (T-019), de salida y de entrada, y su color (el del juego). */
  fadeOutMs: 180,
  fadeInMs: 320,
  fade: { r: 29, g: 43, b: 31 },
} as const;

/**
 * Portada del menu de inicio (T-011): el mismo jardin animado del juego, a toda pantalla, con Creeper, gusanos y plantas
 * en plena batalla a la izquierda (`TitleCover`). React pinta encima el titulo y el menu. Al pedir una partida deja
 * paso al tablero (`BoardScene`), en el mismo juego: las texturas ya estan pintadas.
 *
 * En el Invernadero (T-019) no hay jardin ni batalla: es el refugio de noche (T-036, `createRefuge`), con el Laboratorio
 * de Patty que React pinta encima. Al pasar de un sitio a otro la escena se funde y vuelve a empezar en el nuevo.
 */
export class TitleScene extends Phaser.Scene {
  private level: QualityLevel = 'medium';
  private place: MenuPlace = 'cover';
  private fadeIn = false;
  /** Ya se esta fundiendo para cambiar de sitio: otro cambio no lo interrumpe. */
  private leaving = false;
  private quality: QualityProfile = QUALITY_PROFILES.medium;
  /** La portada; en el Invernadero no hay ni jardin ni batalla. */
  private ambience: Ambience | null = null;
  private cover: TitleCover | null = null;
  private readonly fps = new FpsMeter();

  constructor() {
    super(SCENES.title);
  }

  init(data: Partial<TitleSceneData>): void {
    this.level = data.quality ?? 'medium';
    this.quality = QUALITY_PROFILES[this.level];
    this.place = data.place ?? 'cover';
    this.fadeIn = data.fadeIn === true;
    this.leaving = false;
  }

  create(): void {
    registerTextures(this, this.quality.renderScale);
    const greenhouse = this.place === 'greenhouse';
    // El refugio se pinta la primera vez que se entra en el Invernadero; despues se queda en el juego.
    if (greenhouse) registerRefugeTextures(this);
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitView, this));
    if (greenhouse) {
      this.ambience = null;
      this.cover = null;
      createRefuge(this, this.quality);
    } else {
      this.ambience = createAmbience(this, this.quality);
      this.cover = new TitleCover(this, new Effects(this, this.quality));
    }
    applyPostFx(this, this.quality);
    if (this.fadeIn) this.cameras.main.fadeIn(LOOK.fadeInMs, LOOK.fade.r, LOOK.fade.g, LOOK.fade.b);

    // El tablero pudo dejar otro cursor (arrastrar una planta): la portada empieza con el de siempre.
    this.input.setDefaultCursor('default');
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.cover?.press(pointer.worldX, pointer.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.cover?.hover(pointer.worldX, pointer.worldY));

    // Nueva partida o la guardada: el tablero toma el relevo con la misma calidad.
    const onMatch = (request: MatchRequest) => {
      const data: BoardSceneData = {
        quality: this.level,
        resume: request.resume,
        outbreak: request.outbreak,
        loadout: request.loadout,
        baseLevel: request.baseLevel,
        pendingUnlock: request.pendingUnlock ?? null,
      };
      this.input.setDefaultCursor('default');
      this.scene.start(SCENES.board, data);
    };
    EventBus.on(GameEvents.matchRequested, onMatch);
    // Los jefes de la ruta de brotes (T-019), con las texturas ya pintadas: React solo los ensena.
    // Y la disparadora de cada nivel base, para el vivero del Laboratorio de Patty (T-023, T-036).
    const onStateRequested = () => {
      EventBus.emit(GameEvents.routeArt, bossCutouts(this));
      EventBus.emit(GameEvents.nurseryArt, nurseryPortraits(this));
      // Y lo que sale en la cinematica de la rebelion (T-049), que se vuelve a ver desde el Invernadero.
      EventBus.emit(GameEvents.cinematicArt, cinematicCutouts(this));
    };
    EventBus.on(GameEvents.stateRequested, onStateRequested);
    // Portada <-> Invernadero (T-019): fundido, y la escena vuelve a empezar en el otro sitio.
    const onPlace = (place: MenuPlace) => {
      if (place === this.place || this.leaving) return;
      this.leaving = true;
      const camera = this.cameras.main;
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.scene.restart({ quality: this.level, place, fadeIn: true } satisfies TitleSceneData),
      );
      camera.fadeOut(LOOK.fadeOutMs, LOOK.fade.r, LOOK.fade.g, LOOK.fade.b);
    };
    EventBus.on(GameEvents.menuPlaceChanged, onPlace);
    const unbind = () => {
      EventBus.off(GameEvents.matchRequested, onMatch);
      EventBus.off(GameEvents.stateRequested, onStateRequested);
      EventBus.off(GameEvents.menuPlaceChanged, onPlace);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbind);
    this.events.once(Phaser.Scenes.Events.DESTROY, unbind);

    this.fps.reset();
    onStateRequested();
    EventBus.emit(GameEvents.sceneReady, this.scene.key);
  }

  update(_time: number, delta: number): void {
    this.ambience?.update(delta);
    this.cover?.update(delta);
    this.fps.tick();
  }

  /** Lienzo y camara a la medida de la pantalla (ADR-0007); en la portada, algo corrida para dejar sitio al menu. */
  private fitView(): void {
    fitCamera(this, this.quality.renderScale, this.place === 'greenhouse' ? 0 : LOOK.shiftX);
  }
}
