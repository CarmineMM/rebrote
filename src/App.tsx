import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CardId } from './game/core/match';
import { FIRST_OUTBREAK, type OutbreakId } from './game/core/outbreaks';
import { isGreenhouseOpen } from './game/core/route';
import type { GameScreen } from './game/createGame';
import {
  EventBus,
  GameEvents,
  type BossInfo,
  type CardPreview,
  type EntityInfo,
  type LossInfo,
  type MatchRequest,
  type MenuPlace,
  type PlantPanel,
  type RouteArt,
  type RoundInfo,
  type UnlockInfo,
} from './game/EventBus';
import { activeProfile, profiles, type ProfileList } from './game/profiles';
import { playerProgress, type Progress } from './game/progress';
import { readSave, type SavedGame } from './game/save';
import { SCENES } from './game/scenes/keys';
import { Balance } from './ui/Balance';
import { Card } from './ui/Card';
import { DefeatScreen } from './ui/DefeatScreen';
import { GameCanvas } from './ui/GameCanvas';
import { Greenhouse } from './ui/Greenhouse';
import { InfoPanel } from './ui/InfoPanel';
import { LevelPanel } from './ui/LevelPanel';
import { Lives } from './ui/Lives';
import { PauseMenu } from './ui/PauseMenu';
import { describePlayer, playerName } from './ui/playerCards';
import { RotateNotice } from './ui/RotateNotice';
import { RoundHud } from './ui/RoundHud';
import { TitleMenu, TitleScreen } from './ui/TitleScreen';
import { UnlockModal } from './ui/UnlockModal';
import { NO_AUTO_FULLSCREEN, useFullscreen } from './ui/useFullscreen';
import { useKeyboardArea } from './ui/useKeyboardArea';
import { useNeedsLandscape } from './ui/useLandscapeOnly';
import { sfx } from './game/audio/sfx';
import { useButtonSounds } from './ui/useButtonSounds';
import { useSettings } from './ui/useSettings';
import { useText } from './ui/useText';
import { VictoryScreen } from './ui/VictoryScreen';
import { CoinHint } from './ui/tour/CoinHint';
import { TourOverlay } from './ui/tour/TourOverlay';
import { useTours } from './ui/tour/useTours';
import { nameAfterStory, type StoryId } from './ui/story/stories';
import { StoryOverlay } from './ui/story/StoryOverlay';
import { useStory } from './ui/story/useStory';

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
 * ADR-0012) ensenan lo nuevo de cada ronda encima del juego vivo, y esperan debajo de todo lo demas. Fuera de la partida
 * se esta en la portada o, si ya se vencio a Creeper, en el Invernadero (T-019, ADR-0016), al que lleva la victoria.
 * Todo lo guardado (partida, progreso y tours vistos) es del jugador activo (T-034, ADR-0018), que solo se cambia en la
 * portada. Las viñetas de la historia (T-031, ADR-0019) salen al empezar el brote 1, al vencer a Creeper y al llegar al
 * Invernadero: mientras hay una, el juego espera en pausa, los tours esperan debajo y la victoria espera a que acabe.
 * En la de Creeper, Boxer pregunta el nombre del jugador (T-033), que va en su perfil y se cambia en Opciones; quien no lo
 * dice o salta las viñetas se queda con el apodo de Boxer. Con el teclado en pantalla abierto, la viñeta y el panel del
 * menu se meten en lo que se ve (`useKeyboardArea`).
 */
export function App() {
  const t = useText();
  const [screen, setScreen] = useState<GameScreen>('title');
  /** Escena que aviso de que esta lista; mientras no sea la de la pantalla, se ve la carga. */
  const [readyScene, setReadyScene] = useState<string | null>(null);
  const ready = readyScene === SCENE_OF[screen];
  /** Jugadores de este aparato y el activo (T-034). El primero se crea solo, sin ninguna pantalla. */
  const [playerList, setPlayerList] = useState<ProfileList>(() => profiles.read());
  /** Partida guardada del jugador activo, para "Continuar" en el menu de inicio. */
  const [saved, setSaved] = useState<SavedGame | null>(() => readSave());
  /** Progreso permanente del jugador activo (T-017), para el Invernadero y su ruta (T-019). */
  const [progress, setProgress] = useState<Progress>(() => playerProgress.read());
  /** Lo que tiene cada jugador, para la pantalla de jugadores. El activo, al dia con su partida y su progreso. */
  const players = useMemo(
    () => playerList.profiles.map((profile) => describePlayer(profile, profiles.storeOf(profile.id))),
    // Cuando cambian la partida o el progreso del activo, cambia lo que tiene: se vuelve a leer.
    [playerList, saved, progress],
  );
  /** Portada o Invernadero (T-019). El Invernadero solo se ve si esta abierto: sin progreso (o borrado), la portada. */
  const [place, setPlace] = useState<MenuPlace>('cover');
  const inGreenhouse = place === 'greenhouse' && isGreenhouseOpen(progress.defeated);
  /** Lo que pinta la escena de portada: la batalla o, en el Invernadero, el jardin de las plantas del jugador. */
  const scenePlace: MenuPlace = inGreenhouse ? 'greenhouse' : 'cover';
  /** Jefes recortados por la portada para la ruta de brotes (T-019). */
  const [routeArt, setRouteArt] = useState<RouteArt | null>(null);
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
  /** Se vencio al jefe del brote: lo que Boxer cuenta de el sale antes de la victoria (T-031). */
  const wonOutbreak = onBoard && won && !lost ? (round?.outbreak ?? FIRST_OUTBREAK) : null;
  /** Una secuencia vista: el progreso cambio y, si preguntaba el nombre y no lo dio, Boxer le pone el apodo (T-033). */
  const storySeen = useCallback((id: StoryId) => {
    setProgress(playerProgress.read());
    const player = profiles.active();
    const fallback = nameAfterStory(id, player.name);
    if (fallback) setPlayerList(profiles.rename(player.id, fallback));
  }, []);
  // Viñetas de la historia (T-031): la apertura, lo que cuenta Boxer al caer Creeper y Patty en el Invernadero.
  const story = useStory({
    player: playerList.active,
    onBoard,
    round,
    wonOutbreak,
    greenhouse: screen === 'title' && inGreenhouse ? progress.defeated : null,
    onSeen: storySeen,
  });
  const nextStoryStep = story.next;
  /** El nombre que escribio en la viñeta, o el apodo (T-033): va a su perfil y la viñeta siguiente ya le llama asi. */
  const answerName = useCallback(
    (name: string) => {
      setPlayerList(profiles.rename(profiles.active().id, name));
      nextStoryStep();
    },
    [nextStoryStep],
  );
  /** Desde Opciones de la portada (T-033). */
  const renamePlayer = useCallback((name: string) => setPlayerList(profiles.rename(profiles.active().id, name)), []);
  const player = activeProfile(playerList);
  /** El trozo que se ve con el teclado en pantalla abierto, o null (T-033). */
  const keyboard = useKeyboardArea();
  const storyOn = story.story !== null;
  /** El juego espera: menu de pausa, aviso de lo desbloqueado, ficha o una viñeta de la historia. */
  const halted = onBoard && (paused || unlock !== null || info !== null || storyOn);
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
  const tours = useTours({ player: playerList.active, onBoard, round, help: settings.help, covered: halted || needsLandscape, over });

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
      // La escena ya apunto al jefe como vencido: el Invernadero esta abierto cuando se va a el desde la victoria.
      setProgress(playerProgress.read());
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
    EventBus.on(GameEvents.routeArt, setRouteArt);
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
      EventBus.off(GameEvents.routeArt, setRouteArt);
    };
  }, []);

  // Cambiar la calidad o el idioma recrea el juego: se vuelve a mostrar la carga hasta que este listo.
  useEffect(() => setReadyScene(null), [level, settings.language]);

  /** Vuelve a leer lo del jugador activo: su partida, su progreso y la lista de jugadores (con su ultimo guardado). */
  const refreshPlayer = useCallback(() => {
    setPlayerList(profiles.read());
    setSaved(readSave());
    setProgress(playerProgress.read());
  }, []);

  // Al volver al menu (o al abrirlo), "Continuar" mira lo que hay guardado, y el Invernadero, el progreso (un jefe recien
  // vencido ya esta apuntado).
  useEffect(() => {
    if (screen === 'title') refreshPlayer();
  }, [screen, refreshPlayer]);

  /**
   * Cambiar, crear o borrar un jugador (T-034): solo en la portada, nunca en mitad de una partida. Cambia la partida, el
   * progreso, el Invernadero, la ruta y los tours vistos; los ajustes no. Se vuelve a la portada.
   */
  const changePlayer = useCallback(
    (change: () => void) => {
      if (screen !== 'title') return;
      change();
      setPlace('cover');
      refreshPlayer();
    },
    [screen, refreshPlayer],
  );
  const selectPlayer = useCallback((id: string) => changePlayer(() => profiles.select(id)), [changePlayer]);
  const createPlayer = useCallback(() => changePlayer(() => profiles.create()), [changePlayer]);
  const removePlayer = useCallback((id: string) => changePlayer(() => profiles.remove(id)), [changePlayer]);

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

  /** Desde el Invernadero o su ruta (T-019): un brote desde la ronda 1. Si habia partida a medias, ya se confirmo pisarla. */
  const playOutbreak = useCallback((outbreak: OutbreakId) => startMatch({ outbreak }), [startMatch]);

  const loadGame = useCallback(() => {
    const save = readSave();
    if (!save) {
      setSaved(null);
      return;
    }
    startMatch({ resume: save.match, pendingUnlock: save.pendingUnlock });
  }, [startMatch]);

  /**
   * Vuelve al menu de inicio: a la portada o, desde la victoria, al Invernadero (T-019). La escena guarda la partida (si
   * no esta acabada) y deja paso a la escena de portada.
   */
  const exitToMenu = useCallback(
    (to: MenuPlace = 'cover') => {
      EventBus.emit(GameEvents.exitRequested, to);
      resetHud();
      setScreen('title');
      setPlace(to);
      refreshPlayer();
    },
    [resetHud, refreshPlayer],
  );
  const exitToCover = useCallback(() => exitToMenu('cover'), [exitToMenu]);
  const exitToGreenhouse = useCallback(() => exitToMenu('greenhouse'), [exitToMenu]);

  // La escena de portada pinta el sitio en el que se esta: al entrar o salir del Invernadero cambia la batalla por el
  // jardin del jugador, o al reves (T-019). Si ya lo pinta (arranco asi), no hace nada.
  useEffect(() => {
    if (screen === 'title') EventBus.emit(GameEvents.menuPlaceChanged, scenePlace);
  }, [screen, scenePlace]);

  /** "Continuar" en la portada (T-019, R-02): con el Invernadero abierto lleva a el; sin el, reanuda la guardada. */
  const continueFromCover = useCallback(() => {
    if (isGreenhouseOpen(progress.defeated)) setPlace('greenhouse');
    else loadGame();
  }, [progress.defeated, loadGame]);

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
    <main
      className={`app${halted ? ' is-paused' : ''}${keyboard ? ' has-keyboard' : ''}`}
      style={keyboard ? ({ '--keyboard-top': `${keyboard.top}px`, '--keyboard-height': `${keyboard.height}px` } as CSSProperties) : undefined}
    >
      <GameCanvas quality={level} language={settings.language} screen={screen} place={scenePlace} paused={halted} asleep={needsLandscape} />

      {screen === 'title' && (
        <TitleScreen greenhouse={inGreenhouse} player={playerName(t, player)} inert={storyOn}>
          {inGreenhouse ? (
            <Greenhouse
              saved={saved}
              progress={progress}
              art={routeArt}
              onResume={loadGame}
              onPlay={playOutbreak}
              onReplay={story.replay}
              onBack={() => setPlace('cover')}
            />
          ) : (
            <TitleMenu
              saved={saved}
              progress={progress}
              players={players}
              player={playerList.active}
              settings={settings}
              autoLevel={autoLevel}
              fullscreenSupported={fullscreen.supported}
              onChange={update}
              onNewGame={newGame}
              onContinue={continueFromCover}
              onSelectPlayer={selectPlayer}
              onCreatePlayer={createPlayer}
              onRemovePlayer={removePlayer}
              onRenamePlayer={renamePlayer}
            />
          )}
        </TitleScreen>
      )}

      {onBoard && (
        <header ref={hudRef} className="hud" aria-hidden={halted || over} inert={storyOn}>
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

      {story.story && story.step && (
        <StoryOverlay
          key={story.storyKey}
          story={story.story}
          step={story.step}
          index={story.stepIndex}
          count={story.stepCount}
          name={player.name}
          onAnswer={story.replaying ? undefined : answerName}
          initialName={player.name ?? ''}
          hidden={(onBoard && paused && !over) || needsLandscape}
          onNext={story.next}
          onSkip={story.skip}
        />
      )}

      {settings.showFps && fps !== null && <div className="fps">{fps} FPS</div>}

      {!ready && (
        <div className="loading" role="status">
          <span className="loading-sprout" aria-hidden="true" />
          {t.common.loading}
        </div>
      )}

      {onBoard && lost && <DefeatScreen round={round} loss={loss} onRestart={restart} onMenu={exitToCover} />}

      {onBoard && won && !lost && !storyOn && (
        <VictoryScreen outbreak={round?.outbreak ?? FIRST_OUTBREAK} rounds={round?.total ?? 0} onRestart={restart} onGreenhouse={exitToGreenhouse} />
      )}

      {onBoard && unlock && !paused && !over && !storyOn && <UnlockModal unlock={unlock} onAccept={acceptUnlock} />}

      {onBoard && info && !paused && !over && !unlock && <InfoPanel info={info} onClose={closeInfo} />}

      {onBoard && paused && !over && (
        <PauseMenu
          outbreak={round?.outbreak ?? FIRST_OUTBREAK}
          settings={settings}
          autoLevel={autoLevel}
          fullscreenSupported={fullscreen.supported}
          onChange={update}
          onResume={resume}
          onExit={exitToCover}
        />
      )}

      {needsLandscape && <RotateNotice paused={onBoard && !over} />}
    </main>
  );
}
