import { useEffect, useState } from 'react';
import { EventBus, GameEvents, type BossInfo, type OverloadInfo, type RoundInfo } from '../game/EventBus';
import { BossBar } from './BossBar';
import { OverloadBar } from './OverloadBar';
import { bossName, outbreakBoss } from './outbreakName';
import { useText } from './useText';

interface RoundHudProps {
  round: RoundInfo;
  /** Barra del jefe (T-008), mientras dura su combate. */
  boss: BossInfo | null;
  /** Barra de sobrecarga (T-042), en el brote que la tiene. */
  overload: OverloadInfo | null;
}

/**
 * Ronda en curso (T-007): "Ronda N de 10" con una semillita por ronda (las superadas, verdes; la actual late; la del
 * jefe, una pantallita). En la ronda del jefe (T-008) dice su numero como las demas, sin aviso aparte, y, cuando sale el
 * jefe, muestra su barra de vida. En el brote 4 (T-042), debajo de la ronda, la barra de sobrecarga.
 * En la preparacion, la cuenta atras y el boton para adelantar el ataque. Al empezar cada ronda sale debajo su aviso de
 * una linea, que se va solo. React solo pinta y avisa a Phaser por EventBus: la ronda vive en core.
 */
export function RoundHud({ round, boss, overload }: RoundHudProps) {
  const { number, total, bossRound, phase, prepSeconds, notice } = round;
  const isBoss = number === bossRound;
  const t = useText();
  const seedState = (i: number) =>
    [i + 1 === bossRound ? 'is-boss' : '', i + 1 < number || phase === 'won' ? 'is-done' : i + 1 === number ? 'is-current' : '']
      .filter(Boolean)
      .join(' ');

  return (
    <section className={`round-info is-boss-${outbreakBoss(round.outbreak)}`} aria-label={t.round.label}>
      <div className="round-badge">
        <span className="round-title">
          {t.round.word}{' '}
          <strong key={number} className="round-number">
            {number}
          </strong>{' '}
          {t.round.of} {total}
        </span>
        <span className="round-progress" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`round-seed ${seedState(i)}`} />
          ))}
        </span>
      </div>
      {phase === 'prep' && prepSeconds !== null && (
        <div className="round-prep">
          <span className={`round-countdown${prepSeconds <= 3 ? ' is-soon' : ''}`}>
            {isBoss ? t.round.bossIn(bossName(t, round.outbreak)) : t.round.startsIn}{' '}
            <strong key={prepSeconds} className="round-seconds">
              {prepSeconds}
            </strong>{' '}
            {t.round.seconds}
          </span>
          <button type="button" className="round-go" data-tour="round-go" data-silent onClick={() => EventBus.emit(GameEvents.attackRequested)}>
            {isBoss ? t.round.goBoss : t.round.go}
          </button>
        </div>
      )}
      {overload && <OverloadBar overload={overload} round={number} />}
      {boss && <BossBar boss={boss} />}
      {/* La clave cambia con la ronda: el aviso vuelve a salir. */}
      <RoundNotice key={number} text={notice} />
    </section>
  );
}

/** Lo que dura el aviso en pantalla: lo mismo que su animacion CSS (`notice-life`). */
const NOTICE_MS = 7000;

/**
 * Aviso de una linea con el concepto nuevo: entra con un salto, se queda unos segundos y se va. Lo lleva la animacion
 * CSS, que se congela con la pausa; sin animaciones (`prefers-reduced-motion`), un temporizador lo quita.
 */
function RoundNotice({ text }: { text: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setShown(false), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return (
    <p className="round-notice" role="status" onAnimationEnd={(event) => event.animationName === 'notice-life' && setShown(false)}>
      <span className="round-notice-spark" aria-hidden="true" />
      {text}
    </p>
  );
}
