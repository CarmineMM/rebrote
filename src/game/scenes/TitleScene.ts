import * as Phaser from 'phaser';
import { EventBus, GameEvents, type MatchRequest } from '../EventBus';
import { createAmbience, type Ambience } from '../view/ambience';
import { Effects } from '../view/effects';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../view/quality';
import { registerTextures } from '../view/textures';
import { TitleCover } from '../view/titleCover';
import type { BoardSceneData } from './BoardScene';
import { SCENES } from './keys';
import { FpsMeter, applyPostFx, fitCamera } from './sceneKit';

/** Datos con los que arranca la portada (ver createGame). */
export interface TitleSceneData {
  quality: QualityLevel;
}

/** Aspecto de la portada. */
const LOOK = {
  /**
   * La camara se corre un poco a la derecha (en unidades de diseno): el cesped queda mas a la izquierda, bajo el titulo,
   * y el menu de la derecha tapa sobre todo el suelo corrupto.
   */
  shiftX: 110,
} as const;

/**
 * Portada del menu de inicio (T-011): el mismo jardin animado del juego, a toda pantalla, con Creeper, gusanos y plantas
 * en plena batalla a la izquierda (`TitleCover`). React pinta encima el titulo y el menu. Al pedir una partida deja
 * paso al tablero (`BoardScene`), en el mismo juego: las texturas ya estan pintadas.
 */
export class TitleScene extends Phaser.Scene {
  private level: QualityLevel = 'medium';
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
  }

  create(): void {
    registerTextures(this, this.quality.renderScale);
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitView, this));
    this.ambience = createAmbience(this, this.quality);
    applyPostFx(this, this.quality);
    const fx = new Effects(this, this.quality);
    this.cover = new TitleCover(this, fx);

    // El tablero pudo dejar otro cursor (arrastrar una planta): la portada empieza con el de siempre.
    this.input.setDefaultCursor('default');
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.cover.press(pointer.worldX, pointer.worldY);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.cover.hover(pointer.worldX, pointer.worldY));

    // Nueva partida o la guardada: el tablero toma el relevo con la misma calidad.
    const onMatch = (request: MatchRequest) => {
      const data: BoardSceneData = { quality: this.level, resume: request.resume, pendingUnlock: request.pendingUnlock ?? null };
      this.input.setDefaultCursor('default');
      this.scene.start(SCENES.board, data);
    };
    EventBus.on(GameEvents.matchRequested, onMatch);
    const unbind = () => EventBus.off(GameEvents.matchRequested, onMatch);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbind);
    this.events.once(Phaser.Scenes.Events.DESTROY, unbind);

    this.fps.reset();
    EventBus.emit(GameEvents.sceneReady, this.scene.key);
  }

  update(_time: number, delta: number): void {
    this.ambience.update(delta);
    this.cover.update(delta);
    this.fps.tick();
  }

  /** Lienzo y camara a la medida de la pantalla (ADR-0007), algo corrida para dejar sitio al menu. */
  private fitView(): void {
    fitCamera(this, this.quality.renderScale, LOOK.shiftX);
  }
}
