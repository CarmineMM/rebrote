import type { GameSpeed } from '../game/core/speed';
import { formatNumber } from '../i18n';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useText } from './useText';

interface SpeedButtonProps {
  speed: GameSpeed;
  onNext: () => void;
}

/**
 * Velocidad del juego (T-048, VJ-03): un boton redondo junto a la pausa que pasa a la velocidad siguiente y ensena
 * siempre la de ahora ("×1", "×1,5", "×2"). Acelerado, se enciende para que se vea que no va a la de siempre.
 */
export function SpeedButton({ speed, onNext }: SpeedButtonProps) {
  const t = useText();
  const value = formatNumber(speed);
  return (
    <button
      type="button"
      className={`round-button speed-button${speed > 1 ? ' is-fast' : ''}`}
      aria-label={t.hud.speed(value)}
      title={t.hud.speedTitle}
      onClick={onNext}
      {...{ [NO_AUTO_FULLSCREEN]: '' }}
    >
      <span className="speed-value" aria-hidden="true">
        {t.hud.speedValue(value)}
      </span>
    </button>
  );
}
