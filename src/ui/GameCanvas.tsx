import { useEffect, useRef } from 'react';
import type { MatchState } from '../game/core/match';
import { createGame, snapshotMatch } from '../game/createGame';
import { EventBus, GameEvents } from '../game/EventBus';
import type { QualityLevel } from '../game/view/quality';

interface GameCanvasProps {
  quality: QualityLevel;
  paused: boolean;
}

/**
 * Monta el juego a pantalla completa. Al cambiar el nivel grafico se recrea con la nueva resolucion
 * y efectos, y continua la misma partida (saldo y plantas) y el mismo estado de pausa.
 */
export function GameCanvas({ quality, paused }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const carryOver = useRef<MatchState | undefined>(undefined);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Cada juego vive en su propio nodo: Phaser destruye el anterior un frame despues y asi no se solapan.
    const host = document.createElement('div');
    host.className = 'game-host';
    container.appendChild(host);
    const game = createGame(host, { quality, resume: carryOver.current, paused: pausedRef.current });
    return () => {
      carryOver.current = snapshotMatch(game);
      game.destroy(true);
      host.remove();
    };
  }, [quality]);

  useEffect(() => {
    EventBus.emit(GameEvents.pauseChanged, paused);
  }, [paused]);

  return <div ref={containerRef} className="game-canvas" />;
}
