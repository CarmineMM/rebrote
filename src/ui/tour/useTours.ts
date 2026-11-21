import { useCallback, useEffect, useRef, useState } from 'react';
import { EventBus, GameEvents, type CoinGone, type DroppedCoin, type PlayerAction, type RoundInfo, type TourArt, type TourBoard } from '../../game/EventBus';
import { hintDone, hintPending, hintShown, markTourDone, readTourProgress, writeTourProgress } from './tourProgress';
import { TOURS, cueOf, toursOfRound, type TourCue, type TourId } from './tours';

interface UseToursOptions {
  onBoard: boolean;
  round: RoundInfo | null;
  /** Opcion "Ayuda" de los ajustes (T-013). Apagada, no sale ningun tour ni pista. */
  help: boolean;
  /** Algo tapa el juego (pausa, aviso de lo desbloqueado, ficha o aviso de girar): el tour espera debajo. */
  covered: boolean;
  /** Partida acabada. */
  over: boolean;
}

/** Lo que dura la celebracion de un paso hecho antes de pasar al siguiente. */
const CHEER_MS = 900;

/**
 * Pone en marcha los tours de ayuda (T-013, ADR-0012). Al empezar la preparacion de una ronda se ponen en cola los tours
 * de lo que desbloquea; sale el primero que no se haya visto, si la ayuda esta encendida y no hay nada encima. Mientras
 * hay tour, la escena no descuenta la preparacion (`tourHold`). Un paso se completa al hacerlo de verdad (`playerAction`,
 * la ficha o el ataque) o con "Siguiente". El tour cuenta como visto al acabarlo, al saltarlo o si empieza el ataque.
 * Tambien lleva la pista de la moneda en el suelo, que sale en mitad del juego sin parar nada.
 */
export function useTours({ onBoard, round, help, covered, over }: UseToursOptions) {
  const [progress, setProgress] = useState(readTourProgress);
  /** Tours de la ronda en curso, si se entro en ella por su preparacion. */
  const [queue, setQueue] = useState<TourId[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [cheer, setCheer] = useState(false);
  const [board, setBoard] = useState<TourBoard | null>(null);
  const [art, setArt] = useState<TourArt | null>(null);
  const [coins, setCoins] = useState<DroppedCoin[]>([]);
  /** Moneda que lleva la pista ahora mismo. */
  const [hintCoin, setHintCoin] = useState<number | null>(null);
  /** Ultima ronda que trajo sus tours, con su brote ("creeper:3"). */
  const roundSeen = useRef<string | null>(null);
  /** Tour que ya se llego a ver: si empieza el ataque a medias, cuenta como visto. */
  const shown = useRef<TourId | null>(null);

  useEffect(() => writeTourProgress(progress), [progress]);

  const roundNumber = round?.number ?? null;
  const outbreak = round?.outbreak ?? null;
  const phase = round?.phase ?? null;

  // Cada ronda nueva que empieza por su preparacion trae sus tours. Una partida cargada en mitad del ataque, ninguno.
  useEffect(() => {
    if (!onBoard || roundNumber === null || outbreak === null) {
      roundSeen.current = null;
      setQueue([]);
      return;
    }
    const seen = `${outbreak}:${roundNumber}`;
    if (seen === roundSeen.current) return;
    roundSeen.current = seen;
    setQueue(phase === 'prep' ? toursOfRound(outbreak, roundNumber - 1) : []);
    setStepIndex(0);
    setCheer(false);
    // Solo cuenta el cambio de ronda: la fase se lee en ese momento.
  }, [onBoard, outbreak, roundNumber]);

  const tour: TourId | null =
    help && onBoard && !over && phase === 'prep' ? (queue.find((id) => !progress.done.includes(id)) ?? null) : null;
  const steps = tour ? TOURS[tour] : [];
  const step = steps[Math.min(stepIndex, steps.length - 1)] ?? null;
  const visible = tour !== null && step !== null && !covered;
  if (visible) shown.current = tour;

  const finish = useCallback((id: TourId) => {
    setProgress((current) => markTourDone(current, id));
    setStepIndex(0);
    setCheer(false);
    if (shown.current === id) shown.current = null;
  }, []);

  // Empieza el ataque con un tour a medias ("¡Que vengan!", que ademas es el ultimo paso de lo basico): queda visto.
  useEffect(() => {
    if (phase !== 'attack' || !shown.current) return;
    finish(shown.current);
  }, [phase, finish]);

  const next = useCallback(() => {
    if (!tour) return;
    if (stepIndex + 1 < TOURS[tour].length) {
      setStepIndex(stepIndex + 1);
      setCheer(false);
    } else {
      finish(tour);
    }
  }, [tour, stepIndex, finish]);

  const skip = useCallback(() => {
    if (tour) finish(tour);
  }, [tour, finish]);

  // El jugador hizo lo que ensena el paso: se celebra y se pasa al siguiente.
  const latest = useRef({ step, cheer, next });
  latest.current = { step, cheer, next };
  const cue = useCallback((done: TourCue) => {
    const { step: current, cheer: cheering } = latest.current;
    if (!current || cheering || current.doneWhen !== done) return;
    setCheer(true);
    window.setTimeout(() => latest.current.next(), CHEER_MS);
  }, []);

  // Con tour, la preparacion no descuenta. Una escena que arranca (cambio de calidad o de idioma) lo vuelve a saber.
  const hold = tour !== null;
  const holdRef = useRef(hold);
  holdRef.current = hold;
  useEffect(() => {
    EventBus.emit(GameEvents.tourHold, hold);
  }, [hold]);

  useEffect(() => {
    const onReady = () => {
      EventBus.emit(GameEvents.tourHold, holdRef.current);
      // Las monedas del suelo no sobreviven a la escena.
      setCoins([]);
    };
    const onAction = (action: PlayerAction) => cue(cueOf(action));
    const onInfo = () => cue('info');
    const onDropped = (coin: DroppedCoin) => setCoins((list) => [...list.filter((c) => c.id !== coin.id), coin].sort((a, b) => a.id - b.id));
    const onGone = (gone: CoinGone) => setCoins((list) => list.filter((c) => c.id !== gone.id));
    EventBus.on(GameEvents.sceneReady, onReady);
    EventBus.on(GameEvents.tourBoard, setBoard);
    EventBus.on(GameEvents.tourArt, setArt);
    EventBus.on(GameEvents.playerAction, onAction);
    EventBus.on(GameEvents.entityInfo, onInfo);
    EventBus.on(GameEvents.coinDropped, onDropped);
    EventBus.on(GameEvents.coinGone, onGone);
    return () => {
      EventBus.off(GameEvents.sceneReady, onReady);
      EventBus.off(GameEvents.tourBoard, setBoard);
      EventBus.off(GameEvents.tourArt, setArt);
      EventBus.off(GameEvents.playerAction, onAction);
      EventBus.off(GameEvents.entityInfo, onInfo);
      EventBus.off(GameEvents.coinDropped, onDropped);
      EventBus.off(GameEvents.coinGone, onGone);
    };
  }, [cue]);

  // Pista de la moneda: la primera que cae lleva la pista, si toca. Al recogerla se aprende; si se pierde, sale otra vez
  // con la siguiente (hasta `HINT_MAX_SHOWS`).
  const hintAllowed = help && onBoard && !over && !covered && tour === null;
  useEffect(() => {
    if (hintCoin !== null) {
      if (!coins.some((c) => c.id === hintCoin)) setHintCoin(null);
      return;
    }
    if (!hintAllowed || coins.length === 0 || !hintPending(progress, 'droppedCoin')) return;
    setHintCoin(coins[0].id);
    setProgress((current) => hintShown(current, 'droppedCoin'));
  }, [coins, hintCoin, hintAllowed, progress]);

  useEffect(() => {
    if (hintCoin === null) return;
    const onGone = (gone: CoinGone) => {
      if (gone.id === hintCoin && gone.collected) setProgress((current) => hintDone(current, 'droppedCoin'));
    };
    EventBus.on(GameEvents.coinGone, onGone);
    return () => {
      EventBus.off(GameEvents.coinGone, onGone);
    };
  }, [hintCoin]);

  const coinShown = hintAllowed && hintCoin !== null ? (coins.find((c) => c.id === hintCoin) ?? null) : null;

  return {
    tour: visible ? tour : null,
    step: visible ? step : null,
    stepIndex,
    stepCount: steps.length,
    cheer,
    board,
    art,
    next,
    skip,
    hintCoin: coinShown,
  };
}
