import { useCallback, useEffect, useState } from 'react';
import type { CardId } from './game/core/match';
import { EventBus, GameEvents } from './game/EventBus';
import { Balance } from './ui/Balance';
import { Card } from './ui/Card';
import { GameCanvas } from './ui/GameCanvas';
import { PauseMenu } from './ui/PauseMenu';
import { NO_AUTO_FULLSCREEN, useFullscreen } from './ui/useFullscreen';
import { useSettings } from './ui/useSettings';

/** Pantalla completa con el HUD flotando encima del juego, y menu de pausa con los ajustes (ADR-0007). */
export function App() {
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [selected, setSelected] = useState<CardId | null>(null);
  const [paused, setPaused] = useState(false);
  const { settings, update, level, autoLevel, fps } = useSettings();
  const pause = useCallback(() => setPaused(true), []);
  const fullscreen = useFullscreen(settings.fullscreen, pause);

  useEffect(() => {
    const onReady = () => setReady(true);
    EventBus.on(GameEvents.sceneReady, onReady);
    EventBus.on(GameEvents.balanceChanged, setBalance);
    EventBus.on(GameEvents.selectionChanged, setSelected);
    // Si la escena arranco antes que el HUD, que reenvie el estado.
    EventBus.emit(GameEvents.stateRequested);
    return () => {
      EventBus.off(GameEvents.sceneReady, onReady);
      EventBus.off(GameEvents.balanceChanged, setBalance);
      EventBus.off(GameEvents.selectionChanged, setSelected);
    };
  }, []);

  // Cambiar la calidad recrea el juego: se vuelve a mostrar la carga hasta que este listo.
  useEffect(() => setReady(false), [level]);

  const resume = useCallback(() => {
    setPaused(false);
    // El clic en "Continuar" es un gesto valido para volver a pantalla completa.
    if (settings.fullscreen) fullscreen.enter();
  }, [settings.fullscreen, fullscreen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Escape') {
        if (fullscreen.exitedJustNow()) return;
        if (paused) resume();
        else if (selected) EventBus.emit(GameEvents.selectionCancelled);
        else setPaused(true);
      } else if (event.key === 'p' || event.key === 'P') {
        if (paused) resume();
        else setPaused(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, selected, resume, fullscreen]);

  // Si el jugador cambia de pestana o minimiza, al volver encuentra el juego en pausa.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <main className="app">
      <GameCanvas quality={level} paused={paused} />

      <header className="hud" aria-hidden={paused}>
        <div className="seed-tray" aria-label="Cartas">
          <Card card="shooter" label="Disparadora" balance={balance} selected={selected === 'shooter'} />
        </div>
        <div className="hud-right">
          <Balance balance={balance} />
          <button
            type="button"
            className="round-button"
            aria-label="Pausa"
            title="Pausa (Esc o P)"
            onClick={() => setPaused(true)}
            {...{ [NO_AUTO_FULLSCREEN]: '' }}
          >
            <span className="pause-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      {settings.showFps && fps !== null && <div className="fps">{fps} FPS</div>}

      {!ready && (
        <div className="loading" role="status">
          <span className="loading-sprout" aria-hidden="true" />
          Cargando el jardín…
        </div>
      )}

      {paused && (
        <PauseMenu
          settings={settings}
          autoLevel={autoLevel}
          fullscreenSupported={fullscreen.supported}
          onChange={update}
          onResume={resume}
        />
      )}
    </main>
  );
}
