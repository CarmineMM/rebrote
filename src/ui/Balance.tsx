import { useEffect, useRef, useState } from 'react';
import { useText } from './useText';

interface BalanceProps {
  balance: number | null;
}

type Bump = { id: number; kind: 'gain' | 'spend' };

/** Saldo del HUD. Al cambiar da un salto: dorado si sube, rojo si baja. */
export function Balance({ balance }: BalanceProps) {
  const previous = useRef<number | null>(null);
  const [bump, setBump] = useState<Bump | null>(null);
  const t = useText();

  useEffect(() => {
    const before = previous.current;
    previous.current = balance;
    if (before === null || balance === null || before === balance) return;
    setBump((last) => ({ id: (last?.id ?? 0) + 1, kind: balance > before ? 'gain' : 'spend' }));
  }, [balance]);

  return (
    <div className="hud-balance" aria-label={t.hud.coins} aria-live="polite">
      <span key={`coin-${bump?.id ?? 0}`} className={`coin ${bump?.kind === 'gain' ? 'coin-spin' : ''}`} aria-hidden="true" />
      <span key={`value-${bump?.id ?? 0}`} className={`hud-balance-value ${bump ? `bump-${bump.kind}` : ''}`}>
        {balance ?? '...'}
      </span>
    </div>
  );
}
