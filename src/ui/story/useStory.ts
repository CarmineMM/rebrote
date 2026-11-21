import { useCallback, useEffect, useRef, useState } from 'react';
import type { OutbreakId } from '../../game/core/outbreaks';
import type { RoundInfo } from '../../game/EventBus';
import { playerProgress } from '../../game/progress';
import { STORY_PROMPTS, storiesAt, storySteps, type StoryId, type StoryStep } from './stories';

interface UseStoryOptions {
  /** Jugador activo (T-034): cada uno tiene su historia vista. Solo cambia en la portada. */
  player: string;
  onBoard: boolean;
  /** Ronda en curso de la partida: la apertura sale en la preparacion de la ronda 1 del brote 1. */
  round: RoundInfo | null;
  /** Se acaba de vencer al jefe de este brote (la escena ya lo apunto en el progreso), o null. */
  wonOutbreak: OutbreakId | null;
  /** Se esta en el Invernadero, con estos brotes vencidos, o null. */
  greenhouse: readonly string[] | null;
  /**
   * Una secuencia vista quedo apuntada (acabada o saltada, no al volver a verla): quien guarda el progreso lo vuelve a
   * leer, y si es la que pregunta el nombre, comprueba que el jugador ya tiene uno (T-033).
   */
  onSeen: (id: StoryId) => void;
}

/** Una secuencia en cola: las que se vuelven a ver desde el Invernadero no se apuntan otra vez. */
interface Queued {
  readonly id: StoryId;
  readonly replay: boolean;
  /** Cambia con cada una: una secuencia repetida vuelve a empezar de cero. */
  readonly key: number;
}

/**
 * Pone en marcha las viñetas de la historia (T-031, ADR-0019). Mira el momento (la ronda de la partida, la victoria o el
 * Invernadero) y pone en cola las secuencias que tocan y aun no se vieron (`storiesAt`). Una secuencia cuenta como vista
 * al acabarla o al saltarla, y se apunta en el progreso permanente del jugador: no vuelve a salir sola, tampoco tras
 * recargar. Las vistas se pueden volver a ver desde el Invernadero (`replay`) sin apuntarlas otra vez.
 */
export function useStory({ player, onBoard, round, wonOutbreak, greenhouse, onSeen }: UseStoryOptions) {
  const [queue, setQueue] = useState<readonly Queued[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const nextKey = useRef(1);
  /** Ultimo momento que ya trajo sus secuencias: no se vuelven a poner en cola si el estado se repite. */
  const lastMoment = useRef<string | null>(null);

  /** Pone en cola lo que toca en este momento y no se vio ni esta ya en cola. */
  const enqueue = useCallback((ids: readonly StoryId[]) => {
    if (ids.length === 0) return;
    setQueue((current) => {
      const fresh = ids.filter((id) => !current.some((queued) => queued.id === id && !queued.replay));
      return fresh.length ? [...current, ...fresh.map((id) => ({ id, replay: false, key: nextKey.current++ }))] : current;
    });
  }, []);

  /** Lo visto se lee del progreso en el momento: es del jugador activo y puede haber cambiado en otra pestana. */
  const seen = () => playerProgress.read().story;

  const roundNumber = round?.number ?? null;
  const outbreak = round?.outbreak ?? null;
  const phase = round?.phase ?? null;

  // En la partida: la ronda en curso (al empezarla o al cargarla).
  useEffect(() => {
    if (!onBoard || roundNumber === null || outbreak === null || phase === null) return;
    const moment = `match:${outbreak}:${roundNumber}:${phase}`;
    if (moment === lastMoment.current) return;
    lastMoment.current = moment;
    enqueue(storiesAt({ kind: 'match', outbreak, round: roundNumber - 1, phase }, seen()));
  }, [onBoard, outbreak, roundNumber, phase, enqueue]);

  // Al vencer a un jefe.
  useEffect(() => {
    if (!onBoard || !wonOutbreak) return;
    const moment = `victory:${wonOutbreak}`;
    if (moment === lastMoment.current) return;
    lastMoment.current = moment;
    enqueue(storiesAt({ kind: 'victory', outbreak: wonOutbreak }, seen()));
  }, [onBoard, wonOutbreak, enqueue]);

  // Al entrar al Invernadero.
  const inGreenhouse = greenhouse !== null;
  const defeatedKey = greenhouse?.join(',') ?? '';
  useEffect(() => {
    if (!inGreenhouse) return;
    const moment = `greenhouse:${player}:${defeatedKey}`;
    if (moment === lastMoment.current) return;
    lastMoment.current = moment;
    enqueue(storiesAt({ kind: 'greenhouse', defeated: defeatedKey ? defeatedKey.split(',') : [] }, seen()));
  }, [inGreenhouse, defeatedKey, player, enqueue]);

  // Al salir de la partida o del Invernadero, lo que no salio se queda sin ver: volvera a tocar la proxima vez.
  useEffect(() => {
    if (onBoard || inGreenhouse) return;
    lastMoment.current = null;
    setQueue((current) => (current.length ? [] : current));
  }, [onBoard, inGreenhouse]);

  // Otro jugador (solo desde la portada): nada de lo del anterior.
  const queuedFor = useRef(player);
  useEffect(() => {
    if (queuedFor.current === player) return;
    queuedFor.current = player;
    lastMoment.current = null;
    setQueue([]);
  }, [player]);

  const current = queue[0] ?? null;
  const steps: readonly StoryStep[] = current ? storySteps(current.id, STORY_PROMPTS) : [];
  const step = steps[Math.min(stepIndex, steps.length - 1)] ?? null;

  useEffect(() => setStepIndex(0), [current?.key]);

  /** Acaba la secuencia en curso (al llegar al final o al saltarla): cuenta como vista. */
  const finish = useCallback(() => {
    const done = queue[0];
    if (!done) return;
    if (!done.replay) {
      playerProgress.recordStory(done.id);
      onSeen(done.id);
    }
    setStepIndex(0);
    setQueue((list) => list.filter((queued) => queued.key !== done.key));
  }, [queue, onSeen]);

  const next = useCallback(() => {
    if (stepIndex + 1 < steps.length) setStepIndex(stepIndex + 1);
    else finish();
  }, [stepIndex, steps.length, finish]);

  /** Vuelve a ver una secuencia ya vista (Y-05): va la primera y no se apunta otra vez. */
  const replay = useCallback((id: StoryId) => {
    setQueue((list) => [{ id, replay: true, key: nextKey.current++ }, ...list.filter((queued) => queued.replay === false)]);
    setStepIndex(0);
  }, []);

  return {
    story: current && step ? current.id : null,
    /** La secuencia en curso se esta volviendo a ver (Y-05): no pregunta nada (T-033). */
    replaying: current?.replay ?? false,
    /** Cambia con cada secuencia que empieza, aunque se repita la misma. */
    storyKey: current?.key ?? 0,
    step,
    stepIndex,
    stepCount: steps.length,
    next,
    skip: finish,
    replay,
  };
}
