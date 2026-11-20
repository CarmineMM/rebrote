import type { CSSProperties } from 'react';
import type { BossInfo } from '../game/EventBus';
import { useText } from './useText';

interface BossBarProps {
  boss: BossInfo;
}

/**
 * Barra del jefe (T-008): nombre, fase y vida del Creeper, con una marca en cada umbral en el que salta de carril
 * (las que ya gasto, apagadas). Lo que pierde se ve primero en claro y luego se va. En la fase 2 se pone roja y late;
 * derrotado, dice "¡Atrapado!". React solo pinta: la vida vive en core y llega por EventBus.
 */
export function BossBar({ boss }: BossBarProps) {
  const { name, hp, maxHp, enraged, jumpAt } = boss;
  const fraction = Math.max(0, Math.min(1, hp / maxHp));
  const down = hp <= 0;
  const state = down ? ' is-down' : enraged ? ' is-enraged' : '';
  const t = useText();
  const phase = down ? t.boss.caught : enraged ? t.boss.phase2 : t.boss.phase1;
  const width = { '--boss-hp': `${fraction * 100}%` } as CSSProperties;

  return (
    <div className={`boss-bar${state}`}>
      <span className="boss-face" aria-hidden="true" />
      <div className="boss-body">
        <div className="boss-label">
          <strong>{name}</strong>
          {/* La clave cambia con la fase: el rotulo salta. */}
          <span key={phase} className="boss-phase">
            {phase}
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
      </div>
    </div>
  );
}
