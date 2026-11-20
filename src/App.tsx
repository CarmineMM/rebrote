import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardId } from './game/core/match';
import {
  EventBus,
  GameEvents,
  type BossInfo,
  type CardPreview,
  type LossInfo,
  type PlantPanel,
  type RoundInfo,
  type UnlockInfo,
} from './game/EventBus';
import { Balance } from './ui/Balance';
import { Card } from './ui/Card';
import { DefeatScreen } from './ui/DefeatScreen';
import { GameCanvas } from './ui/GameCanvas';
import { LevelPanel } from './ui/LevelPanel';
import { Lives } from './ui/Lives';
import { PauseMenu } from './ui/PauseMenu';
import { RoundHud } from './ui/RoundHud';
import { UnlockModal } from './ui/UnlockModal';
import { NO_AUTO_FULLSCREEN, useFullscreen } from './ui/useFullscreen';
import { useSettings } from './ui/useSettings';
import { VictoryScreen } from './ui/VictoryScreen';

/** Cartas de la bandeja, en orden. Solo se ven las que la ronda ya desbloqueo (T-007). */
const CARDS: ReadonlyArray<{ id: CardId; label: string }> = [
  { id: 'shooter', label: 'Disparadora' },
  { id: 'fire', label: 'Fuego' },
  { id: 'ice', label: 'Hielo' },
];

/**
 * Pantalla completa con el HUD flotando encima del juego, menu de pausa con los ajustes (ADR-0007), ronda en curso
 * (T-007) con la barra del jefe (T-008), aviso de lo desbloqueado (T-009) y pantallas de derrota y de victoria. Con la
 * partida acabada no se abre el menu de pausa: solo se puede jugar otra vez. Mientras el aviso de lo desbloqueado esta
 * abierto el juego espera en pausa.
 */
export function App() {
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [lives, setLives] = useState<number | null>(null);
  const [selected, setSelected] = useState<CardId | null>(null);
  const [preview, setPreview] = useState<CardPreview | null>(null);
  const [plantPanel, setPlantPanel] = useState<PlantPanel | null>(null);
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [boss, setBoss] = useState<BossInfo | null>(null);
  const [loss, setLoss] = useState<LossInfo | null>(null);
  /** Aviso de lo desbloqueado que el jugador aun no acepto (T-009). */
  const [unlock, setUnlock] = useState<UnlockInfo | null>(null);
  /** Ronda del ultimo aviso aceptado: la escena lo repite al pedirle el estado y no debe volver a salir. */
  const acceptedRound = useRef<number | null>(null);
  const hudRef = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [lost, setLost] = useState(false);
  const [won, setWon] = useState(false);
  /** Partida acabada (perdida o ganada): solo queda jugar otra vez. */
  const over = lost || won;
  const overRef = useRef(over);
  overRef.current = over;
  const { settings, update, level, autoLevel, fps } = useSettings();
  const pause = useCallback(() => {
    if (!overRef.current) setPaused(true);
  }, []);
  const fullscreen = useFullscreen(settings.fullscreen, pause);

  useEffect(() => {
    const onReady = () => setReady(true);
    const onLost = (info?: LossInfo) => {
      setLoss(info ?? null);
      setLost(true);
      setPaused(false);
    };
    const onWon = () => {
      setWon(true);
      setPaused(false);
    };
    const onUnlocked = (info: UnlockInfo) => {
      if (info.round !== acceptedRound.current) setUnlock(info);
    };
    EventBus.on(GameEvents.sceneReady, onReady);
    EventBus.on(GameEvents.balanceChanged, setBalance);
    EventBus.on(GameEvents.livesChanged, setLives);
    EventBus.on(GameEvents.selectionChanged, setSelected);
    EventBus.on(GameEvents.cardPreview, setPreview);
    EventBus.on(GameEvents.plantPanel, setPlantPanel);
    EventBus.on(GameEvents.matchLost, onLost);
    EventBus.on(GameEvents.matchWon, onWon);
    EventBus.on(GameEvents.roundChanged, setRound);
    EventBus.on(GameEvents.bossChanged, setBoss);
    EventBus.on(GameEvents.unlocked, onUnlocked);
    // Si la escena arranco antes que el HUD, que reenvie el estado.
    EventBus.emit(GameEvents.stateRequested);
    return () => {
      EventBus.off(GameEvents.sceneReady, onReady);
      EventBus.off(GameEvents.balanceChanged, setBalance);
      EventBus.off(GameEvents.livesChanged, setLives);
      EventBus.off(GameEvents.selectionChanged, setSelected);
      EventBus.off(GameEvents.cardPreview, setPreview);
      EventBus.off(GameEvents.plantPanel, setPlantPanel);
      EventBus.off(GameEvents.matchLost, onLost);
      EventBus.off(GameEvents.matchWon, onWon);
      EventBus.off(GameEvents.roundChanged, setRound);
      EventBus.off(GameEvents.bossChanged, setBoss);
      EventBus.off(GameEvents.unlocked, onUnlocked);
    };
  }, []);

  // Cambiar la calidad recrea el juego: se vuelve a mostrar la carga hasta que este listo.
  useEffect(() => setReady(false), [level]);

  const resume = useCallback(() => {
    setPaused(false);
    // El clic en "Continuar" es un gesto valido para volver a pantalla completa.
    if (settings.fullscreen) fullscreen.enter();
  }, [settings.fullscreen, fullscreen]);

  /** El jugador acepta el aviso de lo desbloqueado: el juego sigue. */
  const acceptUnlock = useCallback(() => {
    if (!unlock) return;
    acceptedRound.current = unlock.round;
    EventBus.emit(GameEvents.unlockAccepted, unlock.round);
    setUnlock(null);
  }, [unlock]);

  /** Partida nueva desde cero (sin continuar la anterior). */
  const restart = useCallback(() => {
    // La partida nueva vuelve a avisar de lo de la ronda 1.
    acceptedRound.current = null;
    setUnlock(null);
    setLost(false);
    setLoss(null);
    setWon(false);
    setPaused(false);
    EventBus.emit(GameEvents.restartRequested);
    if (settings.fullscreen) fullscreen.enter();
  }, [settings.fullscreen, fullscreen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Con la partida acabada solo cuenta el boton de jugar otra vez (Enter o espacio, que ya tiene el foco).
      if (event.repeat || over) return;
      // Con el aviso de lo desbloqueado abierto, Esc lo acepta (Enter ya lo hace el boton, que tiene el foco).
      if (unlock && !paused) {
        if (event.key === 'Escape') acceptUnlock();
        return;
      }
      if (event.key === 'Escape') {
        if (fullscreen.exitedJustNow()) return;
        if (paused) resume();
        // Esc suelta la carta elegida o cierra el panel de nivel antes de abrir la pausa.
        else if (selected || plantPanel) EventBus.emit(GameEvents.selectionCancelled);
        else setPaused(true);
      } else if (event.key === 'p' || event.key === 'P') {
        if (paused) resume();
        else setPaused(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, selected, plantPanel, over, resume, fullscreen, unlock, acceptUnlock]);

  // Si el jugador cambia de pestana o minimiza, al volver encuentra el juego en pausa.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pause]);

  return (
    // Con la pausa (o el aviso de lo desbloqueado) se congelan tambien las animaciones CSS que cuentan tiempo (el aviso de la ronda).
    <main className={`app${paused || unlock ? ' is-paused' : ''}`}>
      <GameCanvas quality={level} paused={paused || unlock !== null} />

      <header ref={hudRef} className="hud" aria-hidden={paused || over || unlock !== null}>
        <div className="seed-tray" aria-label="Cartas">
          {CARDS.filter(({ id }) => (round?.cards ?? ['shooter']).includes(id)).map(({ id, label }) => (
            // Cada carta nueva entra en la bandeja con un salto al desbloquearse.
            <span key={id} className="card-slot">
              <Card
                card={id}
                label={label}
                balance={balance}
                selected={selected === id}
                preview={id !== 'shooter' && preview?.card === id ? preview : null}
                canInfuse={id !== 'shooter' && (round?.infusable.includes(id) ?? false)}
              />
            </span>
          ))}
        </div>
        {round && <RoundHud round={round} boss={boss} />}
        <div className="hud-right">
          <Lives lives={lives} />
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

      {plantPanel && !paused && !over && !unlock && <LevelPanel key={plantPanel.id} panel={plantPanel} avoid={hudRef} />}

      {settings.showFps && fps !== null && <div className="fps">{fps} FPS</div>}

      {!ready && (
        <div className="loading" role="status">
          <span className="loading-sprout" aria-hidden="true" />
          Cargando el jardín…
        </div>
      )}

      {lost && <DefeatScreen round={round} loss={loss} onRestart={restart} />}

      {won && !lost && <VictoryScreen rounds={round?.total ?? 0} onRestart={restart} />}

      {unlock && !paused && !over && <UnlockModal unlock={unlock} onAccept={acceptUnlock} />}

      {paused && !over && (
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
