import { useEffect, useRef } from 'react';
import type { MatchState } from '../game/core/match';
import { createGame, snapshotMatch, type GameScreen } from '../game/createGame';
import { EventBus, GameEvents } from '../game/EventBus';
import type { QualityLevel } from '../game/view/quality';
import type { Language } from '../i18n';

interface GameCanvasProps {
  quality: QualityLevel;
  /** Idioma del juego (T-011): los textos pintados en el lienzo se leen al crearlo, asi que cambiarlo lo recrea. */
  language: Language;
  /** Pantalla en la que esta el jugador: si el juego se recrea, vuelve a ella. */
  screen: GameScreen;
  paused: boolean;
}

/**
 * Monta el juego a pantalla completa. Al cambiar el nivel grafico o el idioma se recrea con la nueva resolucion, efectos
 * y textos, y continua la misma partida (saldo, plantas, gusanos, balas y vidas) y el mismo estado de pausa. En el menu
 * de inicio vuelve a la portada. Pasar de la portada al tablero y al reves no lo recrea: lo hacen las escenas (T-011).
 */
export function GameCanvas({ quality, language, screen, paused }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const carryOver = useRef<MatchState | undefined>(undefined);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Cada juego vive en su propio nodo: Phaser destruye el anterior un frame despues y asi no se solapan.
    const host = document.createElement('div');
    host.className = 'game-host';
    container.appendChild(host);
    const onBoard = screenRef.current === 'board';
    const game = createGame(host, {
      screen: onBoard && carryOver.current ? 'board' : 'title',
      quality,
      resume: onBoard ? carryOver.current : undefined,
      paused: pausedRef.current,
    });
    return () => {
      carryOver.current = snapshotMatch(game);
      game.destroy(true);
      host.remove();
    };
    // El idioma no se usa aqui, pero cambiarlo tiene que recrear el juego.
  }, [quality, language]);

  useEffect(() => {
    EventBus.emit(GameEvents.pauseChanged, paused);
  }, [paused]);

  return <div ref={containerRef} className="game-canvas" />;
}
