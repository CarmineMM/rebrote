import * as Phaser from 'phaser';
import type { MatchState } from './core/match';
import { BoardScene, type BoardSceneData } from './scenes/BoardScene';
import { viewFor } from './view/layout';
import { QUALITY_PROFILES } from './view/quality';

const BOARD_SCENE = 'BoardScene';

/**
 * Crea el juego a pantalla completa con el nivel grafico pedido (ADR-0006, ADR-0007).
 * El lienzo toma la proporcion del contenedor; la escena coloca la camara para ver el diseno entero.
 */
export function createGame(parent: HTMLElement, data: BoardSceneData): Phaser.Game {
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
  game.scene.add(BOARD_SCENE, BoardScene, true, data);
  return game;
}

/** Partida en curso, para continuarla en un juego nuevo (por ejemplo, al cambiar el nivel grafico). */
export function snapshotMatch(game: Phaser.Game): MatchState | undefined {
  const scene = game.scene.getScene(BOARD_SCENE) as BoardScene | null;
  return scene && (scene.sys.isActive() || scene.sys.isPaused()) ? scene.snapshot() : undefined;
}
