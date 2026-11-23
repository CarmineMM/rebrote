import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BASE_LEVEL, POWER_LEVELS, POWERS } from '../game/config/balance';
import { baseLevelBlocker, buyBaseLevel, nextBaseStep } from '../game/core/baseLevel';
import { isMilestoneLevel, levelStepBonus } from '../game/core/plants';
import { POWER_IDS, type PowerId } from '../game/core/powers';
import { currentOutbreak } from '../game/core/route';
import { buyBlocker, buyPower, nextPowerPrice, nextUpgrade, ownedLevel, upgradeBlocker, upgradePower } from '../game/core/shop';
import { emptyProgress, type Progress } from '../game/progress';
import { CAST } from '../game/view/characters/cast';
import { portraitUrl } from '../game/view/characters/portraitImage';
import { SHOOTER } from '../game/view/shooterShape';
import { formatAmount, formatHpBonus, formatPercent } from '../i18n';
import { outbreakTitle } from '../ui/outbreakName';
import { PowerIcon } from '../ui/PowerPanel';
import { SeedIcon } from '../ui/SeedIcon';
import { SeedBalance } from '../ui/SeedsEarned';
import { LevelLeaves, powerStats } from '../ui/PattyLab';
import { useLanguage, useText } from '../ui/useText';
import { LabBackdrop, RefugeBackdrop, StallBackdrop } from './greenhouseBackdrops';

/**
 * Propuestas del Invernadero (galeria `/proposals/invernadero.html`, `greenhouseLab.tsx`): tres pantallas de maqueta con la tienda
 * ya abierta (los poderes y el nivel base de la disparadora juntos), el menu a la derecha y "Volver a la portada" abajo a
 * la izquierda. Usan las reglas de verdad (precios y compras de `core/shop.ts` y `core/baseLevel.ts`, sobre un progreso
 * de prueba), los textos de `src/i18n/` que ya existen, la disparadora de su pintor y el retrato de Patty. El decorado
 * va en SVG (`greenhouseBackdrops.tsx`): en el juego lo pintaria Phaser. Solo para desarrollo: los textos nuevos de la
 * maqueta van en espanol sin `src/i18n/`.
 */

export type MockupId = 'lab' | 'refuge' | 'stall';
export const MOCKUP_IDS: readonly MockupId[] = ['lab', 'refuge', 'stall'];

/** El progreso justo al vencer el brote 1, con las semillas que se pidan. */
function afterFirstOutbreak(seeds: number): Progress {
  return {
    ...emptyProgress(),
    defeated: ['creeper'],
    story: ['opening', 'creeperDown', 'lore:creeper', 'pattyGreenhouse'],
    seeds,
  };
}

interface Cheer {
  readonly id: PowerId | 'plant';
  readonly text: string;
  readonly key: number;
}

interface MockShop {
  readonly progress: Progress;
  readonly cheer: Cheer | null;
  actPower(id: PowerId): void;
  actPlant(): void;
}

/** La tienda de la maqueta: compra y mejora de verdad, sobre un progreso que solo vive en la pagina. */
function useMockShop(seeds: number): MockShop {
  const t = useText();
  const [progress, setProgress] = useState(() => afterFirstOutbreak(seeds));
  const [cheer, setCheer] = useState<Cheer | null>(null);
  useEffect(() => setProgress((p) => ({ ...p, seeds })), [seeds]);
  return {
    progress,
    cheer,
    actPower(id) {
      const level = ownedLevel(progress, id);
      if (level === null) {
        if (buyBlocker(progress, id) !== null) return;
        setProgress(buyPower(progress, id));
        setCheer({ id, text: t.shop.bought, key: Date.now() });
        return;
      }
      const next = nextUpgrade(progress, id);
      if (!next || upgradeBlocker(progress, id) !== null) return;
      setProgress(upgradePower(progress, id));
      setCheer({ id, text: t.shop.upgraded(next.level), key: Date.now() });
    },
    actPlant() {
      const next = nextBaseStep(progress);
      if (!next || baseLevelBlocker(progress) !== null) return;
      setProgress(buyBaseLevel(progress));
      setCheer({
        id: 'plant',
        text: t.plantShop.upgraded(next.level),
        key: Date.now(),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Piezas comunes

/** La disparadora de nivel 1, pintada por su propio pintor en un lienzo (como el icono del juego). */
function ShooterArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { width, height } = SHOOTER.size;
    const k = 3;
    canvas.width = width * k;
    canvas.height = height * k;
    ctx.scale(k, k);
    SHOOTER.paint(ctx, 1, 'normal');
  }, []);
  return <canvas ref={ref} className="gh-shooter" aria-hidden="true" />;
}

/** El busto de Patty de las viñetas, contenta, que respira y parpadea. */
function PattyBust({ className = '' }: { className?: string }) {
  const frames = useMemo(
    () => ({
      open: portraitUrl(CAST.patty, {
        expression: 'happy',
        blink: false,
        open: false,
      }),
      shut: portraitUrl(CAST.patty, {
        expression: 'happy',
        blink: true,
        open: false,
      }),
    }),
    [],
  );
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let reopen = 0;
    const timer = window.setInterval(() => {
      setBlink(true);
      reopen = window.setTimeout(() => setBlink(false), 150);
    }, 3400);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(reopen);
    };
  }, []);
  return (
    <div className={`gh-patty ${className}`} aria-hidden="true">
      <img src={blink ? frames.shut : frames.open} alt="" draggable={false} />
    </div>
  );
}

/** "INVERNADERO" con las letras del titulo de la portada, mas pequeno. */
function Logo({ word }: { word: string }) {
  return (
    <h1 className="gh-logo" aria-label={word}>
      {[...word].map((letter, i) => (
        <span key={i} className="title-letter" style={{ animationDelay: `${i * 0.05}s, ${0.8 + i * 0.12}s` }} aria-hidden="true">
          {letter}
        </span>
      ))}
    </h1>
  );
}

/** El menu de la derecha: semillas, siguiente brote, ruta e historia. La tienda ya no va aqui: esta abierta en la escena. */
function Menu({ progress, className = '' }: { progress: Progress; className?: string }) {
  const t = useText();
  const next = currentOutbreak(progress.defeated);
  return (
    <nav className={`gh-menu pause-card ${className}`}>
      <SeedBalance balance={progress.seeds} />
      <div className="pause-actions title-actions">
        <button type="button" className="btn btn-primary has-detail">
          <span className="btn-line">
            <span aria-hidden="true">❀</span> {t.greenhouse.next}
          </span>
          {next && <small className="btn-detail">{outbreakTitle(t, next)}</small>}
        </button>
        <button type="button" className="btn has-detail">
          <span className="btn-line">
            <span aria-hidden="true">⚑</span> {t.greenhouse.route}
          </span>
          <small className="btn-detail">{t.greenhouse.routeDetail(progress.defeated.length)}</small>
        </button>
        <button type="button" className="btn">
          <span aria-hidden="true">✎</span> {t.story.replay}
        </button>
      </div>
    </nav>
  );
}

function HomeButton({ className = '' }: { className?: string }) {
  const t = useText();
  return (
    <button type="button" className={`btn gh-home ${className}`}>
      <span aria-hidden="true">⌂</span> <span className="gh-home-text">{t.greenhouse.back}</span>
    </button>
  );
}

function BuyButton({
  action,
  price,
  short,
  maxed,
  maxedText,
  onClick,
}: {
  action: string;
  price: number | null;
  short: boolean;
  maxed: boolean;
  maxedText: string;
  onClick: () => void;
}) {
  const language = useLanguage();
  return (
    <button type="button" className={`btn btn-primary shop-buy${short || maxed ? ' is-off' : ''}`} aria-disabled={short || maxed} onClick={onClick}>
      {maxed ? (
        <span>{maxedText}</span>
      ) : (
        <>
          <span>{action}</span>
          <span className={`shop-price${short ? ' is-short' : ''}`}>
            <SeedIcon /> {price === null ? '' : formatAmount(price, language)}
          </span>
        </>
      )}
    </button>
  );
}

type Frame = (art: ReactNode, index: number) => ReactNode;

function CheerText({ cheer }: { cheer: Cheer | null }) {
  return cheer ? (
    <span key={cheer.key} className="shop-cheer" aria-live="polite">
      {cheer.text}
    </span>
  ) : null;
}

/** Un poder a la venta: su dibujo dentro del marco de la propuesta (campana, tarro, caja) y su etiqueta con el boton. */
function PowerOffer({ id, index, shop, frame }: { id: PowerId; index: number; shop: MockShop; frame: Frame }) {
  const t = useText();
  const { progress } = shop;
  const level = ownedLevel(progress, id);
  const owned = level !== null;
  const next = owned ? nextUpgrade(progress, id) : null;
  const price = owned ? (next?.cost ?? null) : nextPowerPrice(progress);
  const blocker = owned ? upgradeBlocker(progress, id) : buyBlocker(progress, id);
  return (
    <li className={`gh-offer power-${id}${owned ? ' is-owned' : ''}`} style={{ '--i': index } as CSSProperties}>
      <div className="gh-offer-art" aria-hidden="true">
        {frame(<PowerIcon power={id} />, index)}
        {owned && <span className="shop-owned">{t.shop.owned[id]}</span>}
      </div>
      <div className="gh-offer-label">
        <h3 className="gh-offer-name">{t.hud.powers.names[id]}</h3>
        {owned && <LevelLeaves level={level} label={t.shop.level(level, POWER_LEVELS.max)} />}
        <p className="gh-offer-about">{t.shop.about[id]}</p>
        <p className="gh-offer-stats">{powerStats(t, id, level ?? 1)}</p>
        <BuyButton
          action={owned ? t.shop.upgrade : t.shop.buy}
          price={price}
          short={blocker === 'seeds'}
          maxed={blocker === 'max-level'}
          maxedText={t.shop.maxed}
          onClick={() => shop.actPower(id)}
        />
      </div>
      <CheerText cheer={shop.cheer?.id === id ? shop.cheer : null} />
    </li>
  );
}

/** La disparadora y su nivel base (lo que hoy es "Plantas"), en la misma tienda. */
function PlantOffer({ shop, frame }: { shop: MockShop; frame: Frame }) {
  const t = useText();
  const { progress } = shop;
  const level = progress.baseLevel;
  const next = nextBaseStep(progress);
  const blocker = baseLevelBlocker(progress);
  const step = next ? levelStepBonus(next.level) : null;
  return (
    <div className={`gh-offer gh-plant${level > 1 ? ' is-owned' : ''}`}>
      <div className="gh-offer-art" aria-hidden="true">
        {frame(<ShooterArt />, 3)}
      </div>
      <div className="gh-offer-label">
        <div className="gh-plant-head">
          <h3 className="gh-offer-name">{t.plantShop.shooter}</h3>
          <LevelLeaves level={level} label={t.plantShop.level(level, BASE_LEVEL.max)} max={BASE_LEVEL.max} bonus={isMilestoneLevel} />
        </div>
        <p className="gh-plant-level">{t.plantShop.level(level, BASE_LEVEL.max)}</p>
        <p className="gh-offer-about">{t.plantShop.about}</p>
        <p className="gh-offer-stats">{t.plantShop.now(level)}</p>
        {next && step && (
          <p className="gh-offer-next">
            <strong>{t.shop.next(next.level)}</strong> {t.level.bonus(formatPercent(step.damage), formatPercent(step.fireRate), formatHpBonus(step.hp))}
          </p>
        )}
        <BuyButton
          action={t.shop.upgrade}
          price={next?.cost ?? null}
          short={blocker === 'seeds'}
          maxed={blocker === 'max-level'}
          maxedText={t.plantShop.maxed}
          onClick={shop.actPlant}
        />
      </div>
      <CheerText cheer={shop.cheer?.id === 'plant' ? shop.cheer : null} />
    </div>
  );
}

/** Los tres poderes y la disparadora, con un rotulo por grupo. Cada propuesta lo viste con su marco y su CSS. */
function ShopBody({ shop, powerFrame, plantFrame, children }: { shop: MockShop; powerFrame: Frame; plantFrame: Frame; children?: ReactNode }) {
  const t = useText();
  return (
    <>
      {children}
      <p className="gh-shop-hint">{t.shop.hint(POWERS.maxCarried)}</p>
      <h2 className="gh-group">{t.hud.powers.label}</h2>
      <ul className="gh-powers">
        {POWER_IDS.map((id, i) => (
          <PowerOffer key={id} id={id} index={i} shop={shop} frame={powerFrame} />
        ))}
      </ul>
      <h2 className="gh-group">{t.plantShop.title}</h2>
      <PlantOffer shop={shop} frame={plantFrame} />
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. Laboratorio de Patty: de dia, dentro del invernadero de cristal. La tienda es una vitrina de madera.

function LabScreen({ seeds }: { seeds: number }) {
  const t = useText();
  const shop = useMockShop(seeds);
  const cloche: Frame = (art) => (
    <span className="lab-cloche">
      <span className="lab-cloche-art">{art}</span>
      <span className="lab-cloche-glass" />
      <span className="lab-cloche-base" />
    </span>
  );
  const pot: Frame = (art) => (
    <span className="lab-pot">
      <span className="lab-lamp" />
      <span className="lab-pot-plant">{art}</span>
      <span className="lab-pot-clay" />
    </span>
  );
  return (
    <div className="gh-screen gh-lab">
      <LabBackdrop />
      <Logo word={t.greenhouse.title.toUpperCase()} />
      <div className="gh-shop-area">
        <section className="gh-shop" aria-label={t.shop.title}>
          <ShopBody shop={shop} powerFrame={cloche} plantFrame={pot}>
            <div className="lab-crown" aria-hidden="true">
              <span className="lab-plaque">{t.shop.title}</span>
            </div>
          </ShopBody>
        </section>
      </div>
      <PattyBust />
      <Menu progress={shop.progress} />
      <HomeButton />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Refugio en la noche: el invernadero atrincherado. Fuera, la corrupcion; dentro, luz calida. La tienda es la despensa.

function RefugeScreen({ seeds }: { seeds: number }) {
  const t = useText();
  const shop = useMockShop(seeds);
  const jar: Frame = (art) => (
    <span className="ref-jar">
      <span className="ref-jar-lid" />
      <span className="ref-jar-glass">
        <span className="ref-jar-art">{art}</span>
      </span>
    </span>
  );
  const pot: Frame = (art) => (
    <span className="ref-pot">
      <span className="ref-pot-glow" />
      <span className="ref-pot-plant">{art}</span>
      <span className="ref-pot-tin" />
    </span>
  );
  return (
    <div className="gh-screen gh-refuge">
      <RefugeBackdrop />
      <Logo word={t.greenhouse.title.toUpperCase()} />
      <div className="gh-shop-area">
        <section className="gh-shop" aria-label={t.shop.title}>
          <ShopBody shop={shop} powerFrame={jar} plantFrame={pot}>
            <span className="ref-stencil" aria-hidden="true">
              {t.shop.title}
            </span>
          </ShopBody>
        </section>
      </div>
      <PattyBust />
      <Menu progress={shop.progress} className="ref-menu" />
      <HomeButton />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Puesto en la azotea: al atardecer, el puesto de Patty con su toldo, cajas de madera y pizarras.

function StallScreen({ seeds }: { seeds: number }) {
  const t = useText();
  const shop = useMockShop(seeds);
  const crate: Frame = (art) => (
    <span className="st-crate">
      <span className="st-crate-art">{art}</span>
      <span className="st-crate-box" />
    </span>
  );
  const pot: Frame = (art) => (
    <span className="st-pot">
      <span className="st-pot-plant">{art}</span>
      <span className="st-pot-clay" />
    </span>
  );
  return (
    <div className="gh-screen gh-stall">
      <StallBackdrop />
      <Logo word={t.greenhouse.title.toUpperCase()} />
      <div className="gh-shop-area">
        <section className="gh-shop" aria-label={t.shop.title}>
          <ShopBody shop={shop} powerFrame={crate} plantFrame={pot}>
            <div className="st-awning" aria-hidden="true">
              <span className="st-sign">{t.shop.title}</span>
            </div>
          </ShopBody>
        </section>
      </div>
      <PattyBust className="st-patty" />
      <Menu progress={shop.progress} className="st-menu" />
      <HomeButton />
    </div>
  );
}

export function Mockup({ id, seeds }: { id: MockupId; seeds: number }) {
  if (id === 'refuge') return <RefugeScreen seeds={seeds} />;
  if (id === 'stall') return <StallScreen seeds={seeds} />;
  return <LabScreen seeds={seeds} />;
}
