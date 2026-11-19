import * as Phaser from 'phaser';
import { BOARD, ECONOMY, ENEMIES } from '../config/balance';
import { cellAt, type BoardPoint, type Cell } from '../core/board';
import { isDefeated, spawnEnemy, stepCombat, type CombatEvent, type Enemy } from '../core/combat';
import { rollKillReward } from '../core/economy';
import { cardCost, createMatch, earn, plantAt, plantBlocker, plantShooter, type CardId, type MatchState, type Plant } from '../core/match';
import { plantMaxHp } from '../core/plants';
import { stepSpawner } from '../core/spawner';
import { EventBus, GameEvents, type PagePoint } from '../EventBus';
import { createAmbience, type Ambience } from '../view/ambience';
import { BulletView } from '../view/bulletView';
import { Effects } from '../view/effects';
import { DEPTH, SCENERY, entityDepth, perspective, viewFor } from '../view/layout';
import { PlantView, plantPlacement } from '../view/plantView';
import { QUALITY_PROFILES, type QualityLevel, type QualityProfile } from '../view/quality';
import { SHOOTER_SIZE, TEX, registerTextures } from '../view/textures';
import { WormView } from '../view/wormView';

/** Solo aspecto y ritmo de las animaciones. Los numeros de juego viven en balance.ts. */
const LOOK = {
  highlightOk: 0xfff7d6,
  highlightBlocked: 0xff5a5f,
  coinSize: 0.42,
  /** Altura a la que flota la moneda sobre el suelo, en anchos de casilla. */
  coinHover: 0.36,
  /** A partir de esta fraccion de su vida, la moneda soltada parpadea. */
  coinBlinkFrom: 0.7,
  /** Hacia donde vuelan las monedas cobradas: el saldo del HUD, medido desde la esquina superior derecha de la vista. */
  coinTargetFromCorner: { x: 150, y: 40 },
  /** Donde sale el aviso de vida perdida: en el camino, a la izquierda del cesped (casillas). */
  lifeLostX: -0.45,
  lifeLostText: { color: '#ff8fa3', stroke: '#5a0d1a' },
  /** Tiempo entre perder la ultima vida y la pantalla de derrota: deja ver como se cuela el gusano. */
  defeatDelayMs: 1100,
} as const;

/** Prueba de rendimiento en desarrollo (tecla H): el presupuesto de T-002, 20 plantas y 60 enemigos. */
const STRESS = {
  plantColumns: 4,
  enemies: 60,
  /** Los gusanos salen repartidos por la derecha del cesped y tardan unos segundos en llegar a las plantas. */
  fromX: 6,
  gap: 0.3,
  /** Mucha vida para que sigan en pantalla mientras se miden los fps. */
  hpFactor: 20,
} as const;

const P = (x: number, y: number) => perspective.toScreen({ x, y });
const cellKey = (cell: Cell) => `${cell.lane}:${cell.col}`;

/** Datos con los que arranca la escena (ver createGame). */
export interface BoardSceneData {
  quality: QualityLevel;
  /** Partida a continuar: se usa al cambiar el nivel grafico, que recrea el juego. */
  resume?: MatchState;
  /** Arrancar en pausa (por ejemplo, si se cambia la calidad desde el menu de pausa). */
  paused?: boolean;
}

/**
 * Tablero, siembra, moneda y combate. Las reglas viven en src/game/core/: aqui se avanza la partida,
 * se pinta lo que hay y se anima lo que paso (ADR-0008).
 */
export class BoardScene extends Phaser.Scene {
  private match!: MatchState;
  private selected: CardId | null = null;
  /** Casilla bajo el puntero (o bajo la carta arrastrada), si cae en el tablero. */
  private hoverCell: Cell | null = null;
  private highlight!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Image;
  private fx!: Effects;
  private ambience!: Ambience;
  private level: QualityLevel = 'medium';
  private quality: QualityProfile = QUALITY_PROFILES.medium;
  private resume: MatchState | undefined;
  private plantViews = new Map<string, PlantView>();
  private wormViews = new Map<number, WormView>();
  private bulletViews = new Map<number, BulletView>();
  private passiveIncome?: Phaser.Time.TimerEvent;
  /** Sin vidas: el combate se detiene y React muestra la derrota. */
  private defeated = false;
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
    this.level = data.quality ?? 'medium';
    this.quality = QUALITY_PROFILES[this.level];
    this.resume = data.resume;
    this.wantPaused = data.paused ?? false;
    this.created = false;
  }

  create(): void {
    this.match = this.resume ?? createMatch();
    this.selected = null;
    this.hoverCell = null;
    this.defeated = false;
    // Reiniciar la partida vuelve a pasar por aqui: nada de la anterior debe sobrevivir.
    this.plantViews = new Map();
    this.wormViews = new Map();
    this.bulletViews = new Map();

    registerTextures(this, this.quality.renderScale);
    this.fitView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitView, this));
    this.ambience = createAmbience(this, this.quality);
    this.applyPostFx();
    this.createCursorFeedback();
    this.fx = new Effects(this, this.quality);
    this.restoreEntities();

    this.bindPointer();
    this.bindHud();
    this.passiveIncome = this.time.addEvent({
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
    // Una partida perdida que se recrea (por ejemplo, al cambiar la calidad) sigue perdida.
    if (isDefeated(this.match)) this.enterDefeat(0);
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
    if (!this.defeated) this.advance(delta);
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
   * Recompensa por enemigo eliminado en `at` (punto del tablero).
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

  /** Al continuar una partida, vuelve a pintar plantas, gusanos y balas donde estaban. */
  private restoreEntities(): void {
    this.match.plants.forEach((lane, laneIndex) =>
      lane.forEach((plant, col) => {
        if (plant) this.addPlantView({ lane: laneIndex, col }, plant, false);
      }),
    );
    this.match.enemies.forEach((enemy) => this.addWormView(enemy, false));
    this.match.bullets.forEach((bullet) => this.bulletViews.set(bullet.id, new BulletView(this, this.fx, bullet, false)));
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
    // En pausa o con la partida perdida la escena no atiende ordenes del HUD (los menus las tapan, pero por si acaso).
    const running = () => this.sys.isActive() && !this.defeated;
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
    // Partida nueva desde cero: no continua la anterior (sin `resume`) y arranca sin pausa.
    const onRestart = () => this.scene.restart({ quality: this.level } satisfies BoardSceneData);

    EventBus.on(GameEvents.cardPicked, onPicked);
    EventBus.on(GameEvents.selectionCancelled, onCancelled);
    EventBus.on(GameEvents.cardDragged, onDragged);
    EventBus.on(GameEvents.cardDropped, onDropped);
    EventBus.on(GameEvents.stateRequested, onStateRequested);
    EventBus.on(GameEvents.pauseChanged, onPause);
    EventBus.on(GameEvents.restartRequested, onRestart);

    const unbind = () => {
      EventBus.off(GameEvents.cardPicked, onPicked);
      EventBus.off(GameEvents.selectionCancelled, onCancelled);
      EventBus.off(GameEvents.cardDragged, onDragged);
      EventBus.off(GameEvents.cardDropped, onDropped);
      EventBus.off(GameEvents.stateRequested, onStateRequested);
      EventBus.off(GameEvents.pauseChanged, onPause);
      EventBus.off(GameEvents.restartRequested, onRestart);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbind);
    this.events.once(Phaser.Scenes.Events.DESTROY, unbind);
  }

  /** Atajos solo en desarrollo. */
  private bindDebugKeys(): void {
    // H: prueba de rendimiento de T-002 (medir con "Mostrar FPS" en Ajustes).
    this.input.keyboard?.on('keydown-H', () => this.stressTest());
  }

  /** Siembra gratis las 4 primeras columnas (20 plantas) y suelta 60 gusanos con mucha vida. */
  private stressTest(): void {
    if (this.defeated) return;
    for (let lane = 0; lane < BOARD.lanes; lane++) {
      for (let col = 0; col < STRESS.plantColumns; col++) {
        const cell = { lane, col };
        if (plantAt(this.match, cell)) continue;
        this.match = plantShooter(earn(this.match, cardCost('shooter')), cell);
        this.addPlantView(cell, plantAt(this.match, cell) as Plant, true);
      }
    }
    for (let i = 0; i < STRESS.enemies; i++) {
      const lane = i % BOARD.lanes;
      const x = STRESS.fromX + Math.floor(i / BOARD.lanes) * STRESS.gap;
      this.match = spawnEnemy(this.match, 'worm', lane, x, ENEMIES.worm.hp * STRESS.hpFactor);
      this.addWormView(this.match.enemies[this.match.enemies.length - 1], true);
    }
    this.refreshHighlight();
  }

  // -------------------------------------------------------------------------
  // Combate

  /** Avanza la partida: salen gusanos, se mueve el combate, se animan los eventos y se recolocan las vistas. */
  private advance(delta: number): void {
    const spawn = stepSpawner(this.match, delta, SCENERY.holeX);
    this.match = spawn.state;
    spawn.spawned.forEach((enemy) => this.addWormView(enemy, true));

    const livesBefore = this.match.lives;
    const { state, events } = stepCombat(this.match, delta);
    this.match = state;
    events.forEach((event) => this.showEvent(event));

    for (const enemy of this.match.enemies) this.wormViews.get(enemy.id)?.sync(enemy);
    for (const bullet of this.match.bullets) this.bulletViews.get(bullet.id)?.sync(bullet);
    if (this.match.lives !== livesBefore) this.emitLives();
    if (isDefeated(this.match)) this.enterDefeat(LOOK.defeatDelayMs);
  }

  /** La regla ya esta aplicada en el estado; aqui solo se anima. */
  private showEvent(event: CombatEvent): void {
    switch (event.type) {
      case 'shot':
        this.plantViews.get(cellKey(event.cell))?.recoil();
        this.bulletViews.set(event.bullet.id, new BulletView(this, this.fx, event.bullet, true));
        break;
      case 'hit':
        this.bulletViews.get(event.bulletId)?.impact();
        this.bulletViews.delete(event.bulletId);
        this.wormViews.get(event.enemyId)?.hit();
        break;
      case 'bulletGone':
        this.bulletViews.get(event.bulletId)?.vanish();
        this.bulletViews.delete(event.bulletId);
        break;
      case 'bite': {
        this.wormViews.get(event.enemyId)?.chomp();
        const plant = plantAt(this.match, event.cell);
        this.plantViews.get(cellKey(event.cell))?.bitten(plant ? plant.hp / plantMaxHp(plant.shooter) : 0);
        break;
      }
      case 'plantDestroyed':
        this.plantViews.get(cellKey(event.cell))?.die();
        this.plantViews.delete(cellKey(event.cell));
        // La casilla vuelve a estar libre: si hay una carta elegida, el resaltado cambia.
        this.refreshHighlight();
        break;
      case 'enemyKilled':
        this.wormViews.get(event.enemyId)?.die();
        this.wormViews.delete(event.enemyId);
        this.rewardKill(event.at);
        break;
      case 'enemyEscaped':
        this.wormViews.get(event.enemyId)?.escape();
        this.wormViews.delete(event.enemyId);
        this.showLifeLost(event.lane);
        break;
    }
  }

  private addWormView(enemy: Enemy, emerge: boolean): void {
    this.wormViews.set(enemy.id, new WormView(this, this.fx, enemy, emerge));
  }

  private addPlantView(cell: Cell, plant: Plant, sprout: boolean): void {
    this.plantViews.set(cellKey(cell), new PlantView(this, this.fx, cell, plant.hp / plantMaxHp(plant.shooter), sprout));
  }

  /** Un gusano se colo: aviso en el camino y un temblor corto. React quita el corazon. */
  private showLifeLost(lane: number): void {
    const at = P(LOOK.lifeLostX, lane + 0.5);
    this.fx.floatText('−1 ♥', at.x, at.y - perspective.cellWidthAt({ x: LOOK.lifeLostX, y: lane + 0.5 }) * 0.6, LOOK.lifeLostText);
    this.cameras.main.shake(220, 0.004);
  }

  /**
   * Sin vidas: el combate y el goteo se detienen al momento, las balas se apagan y los gusanos celebran.
   * Al cabo de `delayMs` React muestra la pantalla de derrota.
   */
  private enterDefeat(delayMs: number): void {
    if (this.defeated) return;
    this.defeated = true;
    this.select(null);
    this.passiveIncome?.remove();
    this.bulletViews.forEach((bullet) => bullet.vanish());
    this.bulletViews.clear();
    this.wormViews.forEach((worm) => worm.cheer());
    this.time.delayedCall(delayMs, () => EventBus.emit(GameEvents.matchLost));
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
    const { screen, scale } = plantPlacement(cell);
    this.ghost.setPosition(screen.x, screen.y).setScale(scale).setDepth(entityDepth(screen.y)).setVisible(true);
  }

  private tryPlant(cell: Cell | null): void {
    if (this.defeated || this.selected !== 'shooter' || !cell || plantBlocker(this.match, cell)) return;
    this.match = plantShooter(this.match, cell);
    this.addPlantView(cell, plantAt(this.match, cell) as Plant, true);
    this.select(null);
    this.emitBalance();
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
      .text(landX, restY - size * 0.95, `+${amount}`, this.fx.textStyle({ fontSize: Math.round(size * 0.5) }))
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
      this.fx.floatText(`+${amount}`, coin.x, coin.y - size);
      this.fx.sparkles(coin.x, coin.y, 14);
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
    this.fx.sparkles(coin.x, coin.y, 8);
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
      this.fx.floatText(`+${amount}`, ground.x, ground.y - perspective.cellWidthAt(at) * 0.8);
      this.spawnAutoCoin(at);
    }
  }

  private emitBalance(): void {
    EventBus.emit(GameEvents.balanceChanged, this.match.balance);
  }

  private emitLives(): void {
    EventBus.emit(GameEvents.livesChanged, this.match.lives);
  }

  private emitState(): void {
    this.emitBalance();
    this.emitLives();
    EventBus.emit(GameEvents.selectionChanged, this.selected);
  }
}
