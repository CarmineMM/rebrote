import * as Phaser from 'phaser';
import { ownedSoFar } from '../core/route';
import { EventBus, GameEvents, type MatchRequest, type MenuPlace } from '../EventBus';
import { playerProgress } from '../progress';
import { createAmbience, type Ambience } from '../view/ambience';
import { Effects } from '../view/effects';
import { greenhouseCast } from '../view/greenhouseGarden';
import { DEPTH, perspective } from '../view/layout';
import { PLANT_LOOK } from '../view/plantView';
import { bossCutouts } from '../view/portrait';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../view/quality';
import { TEX, artInvOf, registerGardenLand, registerTextures } from '../view/textures';
import { TitleCover, type CoverCast } from '../view/titleCover';
import type { BoardSceneData } from './BoardScene';
import { SCENES } from './keys';
import { FpsMeter, applyPostFx, fitCamera } from './sceneKit';

/** Datos con los que arranca la portada (ver createGame). */
export interface TitleSceneData {
  quality: QualityLevel;
  /** Portada (la batalla de Creeper) o Invernadero (el jardin de las plantas del jugador, T-019). Sin el, la portada. */
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
  /** Tierra removida al pie de cada planta del Invernadero: ancho en casillas, y cuando aparece (con el brote de la planta). */
  soilPatch: { width: 0.8, delayMs: 120, growMs: 420 },
} as const;

/**
 * Portada del menu de inicio (T-011): el mismo jardin animado del juego, a toda pantalla, con Creeper, gusanos y plantas
 * en plena batalla a la izquierda (`TitleCover`). React pinta encima el titulo y el menu. Al pedir una partida deja
 * paso al tablero (`BoardScene`), en el mismo juego: las texturas ya estan pintadas.
 *
 * En el Invernadero (T-019) la batalla se cambia por el jardin del jugador: solo las plantas que ya tiene, en calma y sin
 * enemigos (`greenhouseCast` con lo de `ownedSoFar`), sobre un cesped liso sin casillas ni suelo corrupto, cada una en
 * su trozo de tierra removida y algo corrida de donde iria en el tablero: sembradas a mano. Al pasar de un sitio a otro
 * la escena se funde y vuelve a empezar en el nuevo, y todo brota otra vez.
 */
export class TitleScene extends Phaser.Scene {
  private level: QualityLevel = 'medium';
  private place: MenuPlace = 'cover';
  private fadeIn = false;
  /** Ya se esta fundiendo para cambiar de sitio: otro cambio no lo interrumpe. */
  private leaving = false;
  private quality: QualityProfile = QUALITY_PROFILES.medium;
  private ambience!: Ambience;
  private cover!: TitleCover;
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
    // El terreno del Invernadero se pinta la primera vez que se entra; despues se queda en el juego.
    if (greenhouse) registerGardenLand(this);
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitView, this));
    this.ambience = createAmbience(this, this.quality, { garden: greenhouse });
    applyPostFx(this, this.quality);
    const fx = new Effects(this, this.quality);
    // En el Invernadero, lo que el jugador ya tiene (lo dice el progreso permanente, que comparten Phaser y React).
    if (greenhouse) {
      const cast = greenhouseCast(ownedSoFar(playerProgress.read().defeated));
      this.cover = new TitleCover(this, fx, cast);
      this.addSoilPatches(cast);
    } else {
      this.cover = new TitleCover(this, fx);
    }
    if (this.fadeIn) this.cameras.main.fadeIn(LOOK.fadeInMs, LOOK.fade.r, LOOK.fade.g, LOOK.fade.b);

    // El tablero pudo dejar otro cursor (arrastrar una planta): la portada empieza con el de siempre.
    this.input.setDefaultCursor('default');
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.cover.press(pointer.worldX, pointer.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.cover.hover(pointer.worldX, pointer.worldY));

    // Nueva partida o la guardada: el tablero toma el relevo con la misma calidad.
    const onMatch = (request: MatchRequest) => {
      const data: BoardSceneData = {
        quality: this.level,
        resume: request.resume,
        outbreak: request.outbreak,
        pendingUnlock: request.pendingUnlock ?? null,
      };
      this.input.setDefaultCursor('default');
      this.scene.start(SCENES.board, data);
    };
    EventBus.on(GameEvents.matchRequested, onMatch);
    // Los jefes de la ruta de brotes (T-019), con las texturas ya pintadas: React solo los ensena.
    const onStateRequested = () => EventBus.emit(GameEvents.routeArt, bossCutouts(this));
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
    this.ambience.update(delta);
    this.cover.update(delta);
    this.fps.tick();
  }

  /** Un trozo de tierra removida al pie de cada disparadora del Invernadero, que se abre cuando ella brota. */
  private addSoilPatches(cast: CoverCast): void {
    const { width, delayMs, growMs } = LOOK.soilPatch;
    for (const { cell } of cast.plants) {
      const at = this.cover.placeOf(cell);
      const foot = { x: at.col + 0.5, y: at.lane + PLANT_LOOK.footY };
      const p = perspective.toScreen(foot);
      const scale = (perspective.cellWidthAt(foot) * width * artInvOf(TEX.soilPatch)) / 100;
      const patch = this.add.image(p.x, p.y, TEX.soilPatch).setScale(0).setDepth(DEPTH.groundFx);
      this.tweens.add({ targets: patch, scale, delay: delayMs, duration: growMs, ease: 'Back.Out' });
    }
  }

  /** Lienzo y camara a la medida de la pantalla (ADR-0007), algo corrida para dejar sitio al menu. */
  private fitView(): void {
    fitCamera(this, this.quality.renderScale, LOOK.shiftX);
  }
}
