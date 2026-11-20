import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardId } from './game/core/match';
import type { GameScreen } from './game/createGame';
import {
  EventBus,
  GameEvents,
  type BossInfo,
  type CardPreview,
  type EntityInfo,
  type LossInfo,
  type MatchRequest,
  type PlantPanel,
  type RoundInfo,
  type UnlockInfo,
} from './game/EventBus';
import { readSave, type SavedGame } from './game/save';
import { SCENES } from './game/scenes/keys';
import { Balance } from './ui/Balance';
import { Card } from './ui/Card';
import { DefeatScreen } from './ui/DefeatScreen';
import { GameCanvas } from './ui/GameCanvas';
import { InfoPanel } from './ui/InfoPanel';
import { LevelPanel } from './ui/LevelPanel';
import { Lives } from './ui/Lives';
import { PauseMenu } from './ui/PauseMenu';
import { RotateNotice } from './ui/RotateNotice';
import { RoundHud } from './ui/RoundHud';
import { TitleScreen } from './ui/TitleScreen';
import { UnlockModal } from './ui/UnlockModal';
import { NO_AUTO_FULLSCREEN, useFullscreen } from './ui/useFullscreen';
import { useNeedsLandscape } from './ui/useLandscapeOnly';
import { sfx } from './game/audio/sfx';
import { useButtonSounds } from './ui/useButtonSounds';
import { useSettings } from './ui/useSettings';
import { useText } from './ui/useText';
import { VictoryScreen } from './ui/VictoryScreen';
import { CoinHint } from './ui/tour/CoinHint';
import { TourOverlay } from './ui/tour/TourOverlay';
import { useTours } from './ui/tour/useTours';

/** Cartas de la bandeja, en orden. Solo se ven las que la ronda ya desbloqueo (T-007). */
const CARDS: readonly CardId[] = ['shooter', 'fire', 'ice'];

/** Escena que tiene que estar lista para cada pantalla. */
const SCENE_OF: Record<GameScreen, string> = { title: SCENES.title, board: SCENES.board };

/**
 * Pantalla completa con el menu de inicio (T-011) o con la partida: HUD flotando encima del juego, menu de pausa con los
 * ajustes (ADR-0007), ronda en curso (T-007) con la barra del jefe (T-008), aviso de lo desbloqueado (T-009), ficha de
 * informacion (T-010) y pantallas de derrota y de victoria. Con la partida acabada no se abre el menu de pausa: solo se
 * puede jugar otra vez o volver al menu. Mientras el aviso de lo desbloqueado o una ficha estan abiertos el juego espera
 * en pausa. La partida se guarda sola (T-011): la escena guarda al empezar cada ronda y aqui se le pide al ocultar o
 * cerrar la pestana y al salir al menu. En un movil o una tableta en vertical se tapa todo con el aviso de girar la
 * pantalla (ADR-0011): el juego duerme y la partida queda en pausa para cuando se gire. Los tours de ayuda (T-013,
 * ADR-0012) ensenan lo nuevo de cada ronda encima del juego vivo, y esperan debajo de todo lo demas.
 */
export function App() {
  const t = useText();
  const [screen, setScreen] = useState<GameScreen>('title');
  /** Escena que aviso de que esta lista; mientras no sea la de la pantalla, se ve la carga. */
  const [readyScene, setReadyScene] = useState<string | null>(null);
  const ready = readyScene === SCENE_OF[screen];
  /** Partida guardada, para "Cargar partida" en el menu de inicio. */
  const [saved, setSaved] = useState<SavedGame | null>(() => readSave());
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
  /** Ficha abierta con doble clic (T-010), o null. */
  const [info, setInfo] = useState<EntityInfo | null>(null);
  /** Ronda del ultimo aviso aceptado: la escena lo repite al pedirle el estado y no debe volver a salir. */
  const acceptedRound = useRef<number | null>(null);
  const hudRef = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [lost, setLost] = useState(false);
  const [won, setWon] = useState(false);
  const onBoard = screen === 'board';
  /** Partida acabada (perdida o ganada): solo queda jugar otra vez o volver al menu. */
  const over = lost || won;
  /** El juego espera: menu de pausa, aviso de lo desbloqueado o ficha abiertos. */
  const halted = onBoard && (paused || unlock !== null || info !== null);
  /** Con la partida en marcha (ni en el menu ni acabada) se puede pausar. */
  const pausable = useRef(false);
  pausable.current = onBoard && !over;
  const { settings, update, level, autoLevel, fps } = useSettings();
  // Efectos de sonido (T-014): el volumen del jugador y el sonido de los botones de los menus.
  useEffect(() => sfx.setVolume(settings.sfxVolume), [settings.sfxVolume]);
  useButtonSounds();
  const pause = useCallback(() => {
    if (pausable.current) setPaused(true);
  }, []);
  const fullscreen = useFullscreen(settings.fullscreen, pause);
  const needsLandscape = useNeedsLandscape();
  // Tours de ayuda (T-013): esperan debajo de cualquier cosa que tape el juego.
  const tours = useTours({ onBoard, round, help: settings.help, covered: halted || needsLandscape, over });

  // Al ponerse en vertical, la partida se pausa: al girar de nuevo el jugador la encuentra en el menu de pausa.
  useEffect(() => {
    if (needsLandscape) pause();
  }, [needsLandscape, pause]);

  useEffect(() => {
    // La escena que arranca dice en que pantalla estamos: si el juego se recrea sin partida, vuelve la portada.
    const onReady = (key: string) => {
      setReadyScene(key);
      if (key === SCENES.title) setScreen('title');
      else if (key === SCENES.board) setScreen('board');
    };
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
    EventBus.on(GameEvents.entityInfo, setInfo);
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
      EventBus.off(GameEvents.entityInfo, setInfo);
    };
  }, []);

  // Cambiar la calidad o el idioma recrea el juego: se vuelve a mostrar la carga hasta que este listo.
  useEffect(() => setReadyScene(null), [level, settings.language]);

  // Al volver al menu (o al abrirlo), "Cargar partida" mira lo que hay guardado.
  useEffect(() => {
    if (screen === 'title') setSaved(readSave());
  }, [screen]);

  /** Todo el HUD vuelve a estar como al empezar: nada de la partida anterior debe asomar en la siguiente. */
  const resetHud = useCallback(() => {
    acceptedRound.current = null;
    setBalance(null);
    setLives(null);
    setSelected(null);
    setPreview(null);
    setPlantPanel(null);
    setRound(null);
    setBoss(null);
    setLoss(null);
    setUnlock(null);
    setInfo(null);
    setLost(false);
    setWon(false);
    setPaused(false);
  }, []);

  /** Desde el menu de inicio: partida nueva o la guardada. El clic es un gesto valido para la pantalla completa. */
  const startMatch = useCallback(
    (request: MatchRequest) => {
      resetHud();
      setScreen('board');
      EventBus.emit(GameEvents.matchRequested, request);
      if (settings.fullscreen) fullscreen.enter();
    },
    [resetHud, settings.fullscreen, fullscreen],
  );

  const newGame = useCallback(() => startMatch({}), [startMatch]);

  const loadGame = useCallback(() => {
    const save = readSave();
    if (!save) {
      setSaved(null);
      return;
    }
    startMatch({ resume: save.match, pendingUnlock: save.pendingUnlock });
  }, [startMatch]);

  /** Vuelve al menu de inicio. La escena guarda la partida (si no esta acabada) y deja paso a la portada. */
  const exitToMenu = useCallback(() => {
    EventBus.emit(GameEvents.exitRequested);
    resetHud();
    setScreen('title');
    setSaved(readSave());
  }, [resetHud]);

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

  /** Cierra la ficha: el juego sigue. */
  const closeInfo = useCallback(() => setInfo(null), []);

  /** Partida nueva desde cero (sin continuar la anterior). */
  const restart = useCallback(() => {
    resetHud();
    EventBus.emit(GameEvents.restartRequested);
    if (settings.fullscreen) fullscreen.enter();
  }, [resetHud, settings.fullscreen, fullscreen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // En el menu de inicio las teclas las atiende el propio menu.
      // Con la partida acabada solo cuentan sus botones (Enter o espacio, que ya tienen el foco).
      // Con el aviso de girar la pantalla no se juega.
      if (event.repeat || !onBoard || over || needsLandscape) return;
      // Con el aviso de lo desbloqueado abierto, Esc lo acepta (Enter ya lo hace el boton, que tiene el foco).
      if (unlock && !paused) {
        if (event.key === 'Escape') acceptUnlock();
        return;
      }
      // Con una ficha abierta (T-010), Esc la cierra (Enter tambien: el boton de cerrar tiene el foco).
      if (info && !paused) {
        if (event.key === 'Escape') closeInfo();
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
  }, [onBoard, paused, selected, plantPanel, over, resume, fullscreen, unlock, acceptUnlock, info, closeInfo, needsLandscape]);

  // Si el jugador cambia de pestana, minimiza o cierra, la partida se guarda en ese momento (T-011) y al volver encuentra
  // el juego en pausa.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      EventBus.emit(GameEvents.saveRequested);
      pause();
    };
    const onPageHide = () => EventBus.emit(GameEvents.saveRequested);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [pause]);

  return (
    // Con la pausa (o el aviso de lo desbloqueado, o una ficha) se congelan tambien las animaciones CSS que cuentan tiempo (el aviso de la ronda).
    <main className={`app${halted ? ' is-paused' : ''}`}>
      <GameCanvas quality={level} language={settings.language} screen={screen} paused={halted} asleep={needsLandscape} />

      {screen === 'title' && (
        <TitleScreen
          saved={saved}
          settings={settings}
          autoLevel={autoLevel}
          fullscreenSupported={fullscreen.supported}
          onChange={update}
          onNewGame={newGame}
          onLoadGame={loadGame}
        />
      )}

      {onBoard && (
        <header ref={hudRef} className="hud" aria-hidden={halted || over}>
          <div className="seed-tray" aria-label={t.hud.cards} data-silent>
            {CARDS.filter((id) => (round?.cards ?? ['shooter']).includes(id)).map((id) => (
              // Cada carta nueva entra en la bandeja con un salto al desbloquearse.
              <span key={id} className="card-slot" data-tour={`card-${id}`}>
                <Card
                  card={id}
                  label={t.hud.cardNames[id]}
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
              aria-label={t.hud.pause}
              title={t.hud.pauseTitle}
              onClick={() => setPaused(true)}
              {...{ [NO_AUTO_FULLSCREEN]: '' }}
            >
              <span className="pause-icon" aria-hidden="true" />
            </button>
          </div>
        </header>
      )}

      {onBoard && plantPanel && !halted && !over && <LevelPanel key={plantPanel.id} panel={plantPanel} avoid={hudRef} />}

      {tours.tour && tours.step && (
        <TourOverlay
          tour={tours.tour}
          step={tours.step}
          index={tours.stepIndex}
          count={tours.stepCount}
          board={tours.board}
          art={tours.art}
          cheer={tours.cheer}
          hideHand={selected !== null}
          onNext={tours.next}
          onSkip={tours.skip}
        />
      )}

      {tours.hintCoin && <CoinHint key={tours.hintCoin.id} coin={tours.hintCoin} />}

      {settings.showFps && fps !== null && <div className="fps">{fps} FPS</div>}

      {!ready && (
        <div className="loading" role="status">
          <span className="loading-sprout" aria-hidden="true" />
          {t.common.loading}
        </div>
      )}

      {onBoard && lost && <DefeatScreen round={round} loss={loss} onRestart={restart} onMenu={exitToMenu} />}

      {onBoard && won && !lost && <VictoryScreen rounds={round?.total ?? 0} onRestart={restart} onMenu={exitToMenu} />}

      {onBoard && unlock && !paused && !over && <UnlockModal unlock={unlock} onAccept={acceptUnlock} />}

      {onBoard && info && !paused && !over && !unlock && <InfoPanel info={info} onClose={closeInfo} />}

      {onBoard && paused && !over && (
        <PauseMenu
          settings={settings}
          autoLevel={autoLevel}
          fullscreenSupported={fullscreen.supported}
          onChange={update}
          onResume={resume}
          onExit={exitToMenu}
        />
      )}

      {needsLandscape && <RotateNotice paused={onBoard && !over} />}
    </main>
  );
}
