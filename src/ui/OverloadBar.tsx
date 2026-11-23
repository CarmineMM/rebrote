import { useEffect, useState, type CSSProperties } from 'react';
import type { OverloadInfo } from '../game/EventBus';
import { formatPercent } from '../i18n';
import { useText } from './useText';

interface OverloadBarProps {
  overload: OverloadInfo;
  /** Ronda en curso, desde 1: en la primera del brote, la barra lleva debajo su linea de ayuda. */
  round: number;
}

/**
 * Barra de sobrecarga (T-042), el rasgo del brote 4: un medidor de memoria de maquina vieja que se llena con los enemigos
 * vivos en el cesped. Verde, ambar y rojo segun se llena, con una marca donde se apaga (MR-04: al 60 %). Llena, se enciende:
 * dice "¡Sobrecarga!", se pone roja y late hasta que baja de la marca. Para que el jugador sepa que es sin leer mas de una
 * linea, la lleva debajo durante la ronda 1 (en el movil, donde taparia el carril de arriba, solo unos segundos) y unos
 * segundos la primera vez que se llena (lo lleva su animacion CSS, que se congela con la pausa). React solo pinta: lo llena que esta y si esta encendida vienen de core (`overloadFill`,
 * `MatchState.overload`) por EventBus.
 */
export function OverloadBar({ overload, round }: OverloadBarProps) {
  const { fill, active, offBelow } = overload;
  const t = useText();
  const [hinted, setHinted] = useState(false);
  const [hint, setHint] = useState(false);
  // La primera vez que se llena en esta partida, la linea de ayuda vuelve a salir un rato.
  useEffect(() => {
    if (!active || hinted) return;
    setHinted(true);
    setHint(true);
  }, [active, hinted]);
  const level = active ? 'is-on' : fill >= offBelow ? 'is-high' : fill >= offBelow / 2 ? 'is-mid' : 'is-low';
  const style = { '--overload-fill': `${Math.round(fill * 100)}%`, '--overload-off': `${offBelow * 100}%` } as CSSProperties;
  return (
    <div className={`overload-bar ${level}`} style={style}>
      <div
        className="overload-meter"
        role="meter"
        aria-label={t.hud.overload.aria(formatPercent(fill), active)}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={fill}
        title={t.hud.overload.hint}
      >
        {/* La clave cambia al encenderse: el rotulo salta. */}
        <span key={String(active)} className="overload-label">
          {active ? t.hud.overload.full : t.hud.overload.label}
        </span>
        <span className="overload-track">
          <span className="overload-fill" />
          <span className="overload-off" aria-hidden="true" />
        </span>
      </div>
      {round === 1 ? (
        <p className="overload-hint">{t.hud.overload.hint}</p>
      ) : (
        hint && (
          <p className="overload-hint is-brief" onAnimationEnd={(event) => event.animationName === 'overload-hint-life' && setHint(false)}>
            {t.hud.overload.hint}
          </p>
        )
      )}
    </div>
  );
}
