import * as Phaser from 'phaser';
import type { MatchState } from './core/match';
import { BoardScene, type BoardSceneData } from './scenes/BoardScene';
import { SCENES } from './scenes/keys';
import { TitleScene } from './scenes/TitleScene';
import { viewFor } from './view/layout';
import { QUALITY_PROFILES } from './view/quality';

/** Pantalla con la que arranca el juego (T-011): el menu de inicio, con su portada, o el tablero. */
export type GameScreen = 'title' | 'board';

export interface GameData extends BoardSceneData {
  screen: GameScreen;
}

/**
 * Crea el juego a pantalla completa con el nivel grafico pedido (ADR-0006, ADR-0007), con sus dos escenas (T-011): la
 * portada del menu de inicio y el tablero. Arranca la de `screen`; luego pasan de una a otra sin recrear el juego.
 * El lienzo toma la proporcion del contenedor; la escena coloca la camara para ver el diseno entero.
 */
export function createGame(parent: HTMLElement, data: GameData): Phaser.Game {
  const { renderScale } = QUALITY_PROFILES[data.quality];
  const bounds = parent.getBoundingClientRect();
  const view = viewFor(bounds.width / bounds.height);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: Math.max(1, Math.round(view.width * renderScale)),
    height: Math.max(1, Math.round(view.height * renderScale)),
    backgroundColor: '#1d2b1f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    // En portatiles con dos GPU, pide la dedicada: el escenario animado lo agradece.
    render: { powerPreference: 'high-performance' },
    // El sonido lo lleva `src/game/audio/` (T-014, ADR-0013), que sobrevive a recrear el juego. Sin esto Phaser crearia
    // su propio contexto de audio antes del primer gesto y el navegador avisaria en la consola.
    audio: { noAudio: true },
  });
  const { screen, ...board } = data;
  game.scene.add(SCENES.title, TitleScene, screen === 'title', { quality: data.quality });
  game.scene.add(SCENES.board, BoardScene, screen === 'board', board);
  return game;
}

/**
 * Duerme o despierta el bucle entero del juego (ADR-0011): mientras el movil esta en vertical no se simula ni se pinta
 * nada, tampoco la portada, y no se gasta bateria. Si el juego aun no arranco su bucle, se duerme tras su primer
 * fotograma (las escenas ya creadas). Al despertar se reinicia la cuenta del tiempo para que no haya un salto.
 */
export function setGameAsleep(game: Phaser.Game, asleep: boolean): void {
  game.events.off(Phaser.Core.Events.POST_RENDER, sleepLoop, game);
  if (asleep) {
    if (game.loop.started) game.loop.sleep();
    else game.events.once(Phaser.Core.Events.POST_RENDER, sleepLoop, game);
    return;
  }
  if (game.loop.started && !game.loop.running) {
    game.loop.resetDelta();
    game.loop.wake();
  }
}

function sleepLoop(this: Phaser.Game): void {
  this.loop.sleep();
}

/**
 * Partida en curso, para continuarla en un juego nuevo (al cambiar el nivel grafico o el idioma). Con la portada en
 * pantalla no hay partida.
 */
export function snapshotMatch(game: Phaser.Game): MatchState | undefined {
  const scene = game.scene.getScene(SCENES.board) as BoardScene | null;
  return scene && (scene.sys.isActive() || scene.sys.isPaused()) ? scene.snapshot() : undefined;
}
