import type { PointerEvent as ReactPointerEvent } from 'react';
import { canAfford, cardCost, type CardId } from '../game/core/match';
import { EventBus, GameEvents, type CardPreview, type PagePoint } from '../game/EventBus';

interface CardProps {
  card: CardId;
  label: string;
  balance: number | null;
  selected: boolean;
  /** Precio de infundir la planta a la que apunta la carta (D-04), o null. */
  preview?: CardPreview | null;
}

const toPagePoint = (event: PointerEvent): PagePoint => ({ pageX: event.pageX, pageY: event.pageY });

/**
 * Carta del HUD. Al pulsarla queda elegida; se juega arrastrandola hasta una casilla
 * o haciendo clic despues en la casilla. React solo avisa a Phaser por EventBus.
 * Una carta de elemento sobre una disparadora de N canones muestra lo que costaria infundirla ("x3 = 225"),
 * en rojo si no alcanza (D-04).
 */
export function Card({ card, label, balance, selected, preview = null }: CardProps) {
  const cost = cardCost(card);
  const disabled = balance === null || !canAfford(balance, cost);
  const multiplied = preview !== null && preview.multiplier > 1;
  const shownCost = multiplied ? `×${preview.multiplier} = ${preview.cost}` : String(cost);
  const short = preview !== null && !preview.affordable;

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
      className={`card card-${card}`}
      aria-pressed={selected}
      aria-disabled={disabled}
      title={disabled ? 'Saldo insuficiente' : CARD_TITLES[card]}
      onPointerDown={onPointerDown}
    >
      <CardIcon card={card} />
      <span className="card-label">{label}</span>
      {/* La clave cambia con el precio: la animacion de salto vuelve a empezar. */}
      <span key={shownCost} className={`card-cost${multiplied ? ' is-multiplied' : ''}${short ? ' is-short' : ''}`}>
        {shownCost}
      </span>
    </button>
  );
}

const CARD_TITLES: Record<CardId, string> = {
  shooter: 'Sembrar disparadora',
  fire: 'Fuego: en una casilla vacía, mina; sobre una disparadora, la infunde (un fuego por cañón)',
  ice: 'Hielo: en una casilla vacía, mina que frena; sobre una disparadora, la infunde (un hielo por cañón)',
};

/** Dibujo de la carta, en CSS: la disparadora, o una llama o un copo sobre un montoncito de tierra. */
function CardIcon({ card }: { card: CardId }) {
  if (card === 'fire') {
    return (
      <span className="card-icon" aria-hidden="true">
        <span className="card-icon-mound" />
        <span className="card-icon-flame" />
      </span>
    );
  }
  if (card === 'ice') {
    return (
      <span className="card-icon" aria-hidden="true">
        <span className="card-icon-mound" />
        <span className="card-icon-flake">
          <span />
        </span>
      </span>
    );
  }
  return (
    <span className="card-icon" aria-hidden="true">
      <span className="card-icon-tube" />
      <span className="card-icon-head" />
    </span>
  );
}
