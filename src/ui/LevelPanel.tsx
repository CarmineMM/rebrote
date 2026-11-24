import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { isMilestoneLevel, levelBonus, levelStepBonus } from '../game/core/plants';
import { EventBus, GameEvents, type LevelUpPanel, type PlantPanel } from '../game/EventBus';
import { formatHpBonus, formatPercent } from '../i18n';
import { CardIcon } from './Card';
import { placeLevelPanel, type PanelPlace } from './levelPanelPlace';
import { useText } from './useText';

interface LevelPanelProps {
  panel: PlantPanel;
  /** El HUD de arriba: el panel no se mete debajo de lo que tenga encima (bandeja, ronda y su aviso, marcadores). */
  avoid: RefObject<HTMLElement | null>;
}

/**
 * Arrancar pide un segundo toque (T-046, AR-07). Antes de esto, el segundo no cuenta: un doble toque sin querer no arranca.
 * Pasado `UPROOT_ARMED_MS` sin confirmar, el boton vuelve a pedir el primero.
 */
const UPROOT_GUARD_MS = 350;
const UPROOT_ARMED_MS = 4000;

/**
 * Panel de la disparadora seleccionada (T-003): su medallita y nivel, lo que suma ese nivel, y el boton para subir
 * con su precio ("x3 = 225" si tiene varios canones). Flota junto a la planta, apuntandola con una flechita.
 * Si el siguiente nivel da premio (5, 10, 15 y 20), lo anuncia en dorado con lo que suma.
 *
 * Desde la ronda que lo desbloquea (T-046), debajo va "Arrancar" con lo que devuelve; el primer toque pregunta
 * ("¿Arrancar? +75") y el segundo arranca. Un muro, o una disparadora en una partida que aun no deja subir de nivel (AR-08
 * y AR-10), abren el panel solo con "Arrancar".
 *
 * React solo pinta y avisa a Phaser por EventBus; las reglas (precio, si alcanza, el maximo, lo que devuelve) vienen de core.
 */
export function LevelPanel({ panel, avoid }: LevelPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<PanelPlace | null>(null);
  const [armedAt, setArmedAt] = useState<number | null>(null);
  const { level, levelUp, uproot } = panel;
  const armed = armedAt !== null && uproot !== null;
  const t = useText();

  // Se coloca antes de pintarse: encima de la cabeza si cabe, si no bajo los pies, y si no a un lado de la planta;
  // siempre dentro de la pantalla y sin meterse bajo el HUD (`levelPanelPlace.ts`). Preguntar por arrancar no lo mueve:
  // el boton guarda el ancho de la pregunta, asi el segundo toque cae donde el primero.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const hud = avoid.current;
    // Las piezas de la ronda van sueltas en el movil (`.round-info` con `display: contents`, sin caja propia): se miden una a una.
    const obstacles = hud
      ? [...hud.querySelectorAll(':scope > *, .round-info > *')].map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0)
      : [];
    setPlace(
      placeLevelPanel(
        { width: element.offsetWidth, height: element.offsetHeight },
        panel,
        obstacles,
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [panel, avoid]);

  // Sin confirmar a tiempo, vuelve a pedir el primer toque.
  useEffect(() => {
    if (armedAt === null) return;
    const timer = window.setTimeout(() => setArmedAt(null), UPROOT_ARMED_MS);
    return () => window.clearTimeout(timer);
  }, [armedAt]);

  function onUproot() {
    if (uproot === null) return;
    const now = performance.now();
    if (armedAt === null) setArmedAt(now);
    else if (now - armedAt >= UPROOT_GUARD_MS) EventBus.emit(GameEvents.uprootRequested);
  }

  const style = {
    left: place?.left ?? 0,
    top: place?.top ?? 0,
    visibility: place ? 'visible' : 'hidden',
    '--arrow': `${place?.arrow ?? 0}px`,
  } as CSSProperties;
  const wall = panel.subject === 'wall';

  return (
    <div
      ref={ref}
      className={`level-panel is-${place?.side ?? 'above'}${levelUp ? '' : ' is-uproot-only'}`}
      style={style}
      role="group"
      aria-label={wall ? t.level.wallAria : t.level.aria(level)}
    >
      <div className="level-panel-title">
        {wall ? (
          <>
            <CardIcon card="shield" />
            <span>{t.level.wall}</span>
          </>
        ) : (
          <>
            {/* La clave cambia con el nivel: la medallita y el texto vuelven a saltar. */}
            <span key={`medal-${level}`} className={`medal ${panel.medalTier === null ? 'medal-plain' : `medal-tier-${panel.medalTier}`}`} aria-hidden="true">
              {level}
            </span>
            <span key={`level-${level}`} className="level-panel-level">
              {t.level.level(level)}
              {levelUp?.cost === null && <small> {t.level.max}</small>}
            </span>
          </>
        )}
      </div>
      {levelUp && <LevelUpPart level={level} levelUp={levelUp} />}
      {uproot !== null && (
        <button
          type="button"
          className={`uproot${armed ? ' is-armed' : ''}`}
          data-tour="uproot"
          // El primer toque suena como un boton; el que arranca, con la escena (T-046).
          data-silent={armed ? '' : undefined}
          aria-pressed={armed}
          aria-label={`${armed ? t.level.uprootConfirm : t.level.uproot} +${uproot}`}
          title={armed ? t.level.uprootAgain : t.level.uprootTitle(uproot)}
          onClick={onUproot}
        >
          <UprootIcon />
          {/* Las dos etiquetas ocupan el mismo hueco: el boton mide siempre lo de la mas larga. */}
          <span className="uproot-label" aria-hidden="true">
            <span className="uproot-label-idle">{t.level.uproot}</span>
            <span className="uproot-label-ask">{t.level.uprootConfirm}</span>
          </span>
          <span key={`refund-${uproot}`} className="uproot-refund">
            <span className="coin coin-small" aria-hidden="true" />+{uproot}
          </span>
        </button>
      )}
    </div>
  );
}

/** Lo de subir de nivel (T-003): lo que suma el nivel, el premio del siguiente, el tope y el boton "Subir". */
function LevelUpPart({ level, levelUp }: { level: number; levelUp: LevelUpPanel }) {
  const [shake, setShake] = useState(0);
  const { cap, capRaisedAt, cost, multiplier, affordable } = levelUp;
  const atMax = cost === null;
  const can = !atMax && affordable;
  const t = useText();

  function onLevelUp() {
    if (can) EventBus.emit(GameEvents.levelUpRequested);
    else setShake((n) => n + 1);
  }

  const now = levelBonus(level);
  const step = levelStepBonus(level + 1);
  const milestoneNext = !atMax && isMilestoneLevel(level + 1);
  const shownCost = cost === null ? '' : multiplier > 1 ? `×${multiplier} = ${cost}` : String(cost);

  return (
    <>
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
    </>
  );
}

/** Dibujo del boton de arrancar (T-046): un brote con sus raices que sale de la tierra hacia arriba. */
function UprootIcon() {
  return (
    <svg className="uproot-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path className="uproot-icon-soil" d="M2 19.5c3-1.6 6.5-2.2 10-2.2s7 .6 10 2.2v1.2H2z" />
      <g className="uproot-icon-sprout">
        <path className="uproot-icon-root" d="M12 15.5v-2.2M12 15.5l-2.2 2M12 15.5l2.3 1.8" />
        <path className="uproot-icon-stem" d="M12 13.4V7.2" />
        <path className="uproot-icon-leaf" d="M12 8.6C9.6 8.8 7.6 7.4 7 5c2.5-.3 4.5 1 5 3.6z" />
        <path className="uproot-icon-leaf" d="M12 7.4c.4-2.6 2.4-4 5-3.8-.5 2.4-2.6 3.9-5 3.8z" />
      </g>
      <path className="uproot-icon-arrow" d="M19 14.5V8.5M16.8 10.6 19 8.4l2.2 2.2" />
    </svg>
  );
}
