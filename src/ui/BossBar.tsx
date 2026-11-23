import type { CSSProperties } from 'react';
import type { BossInfo } from '../game/EventBus';
import { formatSeconds } from '../i18n';
import { useText } from './useText';

interface BossBarProps {
  boss: BossInfo;
}

/**
 * Barra del jefe (T-008): nombre, estado y vida, con su cara. La de Creeper, un monitor, con su fase y una marca en cada
 * umbral en el que salta de carril (las que ya gasto, apagadas); en la fase 2 se pone roja y late. La de Elk Cloner (T-026),
 * un disquete, con una nota por verso hasta el poema entero (L-03), que se encienden segun recita; mientras anuncia el
 * poema se pone dorada y late. La de Brain (T-039), un cerebro bajo su cupula, dice si esta oculto o descubierto (oculta, se
 * apaga en el morado de la silueta, con los ojos en verde) y marca donde entra en su fase 2. La de Morris (T-042), un ovillo de
 * gusanos, dice cada cuanto suelta uno (MR-07) o, mientras muerde algo sin pararse (MR-06), que va a media marcha. Lo que pierde se ve primero
 * en claro y luego se va; derrotado, lo dice cada uno a su manera. React solo pinta: la vida vive en core y llega por
 * EventBus.
 */
export function BossBar({ boss }: BossBarProps) {
  const { kind, name, hp, maxHp, enraged, jumpAt, poem, hidden, brood } = boss;
  const fraction = Math.max(0, Math.min(1, hp / maxHp));
  const down = hp <= 0;
  const reciting = poem?.warning ?? false;
  const veiled = !down && hidden === true;
  const chewing = !down && brood?.chewing === true;
  const state = (down ? ' is-down' : enraged ? ' is-enraged' : reciting ? ' is-reciting' : chewing ? ' is-chewing' : '') + (veiled ? ' is-hidden' : '');
  const t = useText();
  const status = down
    ? t.boss.caught[kind]
    : poem
      ? poem.warning
        ? t.boss.poemNow
        : t.boss.poemIn(poem.every - poem.sung)
      : hidden !== null
        ? hidden
          ? t.boss.hidden(enraged)
          : t.boss.revealed(enraged)
        : brood
          ? brood.chewing
            ? t.boss.chewing
            : t.boss.brood(formatSeconds(brood.everyMs))
          : enraged
          ? t.boss.phase2
          : t.boss.phase1;
  const width = { '--boss-hp': `${fraction * 100}%` } as CSSProperties;

  return (
    <div className={`boss-bar is-${kind}${state}`}>
      <span className="boss-face" aria-hidden="true" />
      <div className="boss-body">
        <div className="boss-label">
          <strong>{name}</strong>
          {/* La clave cambia con el estado: el rotulo salta. */}
          <span key={status} className="boss-phase">
            {status}
          </span>
        </div>
        <div
          className="boss-track"
          style={width}
          role="progressbar"
          aria-label={t.boss.health(name)}
          aria-valuemin={0}
          aria-valuemax={maxHp}
          aria-valuenow={hp}
        >
          <span className="boss-trail" />
          <span className="boss-fill" />
          {jumpAt.map((threshold) => (
            <span
              key={threshold}
              className={`boss-tick${fraction <= threshold ? ' is-spent' : ''}`}
              style={{ left: `${threshold * 100}%` }}
            />
          ))}
        </div>
        {poem && !down && (
          <div className="boss-verses" aria-hidden="true">
            {Array.from({ length: poem.every }, (_, i) => (
              <span key={i} className={`boss-verse${poem.warning || i < poem.sung ? ' is-sung' : ''}`} />
            ))}
            <span className={`boss-verse is-poem${poem.warning ? ' is-sung' : ''}`} />
          </div>
        )}
      </div>
    </div>
  );
}
