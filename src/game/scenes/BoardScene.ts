import * as Phaser from 'phaser';
import { BOARD, ECONOMY } from '../config/balance';
import { cellAt, type BoardPoint, type Cell } from '../core/board';
import { rollKillReward } from '../core/economy';
import { createMatch, earn, plantBlocker, plantShooter, type CardId, type MatchState } from '../core/match';
import { EventBus, GameEvents, type PagePoint } from '../EventBus';
import { createAmbience, type Ambience } from '../view/ambience';
import { DEPTH, entityDepth, perspective, viewFor } from '../view/layout';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../view/quality';
import { SHOOTER_SIZE, TEX, artInv, registerTextures } from '../view/textures';

/** Solo aspecto y ritmo de las animaciones. Los numeros de juego viven en balance.ts. */
const LOOK = {
  highlightOk: 0xfff7d6,
  highlightBlocked: 0xff5a5f,
  /** Donde apoya la planta dentro de su casilla: un poco por delante del centro. */
  plantFootY: 0.62,
  /** Ancho de la textura de la planta en anchos de casilla. */
  plantWidth: 1.0,
  coinSize: 0.42,
  /** Altura a la que flota la moneda sobre el suelo, en anchos de casilla. */
  coinHover: 0.36,
  /** A partir de esta fraccion de su vida, la moneda soltada parpadea. */
  coinBlinkFrom: 0.7,
  /** Hacia donde vuelan las monedas cobradas: el saldo del HUD, medido desde la esquina superior derecha de la vista. */
  coinTargetFromCorner: { x: 150, y: 40 },
  textStyle: {
    fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif',
    fontSize: '30px',
    fontStyle: '900',
    color: '#ffe066',
    stroke: '#5a3d00',
    strokeThickness: 6,
  },
} as const;

const P = (x: number, y: number) => perspective.toScreen({ x, y });

/** Datos con los que arranca la escena (ver createGame). */
export interface BoardSceneData {
  quality: QualityLevel;
  /** Partida a continuar: se usa al cambiar el nivel grafico, que recrea el juego. */
  resume?: MatchState;
  /** Arrancar en pausa (por ejemplo, si se cambia la calidad desde el menu de pausa). */
  paused?: boolean;
}

/** Tablero, siembra y moneda. Las reglas viven en src/game/core/; aqui solo se pintan, se animan y se conectan. */
export class BoardScene extends Phaser.Scene {
  private match!: MatchState;
  private selected: CardId | null = null;
  /** Casilla bajo el puntero (o bajo la carta arrastrada), si cae en el tablero. */
  private hoverCell: Cell | null = null;
  private highlight!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private dirt!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private ambience!: Ambience;
  private quality: QualityProfile = QUALITY_PROFILES.medium;
  private resume: MatchState | undefined;
  /** Medicion de fps en tiempo real (el reloj del juego se frena cuando va lento, no sirve para esto). */
  private fpsWindowStart = 0;
  private fpsFrames = 0;
  /** Pausa pedida por el HUD. Phaser marca la escena como activa al terminar create(): se aplica despues. */
  private wantPaused = false;
  private created = false;

  constructor() {
    super('BoardScene');
  }

  init(data: Partial<BoardSceneData>): void {
    this.quality = QUALITY_PROFILES[data.quality ?? 'medium'];
    this.resume = data.resume;
    this.wantPaused = data.paused ?? false;
    this.created = false;
  }

  create(): void {
    this.match = this.resume ?? createMatch();
    this.selected = null;
    this.hoverCell = null;

    registerTextures(this, this.quality.renderScale);
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitView, this));
    this.ambience = createAmbience(this, this.quality);
    this.applyPostFx();
    this.createCursorFeedback();
    this.createEffects();
    this.restorePlants();

    this.bindPointer();
    this.bindHud();
    this.time.addEvent({
      delay: ECONOMY.passiveIntervalMs,
      loop: true,
      callback: () => this.credit(ECONOMY.passiveIncome),
    });
    if (import.meta.env.DEV) this.bindDebugKeys();
    this.fpsWindowStart = performance.now();
    this.fpsFrames = 0;

    this.events.once(Phaser.Scenes.Events.CREATE, () => {
      this.created = true;
      this.applyPause(this.wantPaused);
    });

    EventBus.emit(GameEvents.sceneReady, this.scene.key);
    this.emitState();
  }

  /**
   * Pantalla completa sin bandas (ADR-0007): el lienzo toma la proporcion de la pantalla y la camara
   * muestra el diseno entero mas el decorado extra que haga falta. Todo sigue en coordenadas de diseno.
   */
  private fitView(): void {
    const { width: parentWidth, height: parentHeight } = this.scale.parentSize;
    const view = viewFor(parentWidth / parentHeight);
    const zoom = this.quality.renderScale;
    const width = Math.max(1, Math.round(view.width * zoom));
    const height = Math.max(1, Math.round(view.height * zoom));
    if (Math.abs(this.scale.width - width) > 1 || Math.abs(this.scale.height - height) > 1) {
      // Vuelve a emitir RESIZE; la segunda vez los tamanos ya coinciden y solo se recoloca la camara.
      this.scale.setGameSize(width, height);
      return;
    }
    this.cameras.main
      .setSize(this.scale.width, this.scale.height)
      .setZoom(zoom)
      .centerOn(view.x + view.width / 2, view.y + view.height / 2);
  }

  /** Congela la escena entera (temporizadores, tweens, particulas, input); se sigue viendo detras del menu. */
  private applyPause(paused: boolean): void {
    this.wantPaused = paused;
    if (!this.created) return;
    if (paused && this.sys.isActive()) {
      this.scene.pause();
    } else if (!paused && this.sys.isPaused()) {
      this.scene.resume();
      // La pausa no cuenta como fotogramas lentos.
      this.fpsWindowStart = performance.now();
      this.fpsFrames = 0;
    }
  }

  /** Estado de la partida para continuarla en un juego nuevo (al cambiar el nivel grafico). */
  snapshot(): MatchState {
    return this.match;
  }

  update(_time: number, delta: number): void {
    this.ambience.update(delta);
    this.sampleFps();
  }

  /** Cada segundo real avisa al HUD de los fps (contador y modo automatico de ADR-0006). */
  private sampleFps(): void {
    this.fpsFrames++;
    const now = performance.now();
    const elapsed = now - this.fpsWindowStart;
    if (elapsed < 1000) return;
    EventBus.emit(GameEvents.fpsSampled, Math.round((this.fpsFrames * 1000) / elapsed));
    this.fpsWindowStart = now;
    this.fpsFrames = 0;
  }

  /**
   * Recompensa por enemigo eliminado en `at` (punto del tablero). La llamara el combate de T-002.
   * La mayoria de las veces se cobra sola; a veces la moneda queda en el suelo.
   */
  rewardKill(at: BoardPoint, random?: () => number): void {
    const reward = rollKillReward(undefined, random);
    if (reward.kind === 'auto') {
      this.credit(reward.amount, at);
    } else {
      this.spawnDroppedCoin(at, reward.amount);
    }
  }

  // -------------------------------------------------------------------------
  // Preparacion

  /**
   * Ultra: color algo mas vivo y una vineta muy suave que centra la mirada en el cesped.
   * Ambos filtros leen un pixel por pixel. Se descarto el tilt-shift: 100 lecturas por pixel a doble resolucion.
   */
  private applyPostFx(): void {
    if (!this.quality.postFx) return;
    const filters = this.cameras.main.filters.external;
    const grade = filters.addColorMatrix();
    grade.colorMatrix.saturate(0.18);
    grade.colorMatrix.brightness(1.03, true);
    // En la vineta de Phaser el oscurecimiento crece casi en linea desde el centro: fuerza baja o apaga la escena.
    filters.addVignette(0.5, 0.55, 0.75, 0.07, 0x10240f);
  }

  /** Al continuar una partida, vuelve a plantar lo que ya estaba sembrado. */
  private restorePlants(): void {
    this.match.plants.forEach((lane, laneIndex) =>
      lane.forEach((plant, col) => {
        if (plant) this.drawShooter({ lane: laneIndex, col });
      }),
    );
  }

  private textStyle(fontSize?: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      ...LOOK.textStyle,
      ...(fontSize ? { fontSize: `${fontSize}px` } : {}),
      // Con la camara ampliada, el texto se rasteriza a la misma resolucion para que no se vea borroso.
      resolution: this.quality.renderScale,
    };
  }

  private createCursorFeedback(): void {
    this.highlight = this.add.graphics().setDepth(DEPTH.highlight).setVisible(false);
    this.tweens.add({ targets: this.highlight, alpha: 0.55, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Planta fantasma: muestra donde quedara la disparadora antes de soltarla.
    this.ghost = this.add
      .image(0, 0, TEX.shooter)
      .setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height)
      .setAlpha(0.55)
      .setVisible(false);
    this.tweens.add({ targets: this.ghost, alpha: 0.3, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private createEffects(): void {
    this.dirt = this.add
      .particles(0, 0, TEX.dirt, {
        emitting: false,
        speed: { min: 70, max: 190 },
        angle: { min: -160, max: -20 },
        gravityY: 520,
        lifespan: 650,
        scale: { start: artInv(), end: 0.3 * artInv() },
        alpha: { start: 1, end: 0 },
      })
      .setDepth(DEPTH.foreground - 1);
    this.sparkles = this.add
      .particles(0, 0, TEX.dot, {
        emitting: false,
        speed: { min: 60, max: 180 },
        lifespan: 550,
        scale: { start: 0.9 * artInv(), end: 0 },
        tint: [0xffe680, 0xffffff, 0xfff1a8],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.floatText - 1);
  }

  private bindPointer(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      this.hover(this.cellAtScreen(pointer.worldX, pointer.worldY));
    });
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.hover(null));

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (pointer.rightButtonDown()) {
          this.select(null);
          return;
        }
        // Un clic sobre una moneda la recoge; no debe sembrar en la casilla de debajo.
        if (over.length > 0) return;
        this.tryPlant(this.cellAtScreen(pointer.worldX, pointer.worldY));
      },
    );

    // Esc lo gestiona el HUD: cancela la carta elegida o abre el menu de pausa.
  }

  private bindHud(): void {
    // En pausa la escena no atiende ordenes del HUD (el menu las tapa, pero por si acaso).
    const running = () => this.sys.isActive();
    const onPicked = (card: CardId) => running() && this.select(card);
    const onCancelled = () => this.select(null);
    const onDragged = (point: PagePoint) => running() && this.hover(this.cellAtPage(point));
    const onDropped = (point: PagePoint) => {
      if (!running()) return;
      const cell = this.cellAtPage(point);
      // Soltar fuera del tablero (o un simple clic en la carta) no cobra ni siembra: la carta sigue elegida.
      if (cell) this.tryPlant(cell);
    };
    const onStateRequested = () => this.emitState();
    const onPause = (paused: boolean) => this.applyPause(paused);

    EventBus.on(GameEvents.cardPicked, onPicked);
    EventBus.on(GameEvents.selectionCancelled, onCancelled);
    EventBus.on(GameEvents.cardDragged, onDragged);
    EventBus.on(GameEvents.cardDropped, onDropped);
    EventBus.on(GameEvents.stateRequested, onStateRequested);
    EventBus.on(GameEvents.pauseChanged, onPause);

    const unbind = () => {
      EventBus.off(GameEvents.cardPicked, onPicked);
      EventBus.off(GameEvents.selectionCancelled, onCancelled);
      EventBus.off(GameEvents.cardDragged, onDragged);
      EventBus.off(GameEvents.cardDropped, onDropped);
      EventBus.off(GameEvents.stateRequested, onStateRequested);
      EventBus.off(GameEvents.pauseChanged, onPause);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbind);
    this.events.once(Phaser.Scenes.Events.DESTROY, unbind);
  }

  /** Atajos solo en desarrollo para probar la moneda hasta que existan enemigos (T-002). */
  private bindDebugKeys(): void {
    const randomSpot = (): BoardPoint => ({
      x: Phaser.Math.FloatBetween(0.3, BOARD.columns - 0.3),
      y: Phaser.Math.Between(0, BOARD.lanes - 1) + 0.5,
    });
    // K: simula un enemigo eliminado con la probabilidad real.
    this.input.keyboard?.on('keydown-K', () => this.rewardKill(randomSpot()));
    // D: simula un enemigo eliminado que siempre suelta la moneda.
    this.input.keyboard?.on('keydown-D', () => this.rewardKill(randomSpot(), () => 0));
  }

  // -------------------------------------------------------------------------
  // Puntero y casillas

  private cellAtScreen(x: number, y: number): Cell | null {
    const point = perspective.toBoard({ x, y });
    return point ? cellAt(point) : null;
  }

  /**
   * El canvas se escala con Scale.FIT y la camara amplia segun el nivel grafico:
   * coordenadas DOM -> pixeles del lienzo -> coordenadas de diseno (mundo).
   */
  private cellAtPage(point: PagePoint): Cell | null {
    this.scale.updateBounds();
    const world = this.cameras.main.getWorldPoint(this.scale.transformX(point.pageX), this.scale.transformY(point.pageY));
    return this.cellAtScreen(world.x, world.y);
  }

  private select(card: CardId | null): void {
    this.selected = card;
    this.refreshHighlight();
    EventBus.emit(GameEvents.selectionChanged, card);
  }

  private hover(cell: Cell | null): void {
    this.hoverCell = cell;
    this.refreshHighlight();
  }

  /** Con una carta elegida, resalta la casilla bajo el puntero: clara con planta fantasma si se puede sembrar, roja si no. */
  private refreshHighlight(): void {
    const cell = this.hoverCell;
    this.highlight.clear();
    if (!this.selected || !cell) {
      this.highlight.setVisible(false);
      this.ghost.setVisible(false);
      return;
    }
    const blocked = plantBlocker(this.match, cell) !== null;
    const color = blocked ? LOOK.highlightBlocked : LOOK.highlightOk;
    const corners = [P(cell.col, cell.lane), P(cell.col + 1, cell.lane), P(cell.col + 1, cell.lane + 1), P(cell.col, cell.lane + 1)];
    this.highlight.fillStyle(color, 0.25).lineStyle(4, color, 0.95).beginPath();
    this.highlight.moveTo(corners[0].x, corners[0].y);
    for (const c of corners.slice(1)) this.highlight.lineTo(c.x, c.y);
    this.highlight.closePath().fillPath().strokePath().setVisible(true);

    if (blocked) {
      this.ghost.setVisible(false);
      return;
    }
    const { screen, scale } = this.plantPlacement(cell);
    this.ghost.setPosition(screen.x, screen.y).setScale(scale).setDepth(entityDepth(screen.y)).setVisible(true);
  }

  // -------------------------------------------------------------------------
  // Plantas

  private plantPlacement(cell: Cell) {
    const foot = { x: cell.col + 0.5, y: cell.lane + LOOK.plantFootY };
    const cellWidth = perspective.cellWidthAt(foot);
    return {
      screen: perspective.toScreen(foot),
      cellWidth,
      scale: ((cellWidth * LOOK.plantWidth) / SHOOTER_SIZE.width) * artInv(),
    };
  }

  private tryPlant(cell: Cell | null): void {
    if (this.selected !== 'shooter' || !cell || plantBlocker(this.match, cell)) return;
    this.match = plantShooter(this.match, cell);
    this.drawShooter(cell);
    this.select(null);
    this.emitBalance();
  }

  private drawShooter(cell: Cell): void {
    const { screen, cellWidth, scale } = this.plantPlacement(cell);
    const depth = entityDepth(screen.y);

    const shadow = this.add
      .image(screen.x, screen.y, TEX.shadow)
      .setDisplaySize(cellWidth * 0.8, cellWidth * 0.26)
      .setAlpha(0)
      .setDepth(depth - 0.5);
    this.tweens.add({ targets: shadow, alpha: 1, duration: 300 });

    const body = this.add
      .image(screen.x, screen.y, TEX.shooter)
      .setOrigin(0.5, SHOOTER_SIZE.footY / SHOOTER_SIZE.height)
      .setScale(scale * 1.25, scale * 0.25)
      .setDepth(depth);

    // Brota de la tierra con un estiron, rebota y se queda respirando.
    this.dirt.explode(this.effectCount(16), screen.x, screen.y);
    this.tweens.add({
      targets: body,
      scaleX: scale,
      scaleY: scale,
      duration: 520,
      ease: 'Elastic.Out',
      easeParams: [1.1, 0.5],
      onComplete: () => {
        this.tweens.add({
          targets: body,
          scaleX: scale * 1.03,
          scaleY: scale * 0.95,
          duration: Phaser.Math.Between(850, 1150),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
        this.tweens.add({
          targets: body,
          angle: { from: -1.5, to: 1.5 },
          duration: Phaser.Math.Between(2200, 3000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      },
    });
  }

  // -------------------------------------------------------------------------
  // Monedas

  /** Moneda en el suelo: se cobra (con el extra ya incluido en `amount`) solo si el jugador hace clic. */
  private spawnDroppedCoin(at: BoardPoint, amount: number): void {
    const cellWidth = perspective.cellWidthAt(at);
    const ground = perspective.toScreen(at);
    const size = cellWidth * LOOK.coinSize;
    const hover = cellWidth * LOOK.coinHover;
    const landX = ground.x + Phaser.Math.FloatBetween(-0.25, 0.25) * cellWidth;
    const restY = ground.y - hover;
    const depth = entityDepth(ground.y) + 0.6;

    const shadow = this.add
      .image(landX, ground.y, TEX.shadow)
      .setDisplaySize(size * 1.2, size * 0.38)
      .setAlpha(0)
      .setDepth(depth - 0.5);
    const glow = this.add
      .image(landX, restY, TEX.glow)
      .setDisplaySize(size * 2.4, size * 2.4)
      .setTint(0xffe27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setVisible(this.quality.glows)
      .setDepth(depth - 0.2);
    const coin = this.add.image(ground.x, restY, TEX.coin).setDisplaySize(size, size).setDepth(depth);
    const label = this.add
      .text(landX, restY - size * 0.95, `+${amount}`, this.textStyle(Math.round(size * 0.5)))
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(depth + 0.1);
    // La moneda gira estrechandose; el clic lo recibe una zona fija y algo mas grande para que sea facil acertar.
    const hit = this.add.zone(landX, restY, size * 1.6, size * 1.6).setDepth(depth + 0.2);
    const parts = [shadow, glow, coin, label, hit];
    const coinScale = coin.scaleX;

    let collected = false;
    const startIdle = () => {
      if (collected) return;
      hit.setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: [shadow, label], alpha: 1, duration: 200 });
      this.tweens.add({ targets: glow, alpha: { from: 0.25, to: 0.7 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: [coin, glow, hit], y: restY - cellWidth * 0.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: label, y: label.y - cellWidth * 0.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: coin, scaleX: coinScale * 0.2, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    };

    // Sale despedida del enemigo, cae y rebota.
    this.tweens.add({ targets: coin, x: landX, duration: 700 });
    this.tweens.add({
      targets: coin,
      y: restY - cellWidth * 0.7,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => this.tweens.add({ targets: coin, y: restY, duration: 440, ease: 'Bounce.Out', onComplete: startIdle }),
    });

    const blink = this.time.delayedCall(ECONOMY.dropLifetimeMs * LOOK.coinBlinkFrom, () => {
      this.tweens.add({ targets: [coin, label], alpha: 0.3, duration: 150, yoyo: true, repeat: -1 });
    });
    const expire = this.time.delayedCall(ECONOMY.dropLifetimeMs, () => {
      collected = true;
      hit.disableInteractive();
      this.tweens.killTweensOf(parts);
      this.tweens.add({
        targets: parts,
        alpha: 0,
        scaleY: 0,
        duration: 260,
        ease: 'Back.In',
        onComplete: () => parts.forEach((part) => part.destroy()),
      });
    });

    hit.once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (collected) return;
      collected = true;
      blink.remove();
      expire.remove();
      this.tweens.killTweensOf(parts);
      [shadow, glow, label, hit].forEach((part) => part.destroy());
      coin.setScale(coinScale);
      this.credit(amount);
      this.floatText(`+${amount}`, coin.x, coin.y - size);
      this.sparkles.explode(this.effectCount(14), coin.x, coin.y);
      this.flyToBalance(coin, coinScale);
    });
  }

  /** Moneda que se cobra sola: aparece, brilla y vuela al marcador. */
  private spawnAutoCoin(at: BoardPoint): void {
    const cellWidth = perspective.cellWidthAt(at);
    const ground = perspective.toScreen(at);
    const coin = this.add
      .image(ground.x, ground.y - cellWidth * LOOK.coinHover, TEX.coin)
      .setDepth(DEPTH.floatText - 2)
      .setScale(0);
    const scale = (cellWidth * LOOK.coinSize) / coin.width;
    this.sparkles.explode(this.effectCount(8), coin.x, coin.y);
    this.tweens.add({
      targets: coin,
      scale,
      y: coin.y - cellWidth * 0.25,
      duration: 260,
      ease: 'Back.Out',
      onComplete: () => this.flyToBalance(coin, scale),
    });
  }

  private flyToBalance(coin: Phaser.GameObjects.Image, scale: number): void {
    coin.setDepth(DEPTH.floatText - 2);
    // El saldo esta en la esquina de la pantalla, que depende de la proporcion de la ventana.
    const view = this.cameras.main.worldView;
    this.tweens.add({
      targets: coin,
      x: view.right - LOOK.coinTargetFromCorner.x,
      y: view.top + LOOK.coinTargetFromCorner.y,
      scale: scale * 0.6,
      angle: 200,
      duration: 650,
      ease: 'Cubic.In',
      onComplete: () => coin.destroy(),
    });
  }

  private credit(amount: number, at?: BoardPoint): void {
    this.match = earn(this.match, amount);
    this.emitBalance();
    // Si hay una carta elegida, el saldo nuevo puede cambiar el color del resaltado.
    this.refreshHighlight();
    if (at) {
      const ground = perspective.toScreen(at);
      this.floatText(`+${amount}`, ground.x, ground.y - perspective.cellWidthAt(at) * 0.8);
      this.spawnAutoCoin(at);
    }
  }

  private floatText(text: string, x: number, y: number): void {
    const label = this.add.text(x, y, text, this.textStyle()).setOrigin(0.5).setScale(0.4).setDepth(DEPTH.floatText);
    this.tweens.add({ targets: label, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({
      targets: label,
      y: y - 70,
      alpha: 0,
      delay: 250,
      duration: 750,
      ease: 'Quad.In',
      onComplete: () => label.destroy(),
    });
  }

  /** Particulas de respuesta a una accion: menos en Bajo, pero nunca ninguna (son parte del gesto). */
  private effectCount(base: number): number {
    return Math.max(3, Math.round(base * Math.min(1.5, this.quality.particles)));
  }

  private emitBalance(): void {
    EventBus.emit(GameEvents.balanceChanged, this.match.balance);
  }

  private emitState(): void {
    this.emitBalance();
    EventBus.emit(GameEvents.selectionChanged, this.selected);
  }
}
