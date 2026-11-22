import { useEffect, useRef } from 'react';
import { music } from '../game/audio/music';
import { musicFor } from '../game/audio/musicCues';
import type { MusicTrackId } from '../game/config/music';
import type { GameScreen } from '../game/createGame';
import type { RoundInfo } from '../game/EventBus';

interface MusicOptions {
  screen: GameScreen;
  round: RoundInfo | null;
  /** El juego espera (pausa, aviso, ficha) o hay una viñeta: la musica baja (U-03). */
  halted: boolean;
  /** Partida acabada, ganada o perdida. */
  over: boolean;
  /** Volumen de musica del jugador, de 0 a 100. */
  volume: number;
}

/**
 * Musica de fondo (T-015): le cuenta al motor donde esta el jugador. Que suena lo decide `musicFor`; el motor la
 * descarga, la funde con la anterior y la deja en bucle.
 */
export function useMusic({ screen, round, halted, over, volume }: MusicOptions): void {
  const current = useRef<MusicTrackId | null>(null);
  useEffect(() => music.setVolume(volume), [volume]);
  const outbreak = round?.outbreak ?? null;
  const number = round?.number ?? null;
  const bossRound = round?.bossRound ?? null;
  useEffect(() => {
    const now = outbreak !== null && number !== null ? { outbreak, number, bossRound } : null;
    const cue = musicFor({ screen, round: now, halted, over }, current.current);
    current.current = cue.track;
    music.request(cue);
  }, [screen, outbreak, number, bossRound, halted, over]);
}
