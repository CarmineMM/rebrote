import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { levelBonus } from '../game/core/plants';
import { EventBus, GameEvents, type PlantPanel } from '../game/EventBus';
import { formatPercent } from '../i18n';
import { useText } from './useText';

interface LevelPanelProps {
  panel: PlantPanel;
  /** El HUD de arriba: el panel no se mete debajo; si encima de la planta no cabe, va bajo sus pies. */
  avoid: RefObject<HTMLElement | null>;
}

/** Separacion con los bordes de la pantalla y con el HUD. */
const MARGIN = 8;
/** Lo que asoma la flechita que apunta a la planta. */
const ARROW = 9;

/**
 * Panel de la disparadora seleccionada (T-003): su medallita y nivel, lo que suma ese nivel, y el boton para subir
 * con su precio ("x3 = 225" si tiene varios canones). Flota junto a la planta, apuntandola con una flechita.
 * React solo pinta y avisa a Phaser por EventBus; las reglas (precio, si alcanza, el maximo) vienen de core.
 */
export function LevelPanel({ panel, avoid }: LevelPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; arrowX: number; below: boolean } | null>(null);
  const [shake, setShake] = useState(0);
  const { level, cap, capRaisedAt, cost, multiplier, affordable } = panel;
  const atMax = cost === null;
  const can = !atMax && affordable;
  const t = useText();

  // Se coloca antes de pintarse: encima de la cabeza si cabe, si no bajo los pies; siempre dentro de la pantalla.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const top = (avoid.current?.getBoundingClientRect().bottom ?? 0) + MARGIN;
    const below = panel.above.pageY - height - ARROW < top;
    const anchor = below ? panel.below : panel.above;
    const left = Math.min(Math.max(MARGIN, anchor.pageX - width / 2), window.innerWidth - width - MARGIN);
    setPlace({
      left,
      top: below ? anchor.pageY + ARROW : anchor.pageY - height - ARROW,
      arrowX: Math.min(Math.max(16, anchor.pageX - left), width - 16),
      below,
    });
  }, [panel, avoid]);

  function onLevelUp() {
    if (can) EventBus.emit(GameEvents.levelUpRequested);
    else setShake((n) => n + 1);
  }

  const now = levelBonus(level);
  const step = levelBonus(2);
  const shownCost = cost === null ? '' : multiplier > 1 ? `×${multiplier} = ${cost}` : String(cost);
  const style = {
    left: place?.left ?? 0,
    top: place?.top ?? 0,
    visibility: place ? 'visible' : 'hidden',
    '--arrow-x': `${place?.arrowX ?? 0}px`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`level-panel${place?.below ? ' is-below' : ''}`}
      style={style}
      role="group"
      aria-label={t.level.aria(level)}
    >
      <div className="level-panel-title">
        {/* La clave cambia con el nivel: la medallita y el texto vuelven a saltar. */}
        <span key={`medal-${level}`} className={`medal ${panel.medalTier === null ? 'medal-plain' : `medal-tier-${panel.medalTier}`}`} aria-hidden="true">
          {level}
        </span>
        <span key={`level-${level}`} className="level-panel-level">
          {t.level.level(level)}
          {atMax && <small> {t.level.max}</small>}
        </span>
      </div>
      <p className="level-panel-stats">
        {level > 1 ? t.level.bonus(formatPercent(now.damage), formatPercent(now.fireRate)) : t.level.base}
      </p>
      {/* En el tope de la ronda (T-009): hasta cuando. */}
      {atMax && capRaisedAt !== null && <p className="level-panel-cap">{t.level.capUntil(cap, capRaisedAt)}</p>}
      <button
        type="button"
        className={`level-up${atMax ? ' is-max' : ''}${!atMax && !affordable ? ' is-short' : ''}`}
        aria-disabled={!can}
        title={
          atMax
            ? capRaisedAt === null
              ? t.level.atMax(cap)
              : t.level.capTitle(cap, capRaisedAt)
            : affordable
              ? t.level.perLevel(formatPercent(step.damage), formatPercent(step.fireRate))
              : t.level.noFunds
        }
        onClick={onLevelUp}
      >
        {atMax ? (
          t.level.maxButton
        ) : (
          <>
            <span className="level-up-arrow" aria-hidden="true" />
            {t.level.up}
            {/* La clave cambia con el precio o al pulsar sin saldo: el precio salta (y tiembla si no alcanza). */}
            <span key={`${shownCost}:${shake}`} className="level-up-cost">
              <span className="coin coin-small" aria-hidden="true" />
              {shownCost}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
