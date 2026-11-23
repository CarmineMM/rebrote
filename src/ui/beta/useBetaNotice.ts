import { useCallback, useEffect, useState } from 'react';
import { lastOutbreak } from '../../game/core/route';
import { betaNoticeDue, markBetaSeen, readBetaSeen, type BetaMoment } from './betaNotice';

interface UseBetaNoticeOptions {
  /** Jugador activo (T-034): cada uno lo ve una vez. Solo cambia en la portada. */
  player: string;
  /** Se acaba de vencer al jefe de este brote (en el tablero; la escena ya lo apunto en el progreso), o null. */
  wonOutbreak: string | null;
  /** Se esta en el Invernadero. */
  greenhouse: boolean;
  /** Brotes vencidos del progreso del jugador. */
  defeated: readonly string[];
}

/**
 * Pone el aviso de beta (T-044) cuando toca (`betaNoticeDue`): tras vencer al ultimo brote o, quien ya lo habia vencido,
 * al entrar al Invernadero. Quien lo pinta espera a que acaben las viñetas. Cuenta como visto en cuanto se ve (`shown`),
 * no al cerrarlo: recargar con el aviso delante no lo vuelve a sacar.
 */
export function useBetaNotice({ player, wonOutbreak, greenhouse, defeated }: UseBetaNoticeOptions) {
  /** El ultimo brote del que se esta avisando, o null sin aviso. */
  const [open, setOpen] = useState<string | null>(null);
  const defeatedKey = defeated.join(',');

  useEffect(() => {
    const moment: BetaMoment | null = wonOutbreak ? { kind: 'victory', outbreak: wonOutbreak } : greenhouse ? { kind: 'greenhouse' } : null;
    // Fuera de la victoria y del Invernadero no hay aviso.
    if (!moment) {
      setOpen(null);
      return;
    }
    const vanquished = defeatedKey ? defeatedKey.split(',') : [];
    if (betaNoticeDue(moment, vanquished, readBetaSeen())) setOpen(lastOutbreak());
  }, [wonOutbreak, greenhouse, defeatedKey, player]);

  const shown = useCallback(() => {
    if (open) markBetaSeen(open);
  }, [open]);

  const close = useCallback(() => setOpen(null), []);

  return { open: open !== null, shown, close };
}
