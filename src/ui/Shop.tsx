import { useEffect, useId, useRef, useState } from 'react';
import { shopCue } from '../game/audio/cues';
import { sfx } from '../game/audio/sfx';
import { POWER_LEVELS, POWERS } from '../game/config/balance';
import { POWER_IDS, grenadeAt, iceWallAt, isPowerMilestone, relocateAt, type PowerId } from '../game/core/powers';
import { buyBlocker, nextPowerPrice, nextUpgrade, ownedLevel, upgradeBlocker } from '../game/core/shop';
import type { Progress } from '../game/progress';
import { formatAmount, formatNumber, formatPercent, type Dictionary } from '../i18n';
import { PowerIcon } from './PowerPanel';
import { SeedIcon } from './SeedIcon';
import { SeedBalance } from './SeedsEarned';
import { NO_AUTO_FULLSCREEN } from './useFullscreen';
import { useLanguage, useText } from './useText';

interface ShopProps {
  progress: Progress;
  /** Compra el poder; true si se compro (con las semillas que hay y sin tenerlo). */
  onBuy: (id: PowerId) => boolean;
  /** Mejora el poder un nivel; true si se mejoro. */
  onUpgrade: (id: PowerId) => boolean;
  onClose: () => void;
}

/** Lo que hace el poder `id` en el nivel `level`, en una linea, con los numeros de sus reglas (T-022). */
export function powerStats(t: Dictionary, id: PowerId, level: number): string {
  if (id === 'grenade') {
    const { damage, radius } = grenadeAt(level);
    return t.shop.stats.grenade(damage, formatNumber(radius));
  }
  if (id === 'iceWall') {
    const { span, hp } = iceWallAt(level);
    return t.shop.stats.iceWall(span, hp);
  }
  const { charges, heal } = relocateAt(level);
  return t.shop.stats.relocate(charges, heal > 0 ? formatPercent(heal) : null);
}

/** Lo ultimo que salio bien, para celebrarlo sobre su tarjeta: la clave cambia en cada compra y la animacion vuelve a empezar. */
interface Cheer {
  readonly id: PowerId;
  readonly text: string;
  readonly key: number;
}

/**
 * Tienda (T-022): un estante con los tres poderes, sobre el jardin desenfocado, como la ruta de brotes. Cada tarjeta
 * ensena el poder (su dibujo, que se mece), su nombre, que hace, lo que hace en su nivel, sus niveles en hojitas, lo que
 * hara con la mejora y el boton de comprar o mejorar con su precio. Sin semillas suficientes el boton se ve apagado y el
 * precio en rojo; en el nivel maximo, "Nivel maximo". Arriba, las semillas del jugador. Esc o la flecha vuelven al
 * Invernadero. Las reglas (precios y lo que se puede) son de `core/shop.ts`; lo guarda el progreso.
 */
export function Shop({ progress, onBuy, onUpgrade, onClose }: ShopProps) {
  const t = useText();
  const titleId = useId();
  const backButton = useRef<HTMLButtonElement>(null);
  const [cheer, setCheer] = useState<Cheer | null>(null);

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

  const act = (id: PowerId) => {
    const level = ownedLevel(progress, id);
    if (level === null) {
      if (buyBlocker(progress, id) !== null || !onBuy(id)) return;
      sfx.play(shopCue({ type: 'buy' }).id);
      setCheer({ id, text: t.shop.bought, key: Date.now() });
      return;
    }
    const next = nextUpgrade(progress, id);
    if (!next || upgradeBlocker(progress, id) !== null || !onUpgrade(id)) return;
    sfx.play(shopCue({ type: 'upgrade', level: next.level }).id);
    setCheer({ id, text: t.shop.upgraded(next.level), key: Date.now() });
  };

  return (
    <div className="route-overlay shop-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} {...{ [NO_AUTO_FULLSCREEN]: '' }}>
      <section className="route-card shop-card">
        <header className="route-head">
          <button ref={backButton} type="button" className="btn btn-ghost" aria-label={t.common.back} title={t.common.back} onClick={onClose}>
            <span aria-hidden="true">←</span>
          </button>
          <h2 id={titleId} className="pause-title is-small">
            {t.shop.title}
          </h2>
          <SeedBalance balance={progress.seeds} />
        </header>
        <p className="shop-hint">{t.shop.hint(POWERS.maxCarried)}</p>
        <ul className="shop-shelf">
          {POWER_IDS.map((id, i) => (
            <ShopItem key={id} id={id} index={i} progress={progress} cheer={cheer?.id === id ? cheer : null} onAct={() => act(id)} />
          ))}
        </ul>
      </section>
    </div>
  );
}

interface ShopItemProps {
  id: PowerId;
  index: number;
  progress: Progress;
  cheer: Cheer | null;
  onAct: () => void;
}

function ShopItem({ id, index, progress, cheer, onAct }: ShopItemProps) {
  const t = useText();
  const language = useLanguage();
  const level = ownedLevel(progress, id);
  const owned = level !== null;
  const next = owned ? nextUpgrade(progress, id) : null;
  const price = owned ? (next?.cost ?? null) : nextPowerPrice(progress);
  const blocker = owned ? upgradeBlocker(progress, id) : buyBlocker(progress, id);
  const short = blocker === 'seeds';
  const maxed = blocker === 'max-level';
  const name = t.hud.powers.names[id];
  const action = owned ? t.shop.upgrade : t.shop.buy;
  const priceText = price === null ? '' : formatAmount(price, language);
  const label = maxed ? `${name}: ${t.shop.maxed}` : `${action} ${name}: ${price === null ? '' : t.shop.price(priceText, price)}${short ? ` (${t.shop.noSeeds})` : ''}`;

  return (
    <li className={`shop-item power-${id}${owned ? ' is-owned' : ''}`} style={{ animationDelay: `${0.08 + index * 0.08}s` }}>
      <div className="shop-art" aria-hidden="true">
        <PowerIcon power={id} />
        {owned && <span className="shop-owned">{t.shop.owned[id]}</span>}
      </div>
      <h3 className="shop-name">{name}</h3>
      {owned && <LevelLeaves level={level} label={t.shop.level(level, POWER_LEVELS.max)} />}
      <p className="shop-about">{t.shop.about[id]}</p>
      <p className="shop-stats">{powerStats(t, id, level ?? 1)}</p>
      {next && (
        <p className="shop-next">
          <strong>{t.shop.next(next.level)}</strong> {powerStats(t, id, next.level)}
          {isPowerMilestone(next.level) && <span className="shop-bonus"> {t.shop.milestone}</span>}
        </p>
      )}
      <button
        type="button"
        className={`btn btn-primary shop-buy${blocker ? ' is-off' : ''}`}
        aria-disabled={blocker !== null}
        aria-label={label}
        title={short ? t.shop.noSeeds : undefined}
        // Comprar y mejorar suenan con lo suyo (`shopCue`); lo que no se puede, callado.
        data-silent
        onClick={onAct}
      >
        {maxed ? (
          <span>{t.shop.maxed}</span>
        ) : (
          <>
            <span>{action}</span>
            <span className={`shop-price${short ? ' is-short' : ''}`} aria-hidden="true">
              <SeedIcon /> {priceText}
            </span>
          </>
        )}
      </button>
      {cheer && (
        <span key={cheer.key} className="shop-cheer" aria-live="polite">
          {cheer.text}
        </span>
      )}
    </li>
  );
}

/**
 * Los niveles en hojitas: las ganadas, verdes; las que faltan, en sombra; las de premio, mas grandes. Por defecto, los de
 * un poder (del 1 al 10, con premio en el 5 y el 10); el nivel base de la disparadora (T-023) pasa los suyos.
 */
export function LevelLeaves({
  level,
  label,
  max = POWER_LEVELS.max,
  bonus = isPowerMilestone,
}: {
  level: number;
  label: string;
  max?: number;
  bonus?: (level: number) => boolean;
}) {
  return (
    <p className="shop-level" aria-label={label} title={label}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        return <span key={n} className={`shop-leaf${n <= level ? ' is-on' : ''}${bonus(n) ? ' is-bonus' : ''}`} aria-hidden="true" />;
      })}
    </p>
  );
}
