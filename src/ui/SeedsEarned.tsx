import { heartBonusPercent } from '../game/core/seeds';
import type { SeedSummary } from '../game/EventBus';
import { formatAmount, formatPercent } from '../i18n';
import { SeedIcon } from './SeedIcon';
import { useLanguage, useText } from './useText';

interface Line {
  readonly label: string;
  readonly value: number;
}

/**
 * Lo que el jugador se lleva de la partida en semillas (T-020), en la victoria y en la derrota: lo cobrado en grande, de
 * donde sale (las rondas, el jefe y las vidas que quedan; al perder, la parte de las rondas que se cobra) y el saldo nuevo.
 */
export function SeedsEarned({ seeds }: { seeds: SeedSummary }) {
  const t = useText();
  const language = useLanguage();
  const { payout, balance } = seeds;
  const amount = (value: number) => formatAmount(value, language);
  const percent = (value: number) => formatPercent(value / 100, language);

  const lines: Line[] = [];
  if (payout.rounds > 0) lines.push({ label: t.seeds.rounds(payout.rounds), value: payout.roundSeeds });
  if (payout.won) {
    lines.push({ label: t.seeds.boss, value: payout.bossSeeds });
    if (payout.heartSeeds > 0) lines.push({ label: t.seeds.hearts(payout.hearts, percent(heartBonusPercent(payout.hearts))), value: payout.heartSeeds });
  } else if (payout.rounds > 0) {
    lines.push({ label: t.seeds.kept(percent(payout.keptPercent)), value: payout.total });
  }
  const note = !payout.won && payout.rounds === 0 ? t.seeds.none : payout.replay ? t.seeds.replay : null;

  return (
    <section className={`seeds-earned${payout.won ? ' is-won' : ''}`} aria-label={t.seeds.name}>
      <p className="seeds-earned-total">
        <SeedIcon />
        <strong>{t.seeds.earned(amount(payout.total))}</strong>
        <span>{t.seeds.unit(payout.total)}</span>
      </p>
      {lines.length > 0 && (
        <dl className="seeds-earned-lines">
          {lines.map((line) => (
            <div key={line.label} className="seeds-earned-line">
              <dt>{line.label}</dt>
              <dd>{amount(line.value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {note && <p className="seeds-earned-note">{note}</p>}
      <p className="seeds-earned-balance">
        <SeedIcon className="is-small" />
        {t.seeds.balance(amount(balance))}
      </p>
    </section>
  );
}

/** Saldo de semillas del jugador (T-020), en el Invernadero: una pastilla con el icono, la cantidad y que es. */
export function SeedBalance({ balance }: { balance: number }) {
  const t = useText();
  const language = useLanguage();
  const value = formatAmount(balance, language);
  return (
    <p className="seed-balance" aria-label={`${t.seeds.owned}: ${t.seeds.amount(value, balance)}`}>
      <SeedIcon />
      <strong aria-hidden="true">{value}</strong>
      <span aria-hidden="true">{t.seeds.owned}</span>
    </p>
  );
}
