import { useEffect, useId, useRef, useState } from 'react';
import { shopCue } from '../game/audio/cues';
import { sfx } from '../game/audio/sfx';
import { BASE_LEVEL } from '../game/config/balance';
import { baseLevelBlocker, nextBaseStep } from '../game/core/baseLevel';
import { isMilestoneLevel, levelBonus, levelStepBonus } from '../game/core/plants';
import type { NurseryArt } from '../game/EventBus';
import type { Progress } from '../game/progress';
import { formatAmount, formatHpBonus, formatPercent } from '../i18n';
import { SeedIcon } from './SeedIcon';
import { SeedBalance } from './SeedsEarned';
import { LevelLeaves } from './Shop';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useLanguage, useText } from './useText';

interface PlantShopProps {
  progress: Progress;
  /** La disparadora de cada nivel base, compuesta por la escena (React no la pinta). Null hasta que llega. */
  art: NurseryArt | null;
  /** Sube un paso el nivel base; true si se pudo (con las semillas que hay y sin estar en el maximo). */
  onBuy: () => boolean;
  onClose: () => void;
}

/**
 * Las plantas del Invernadero (T-023): el nivel base de la disparadora, sobre el jardin desenfocado, como la tienda. La
 * tarjeta ensena la disparadora recien sembrada en su nivel base (la foto que manda la escena, con su medallita, su brote
 * del Invernadero y, en el 5, su jardincito), sus niveles en hojitas, lo que da ahora, lo que dara el siguiente paso (con
 * su premio en el 5) y el boton de mejorar con su precio. Sin semillas el boton se ve apagado y el precio en rojo; en el
 * maximo, "Maximo". Esc o la flecha vuelven al Invernadero. Las reglas son de `core/baseLevel.ts`; lo guarda el progreso.
 */
export function PlantShop({ progress, art, onBuy, onClose }: PlantShopProps) {
  const t = useText();
  const language = useLanguage();
  const titleId = useId();
  const backButton = useRef<HTMLButtonElement>(null);
  const [cheer, setCheer] = useState<{ readonly text: string; readonly key: number } | null>(null);

  useEffect(() => {
    backButton.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.repeat) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const level = progress.baseLevel;
  const next = nextBaseStep(progress);
  const blocker = baseLevelBlocker(progress);
  const short = blocker === 'seeds';
  const maxed = blocker === 'max-level';
  const now = levelBonus(level);
  const step = next ? levelStepBonus(next.level) : null;
  const priceText = next ? formatAmount(next.cost, language) : '';
  const name = t.plantShop.shooter;
  const label = maxed
    ? `${name}: ${t.plantShop.maxed}`
    : `${t.shop.upgrade} ${name}: ${next ? t.shop.price(priceText, next.cost) : ''}${short ? ` (${t.shop.noSeeds})` : ''}`;
  const photo = art?.[level];

  const act = () => {
    if (!next || blocker !== null || !onBuy()) return;
    sfx.play(shopCue({ type: 'baseLevel', level: next.level }).id);
    setCheer({ text: t.plantShop.upgraded(next.level), key: Date.now() });
  };

  return (
    <div className="route-overlay shop-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <section className="route-card shop-card plant-shop-card">
        <header className="route-head">
          <button ref={backButton} type="button" className="btn btn-ghost" aria-label={t.common.back} title={t.common.back} onClick={onClose}>
            <span aria-hidden="true">←</span>
          </button>
          <h2 id={titleId} className="pause-title is-small">
            {t.plantShop.title}
          </h2>
          <SeedBalance balance={progress.seeds} />
        </header>
        <p className="shop-hint">{t.plantShop.hint}</p>
        <article className={`shop-item plant-shop-item${level > 1 ? ' is-owned' : ''}`}>
          <div className="plant-shop-photo" aria-hidden="true">
            {/* La clave cambia con el nivel: la foto nueva entra con un salto. */}
            {photo && <img key={level} src={photo} alt="" width={200} height={200} draggable={false} />}
          </div>
          <div className="plant-shop-body">
            <h3 className="shop-name">{name}</h3>
            <LevelLeaves level={level} label={t.plantShop.level(level, BASE_LEVEL.max)} max={BASE_LEVEL.max} bonus={isMilestoneLevel} />
            <p className="plant-shop-level">{t.plantShop.level(level, BASE_LEVEL.max)}</p>
            <p className="shop-about">{t.plantShop.about}</p>
            <p className="shop-stats">
              {t.plantShop.now(level)}
              {level > 1 && <span className="plant-shop-bonus"> · {t.level.bonus(formatPercent(now.damage), formatPercent(now.fireRate), formatHpBonus(now.hp))}</span>}
            </p>
            {next && step && (
              <p className="shop-next">
                <strong>{t.shop.next(next.level)}</strong> {t.level.bonus(formatPercent(step.damage), formatPercent(step.fireRate), formatHpBonus(step.hp))}
                {isMilestoneLevel(next.level) && <span className="shop-bonus"> {t.plantShop.milestone}</span>}
              </p>
            )}
            <button
              type="button"
              className={`btn btn-primary shop-buy${blocker ? ' is-off' : ''}`}
              aria-disabled={blocker !== null}
              aria-label={label}
              title={short ? t.shop.noSeeds : undefined}
              // Mejorar suena con lo suyo (`shopCue`); lo que no se puede, callado.
              data-silent
              onClick={act}
            >
              {maxed ? (
                <span>{t.plantShop.maxed}</span>
              ) : (
                <>
                  <span>{t.shop.upgrade}</span>
                  <span className={`shop-price${short ? ' is-short' : ''}`} aria-hidden="true">
                    <SeedIcon /> {priceText}
                  </span>
                </>
              )}
            </button>
          </div>
          {cheer && (
            <span key={cheer.key} className="shop-cheer" aria-live="polite">
              {cheer.text}
            </span>
          )}
        </article>
      </section>
    </div>
  );
}
