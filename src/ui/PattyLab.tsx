import { useState, type CSSProperties } from 'react';
import { shopCue } from '../game/audio/cues';
import { sfx } from '../game/audio/sfx';
import { BASE_LEVEL, POWER_LEVELS, POWERS } from '../game/config/balance';
import { baseLevelBlocker, nextBaseStep } from '../game/core/baseLevel';
import { isMilestoneLevel, levelBonus, levelStepBonus } from '../game/core/plants';
import { POWER_IDS, grenadeAt, iceWallAt, isPowerMilestone, relocateAt, type PowerId } from '../game/core/powers';
import { buyBlocker, nextPowerPrice, nextUpgrade, ownedLevel, upgradeBlocker } from '../game/core/shop';
import type { NurseryArt } from '../game/EventBus';
import type { Progress } from '../game/progress';
import { formatAmount, formatHpBonus, formatNumber, formatPercent, type Dictionary } from '../i18n';
import { PowerIcon } from './PowerPanel';
import { SeedIcon } from './SeedIcon';
import { useLanguage, useText } from './useText';

/** Lo que hace el invento `id` en el nivel `level`, en una linea, con los numeros de sus reglas (T-022). */
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

/**
 * Los niveles en hojitas: las ganadas, verdes; las que faltan, en sombra; las de premio, mas grandes. Por defecto, los de
 * un invento (del 1 al 10, con premio en el 5 y el 10); el nivel base de la disparadora (T-023) pasa los suyos.
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

/** Lo ultimo que salio bien, para celebrarlo sobre su tarro o su lata: la clave cambia en cada compra y la animacion vuelve a empezar. */
interface Cheer {
  readonly id: PowerId | 'plant';
  readonly text: string;
  readonly key: number;
}

interface PattyLabProps {
  progress: Progress;
  /** La disparadora de cada nivel base, recortada por la escena (React no la pinta). Null hasta que llega. */
  art: NurseryArt | null;
  /** Fabrica el invento; true si se pudo (con las semillas que hay y sin tenerlo). */
  onBuy: (id: PowerId) => boolean;
  /** Mejora el invento un nivel; true si se pudo. */
  onUpgrade: (id: PowerId) => boolean;
  /** Sube un paso el nivel base de la disparadora; true si se pudo. */
  onBuyBaseLevel: () => boolean;
}

/**
 * Laboratorio de Patty (T-036, antes la tienda de T-022 y las plantas de T-023): siempre abierto en el Invernadero, a la
 * izquierda del menu. Es la despensa del refugio: tablas oscuras con chapas en las esquinas y el nombre pintado a
 * plantilla. Arriba, los tres inventos, cada uno en un tarro con tapa de corcho donde brilla como una luciernaga, sobre
 * una balda, con su etiqueta de papel de estraza atada con cordel (nombre, niveles en hojitas, que hace, lo que hace en su
 * nivel y en el siguiente, y "Fabricar" o "Mejorar" con su precio). Abajo, el vivero: la disparadora en su lata bajo una
 * luz calida, con su nivel base. Sin semillas el boton se ve gris piedra y el precio en rojo. Al fabricar o mejorar
 * suena lo suyo (`shopCue`) y salta "¡Listo!" o "¡Nivel 3!" sobre el tarro. Las reglas son de `core/shop.ts` y
 * `core/baseLevel.ts`; lo guarda el progreso.
 */
export function PattyLab({ progress, art, onBuy, onUpgrade, onBuyBaseLevel }: PattyLabProps) {
  const t = useText();
  const [cheer, setCheer] = useState<Cheer | null>(null);

  const actPower = (id: PowerId) => {
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

  const actPlant = () => {
    const next = nextBaseStep(progress);
    if (!next || baseLevelBlocker(progress) !== null || !onBuyBaseLevel()) return;
    sfx.play(shopCue({ type: 'baseLevel', level: next.level }).id);
    setCheer({ id: 'plant', text: t.plantShop.upgraded(next.level), key: Date.now() });
  };

  return (
    <div className="plab-area">
      <section className="plab" aria-label={t.shop.title}>
        <h2 className="plab-title">{t.shop.title}</h2>
        <p className="plab-hint">{t.shop.hint(POWERS.maxCarried)}</p>
        <h3 className="plab-group">{t.hud.powers.label}</h3>
        <ul className="plab-shelf">
          {POWER_IDS.map((id, i) => (
            <PowerOffer key={id} id={id} index={i} progress={progress} cheer={cheer?.id === id ? cheer : null} onAct={() => actPower(id)} />
          ))}
        </ul>
        <h3 className="plab-group">{t.plantShop.title}</h3>
        <PlantOffer progress={progress} art={art} cheer={cheer?.id === 'plant' ? cheer : null} onAct={actPlant} />
      </section>
    </div>
  );
}

function BuyButton({
  name,
  action,
  price,
  blocker,
  maxedText,
  onClick,
}: {
  name: string;
  action: string;
  price: number | null;
  blocker: string | null;
  maxedText: string;
  onClick: () => void;
}) {
  const t = useText();
  const language = useLanguage();
  const short = blocker === 'seeds';
  const maxed = blocker === 'max-level';
  const priceText = price === null ? '' : formatAmount(price, language);
  const label = maxed
    ? `${name}: ${maxedText}`
    : `${action} ${name}: ${price === null ? '' : t.shop.price(priceText, price)}${short ? ` (${t.shop.noSeeds})` : ''}`;
  return (
    <button
      type="button"
      className={`btn btn-primary shop-buy${blocker ? ' is-off' : ''}`}
      aria-disabled={blocker !== null}
      aria-label={label}
      title={short ? t.shop.noSeeds : undefined}
      // Fabricar y mejorar suenan con lo suyo (`shopCue`); lo que no se puede, callado.
      data-silent
      onClick={onClick}
    >
      {maxed ? (
        <span>{maxedText}</span>
      ) : (
        <>
          <span className="shop-buy-action">{action}</span>
          <span className={`shop-price${short ? ' is-short' : ''}`} aria-hidden="true">
            <SeedIcon /> {priceText}
          </span>
        </>
      )}
    </button>
  );
}

function CheerText({ cheer }: { cheer: Cheer | null }) {
  return cheer ? (
    <span key={cheer.key} className="shop-cheer" aria-live="polite">
      {cheer.text}
    </span>
  ) : null;
}

interface PowerOfferProps {
  id: PowerId;
  index: number;
  progress: Progress;
  cheer: Cheer | null;
  onAct: () => void;
}

/** Un invento: su tarro en la balda y su etiqueta con el boton. */
function PowerOffer({ id, index, progress, cheer, onAct }: PowerOfferProps) {
  const t = useText();
  const level = ownedLevel(progress, id);
  const owned = level !== null;
  const next = owned ? nextUpgrade(progress, id) : null;
  const price = owned ? (next?.cost ?? null) : nextPowerPrice(progress);
  const blocker = owned ? upgradeBlocker(progress, id) : buyBlocker(progress, id);
  const name = t.hud.powers.names[id];
  return (
    <li className={`plab-offer power-${id}${owned ? ' is-owned' : ''}`} style={{ '--i': index } as CSSProperties}>
      <div className="plab-art" aria-hidden="true">
        <span className="plab-jar">
          <span className="plab-jar-lid" />
          <span className="plab-jar-glass">
            <span className="plab-jar-art">
              <PowerIcon power={id} />
            </span>
          </span>
        </span>
        {owned && <span className="shop-owned">{t.shop.owned[id]}</span>}
      </div>
      <div className="plab-label">
        <h4 className="plab-name">{name}</h4>
        {owned && <LevelLeaves level={level} label={t.shop.level(level, POWER_LEVELS.max)} />}
        <p className="plab-about">{t.shop.about[id]}</p>
        <p className="plab-stats">{powerStats(t, id, level ?? 1)}</p>
        {next && (
          <p className="plab-next">
            <strong>{t.shop.next(next.level)}</strong> {powerStats(t, id, next.level)}
            {isPowerMilestone(next.level) && <span className="shop-bonus"> {t.shop.milestone}</span>}
          </p>
        )}
        <BuyButton name={name} action={owned ? t.shop.upgrade : t.shop.buy} price={price} blocker={blocker} maxedText={t.shop.maxed} onClick={onAct} />
      </div>
      <CheerText cheer={cheer} />
    </li>
  );
}

/** El vivero: la disparadora en su lata y su nivel base (T-023). */
function PlantOffer({ progress, art, cheer, onAct }: { progress: Progress; art: NurseryArt | null; cheer: Cheer | null; onAct: () => void }) {
  const t = useText();
  const level = progress.baseLevel;
  const next = nextBaseStep(progress);
  const blocker = baseLevelBlocker(progress);
  const step = next ? levelStepBonus(next.level) : null;
  const now = levelBonus(level);
  const photo = art?.[level];
  const name = t.plantShop.shooter;
  return (
    <div className={`plab-offer plab-plant${level > 1 ? ' is-owned' : ''}`}>
      <div className="plab-art" aria-hidden="true">
        <span className="plab-pot">
          <span className="plab-pot-glow" />
          {/* La clave cambia con el nivel: la disparadora nueva entra con un salto. */}
          {photo && <img key={level} className="plab-pot-plant" src={photo} alt="" width={200} height={200} draggable={false} />}
          <span className="plab-pot-tin" />
        </span>
      </div>
      <div className="plab-label">
        <div className="plab-plant-head">
          <h4 className="plab-name">{name}</h4>
          <LevelLeaves level={level} label={t.plantShop.level(level, BASE_LEVEL.max)} max={BASE_LEVEL.max} bonus={isMilestoneLevel} />
        </div>
        <p className="plab-plant-level">{t.plantShop.level(level, BASE_LEVEL.max)}</p>
        <p className="plab-about">{t.plantShop.about}</p>
        <p className="plab-stats">
          {t.plantShop.now(level)}
          {level > 1 && <span className="plab-bonus"> · {t.level.bonus(formatPercent(now.damage), formatPercent(now.fireRate), formatHpBonus(now.hp))}</span>}
        </p>
        {next && step && (
          <p className="plab-next">
            <strong>{t.shop.next(next.level)}</strong> {t.level.bonus(formatPercent(step.damage), formatPercent(step.fireRate), formatHpBonus(step.hp))}
            {isMilestoneLevel(next.level) && <span className="shop-bonus"> {t.plantShop.milestone}</span>}
          </p>
        )}
        <BuyButton name={name} action={t.shop.upgrade} price={next?.cost ?? null} blocker={blocker} maxedText={t.plantShop.maxed} onClick={onAct} />
      </div>
      <CheerText cheer={cheer} />
    </div>
  );
}
