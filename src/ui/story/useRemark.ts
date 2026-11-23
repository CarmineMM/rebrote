import { useCallback, useEffect, useRef, useState } from 'react';
import type { OutbreakId } from '../../game/core/outbreaks';
import type { RoundInfo } from '../../game/EventBus';
import { playerProgress } from '../../game/progress';
import { remarkAt, remarkFate, remarkKey, type Remark } from './remarks';

interface UseRemarkOptions {
  /** Jugador activo (T-034): cada uno tiene lo suyo visto. Solo cambia en la portada. */
  player: string;
  onBoard: boolean;
  round: RoundInfo | null;
  /** Partida acabada. */
  over: boolean;
  /**
   * Algo encima: una viñeta, un tour, el aviso de lo desbloqueado, una ficha, la pausa o el aviso de girar. El comentario
   * espera debajo, sin verse y con su reloj quieto.
   */
  covered: boolean;
}

/** El comentario de la ronda en curso. */
interface Current {
  readonly outbreak: OutbreakId;
  readonly remark: Remark;
  /** Ya se llego a ver (y quedo apuntado como visto). */
  readonly shown: boolean;
  /** Se esta yendo: cerrado con un toque, acabado o cortado por el ataque. */
  readonly leaving: boolean;
}

/**
 * Pone en marcha los comentarios de la historia (T-043): al empezar la preparacion de una ronda que tiene uno sin ver
 * (`remarkAt`), lo prepara; sale cuando no hay nada encima (`remarkFate`) y se va solo, con un toque o al empezar el ataque.
 * Cuenta como visto en cuanto se ve, aunque el ataque lo corte enseguida: no vuelve a salir. El que no llego a verse (la
 * preparacion se paso entera con algo encima) sale la proxima vez que se llegue a esa ronda.
 */
export function useRemark({ player, onBoard, round, over, covered }: UseRemarkOptions) {
  const [current, setCurrent] = useState<Current | null>(null);
  /** Ultima ronda que ya trajo su comentario ("morris:3"): la ronda se repite cada segundo con la cuenta atras. */
  const roundSeen = useRef<string | null>(null);

  const roundNumber = round?.number ?? null;
  const outbreak = round?.outbreak ?? null;
  const phase = round?.phase ?? null;

  // Cada ronda que empieza por su preparacion trae el suyo. Una partida cargada en pleno ataque, ninguno.
  useEffect(() => {
    if (!onBoard || roundNumber === null || outbreak === null) {
      roundSeen.current = null;
      setCurrent(null);
      return;
    }
    const key = `${outbreak}:${roundNumber}`;
    if (key === roundSeen.current) return;
    roundSeen.current = key;
    const remark = phase ? remarkAt({ outbreak, round: roundNumber - 1, phase }, playerProgress.read().story) : null;
    setCurrent(remark ? { outbreak, remark, shown: false, leaving: false } : null);
    // Solo cuenta el cambio de ronda: la fase se lee en ese momento.
  }, [onBoard, outbreak, roundNumber]);

  // Otro jugador (solo desde la portada): nada de lo del anterior.
  const queuedFor = useRef(player);
  useEffect(() => {
    if (queuedFor.current === player) return;
    queuedFor.current = player;
    roundSeen.current = null;
    setCurrent(null);
  }, [player]);

  const fate = remarkFate({ phase, over, covered });

  // Empieza el ataque o se acaba la partida (HG-04): el que se ve se va; el que aun no salio, ya no sale.
  useEffect(() => {
    if (fate !== 'cut') return;
    setCurrent((now) => (!now ? now : now.shown ? (now.leaving ? now : { ...now, leaving: true }) : null));
  }, [fate]);

  /** Ya se ve: queda visto en el perfil del jugador (regla 13), con las viñetas. */
  const latest = useRef(current);
  latest.current = current;
  const shown = useCallback(() => {
    const now = latest.current;
    if (!now || now.shown) return;
    playerProgress.recordStory(remarkKey(now.outbreak, now.remark));
    setCurrent((same) => (same && same.remark === now.remark ? { ...same, shown: true } : same));
  }, []);

  /** Un toque o se acabo su tiempo: se va. */
  const dismiss = useCallback(() => setCurrent((now) => (now && !now.leaving ? { ...now, leaving: true } : now)), []);

  /** Ya se fue. */
  const gone = useCallback(() => setCurrent(null), []);

  return {
    remark: current?.remark ?? null,
    outbreak: current?.outbreak ?? null,
    /** Tapado: no se ve y su reloj no corre. */
    hidden: fate !== 'show' && !current?.leaving,
    leaving: current?.leaving ?? false,
    shown,
    dismiss,
    gone,
  };
}
