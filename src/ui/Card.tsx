import type { PointerEvent as ReactPointerEvent } from 'react';
import { canAfford, cardCost, type CardId } from '../game/core/match';
import { EventBus, GameEvents, type PagePoint } from '../game/EventBus';

interface CardProps {
  card: CardId;
  label: string;
  balance: number | null;
  selected: boolean;
}

const toPagePoint = (event: PointerEvent): PagePoint => ({ pageX: event.pageX, pageY: event.pageY });

/**
 * Carta del HUD. Al pulsarla queda elegida; se siembra arrastrandola hasta una casilla
 * o haciendo clic despues en la casilla. React solo avisa a Phaser por EventBus.
 */
export function Card({ card, label, balance, selected }: CardProps) {
  const cost = cardCost(card);
  const disabled = balance === null || !canAfford(balance, cost);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    EventBus.emit(GameEvents.cardPicked, card);

    // Se escucha en window para seguir el arrastre aunque el puntero salga de la carta y entre en el canvas.
    const { pointerId } = event;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === pointerId) EventBus.emit(GameEvents.cardDragged, toPagePoint(e));
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      stop();
      EventBus.emit(GameEvents.cardDropped, toPagePoint(e));
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId === pointerId) stop();
    };
    function stop() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  return (
    <button
      type="button"
      className="card"
      aria-pressed={selected}
      aria-disabled={disabled}
      title={disabled ? 'Saldo insuficiente' : `Sembrar ${label.toLowerCase()}`}
      onPointerDown={onPointerDown}
    >
      <span className="card-icon" aria-hidden="true">
        <span className="card-icon-tube" />
        <span className="card-icon-head" />
      </span>
      <span className="card-label">{label}</span>
      <span className="card-cost">{cost}</span>
    </button>
  );
}
