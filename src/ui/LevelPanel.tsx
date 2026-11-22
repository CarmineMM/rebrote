import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { isMilestoneLevel, levelBonus, levelStepBonus } from '../game/core/plants';
import { EventBus, GameEvents, type PlantPanel } from '../game/EventBus';
import { formatHpBonus, formatPercent } from '../i18n';
import { placeLevelPanel, type PanelPlace } from './levelPanelPlace';
import { useText } from './useText';

interface LevelPanelProps {
  panel: PlantPanel;
  /** El HUD de arriba: el panel no se mete debajo de lo que tenga encima (bandeja, ronda y su aviso, marcadores). */
  avoid: RefObject<HTMLElement | null>;
}

/**
 * Panel de la disparadora seleccionada (T-003): su medallita y nivel, lo que suma ese nivel, y el boton para subir
 * con su precio ("x3 = 225" si tiene varios canones). Flota junto a la planta, apuntandola con una flechita.
 * Si el siguiente nivel da premio (5, 10, 15 y 20), lo anuncia en dorado con lo que suma.
 * React solo pinta y avisa a Phaser por EventBus; las reglas (precio, si alcanza, el maximo) vienen de core.
 */
export function LevelPanel({ panel, avoid }: LevelPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<PanelPlace | null>(null);
  const [shake, setShake] = useState(0);
  const { level, cap, capRaisedAt, cost, multiplier, affordable } = panel;
  const atMax = cost === null;
  const can = !atMax && affordable;
  const t = useText();

  // Se coloca antes de pintarse: encima de la cabeza si cabe, si no bajo los pies, y si no a un lado de la planta;
  // siempre dentro de la pantalla y sin meterse bajo el HUD (`levelPanelPlace.ts`).
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const hud = avoid.current;
    const obstacles = hud ? [...hud.querySelectorAll(':scope > *, .round-notice')].map((node) => node.getBoundingClientRect()) : [];
    setPlace(
      placeLevelPanel(
        { width: element.offsetWidth, height: element.offsetHeight },
        panel,
        obstacles,
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [panel, avoid]);

  function onLevelUp() {
    if (can) EventBus.emit(GameEvents.levelUpRequested);
    else setShake((n) => n + 1);
  }

  const now = levelBonus(level);
  const step = levelStepBonus(level + 1);
  const milestoneNext = !atMax && isMilestoneLevel(level + 1);
  const shownCost = cost === null ? '' : multiplier > 1 ? `×${multiplier} = ${cost}` : String(cost);
  const style = {
    left: place?.left ?? 0,
    top: place?.top ?? 0,
    visibility: place ? 'visible' : 'hidden',
    '--arrow': `${place?.arrow ?? 0}px`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`level-panel is-${place?.side ?? 'above'}`}
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
        {level > 1 ? t.level.bonus(formatPercent(now.damage), formatPercent(now.fireRate), formatHpBonus(now.hp)) : t.level.base}
      </p>
      {milestoneNext && (
        <p className="level-panel-milestone">
          <span className="level-panel-milestone-title">{t.level.milestone(level + 1)}</span>
          <span>{t.level.bonus(formatPercent(step.damage), formatPercent(step.fireRate), formatHpBonus(step.hp))}</span>
        </p>
      )}
      {/* En el tope de la ronda (T-009): hasta cuando. */}
      {atMax && capRaisedAt !== null && <p className="level-panel-cap">{t.level.capUntil(cap, capRaisedAt)}</p>}
      <button
        type="button"
        className={`level-up${atMax ? ' is-max' : ''}${!atMax && !affordable ? ' is-short' : ''}`}
        data-tour="level-up"
        // Suena con la subida de nivel de la escena (T-014), no como boton de menu.
        data-silent
        aria-disabled={!can}
        title={
          atMax
            ? capRaisedAt === null
              ? t.level.atMax(cap)
              : t.level.capTitle(cap, capRaisedAt)
            : affordable
              ? t.level.nextLevel(formatPercent(step.damage), formatPercent(step.fireRate), formatHpBonus(step.hp))
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
