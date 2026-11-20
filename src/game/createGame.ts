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
  });
  const { screen, ...board } = data;
  game.scene.add(SCENES.title, TitleScene, screen === 'title', { quality: data.quality });
  game.scene.add(SCENES.board, BoardScene, screen === 'board', board);
  return game;
}

/**
 * Partida en curso, para continuarla en un juego nuevo (al cambiar el nivel grafico o el idioma). Con la portada en
 * pantalla no hay partida.
 */
export function snapshotMatch(game: Phaser.Game): MatchState | undefined {
  const scene = game.scene.getScene(SCENES.board) as BoardScene | null;
  return scene && (scene.sys.isActive() || scene.sys.isPaused()) ? scene.snapshot() : undefined;
}
