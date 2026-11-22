import { useId, type PointerEvent as ReactPointerEvent } from 'react';
import { canAfford, cardCost, type CardId } from '../game/core/match';
import { EventBus, GameEvents, type CardPreview, type PagePoint } from '../game/EventBus';
import type { Dictionary } from '../i18n';
import { useText } from './useText';

interface CardProps {
  card: CardId;
  label: string;
  balance: number | null;
  selected: boolean;
  /** Precio de infundir la planta a la que apunta la carta (D-04), o null. */
  preview?: CardPreview | null;
  /** Si el elemento ya se puede infundir en esta ronda (T-007): el fuego se siembra solo una ronda antes. */
  canInfuse?: boolean;
}

const toPagePoint = (event: PointerEvent): PagePoint => ({ pageX: event.pageX, pageY: event.pageY });

/**
 * Carta del HUD. Al pulsarla queda elegida; se juega arrastrandola hasta una casilla
 * o haciendo clic despues en la casilla. React solo avisa a Phaser por EventBus.
 * Una carta de elemento sobre una disparadora de N canones muestra lo que costaria infundirla ("x3 = 225"),
 * en rojo si no alcanza (D-04).
 */
export function Card({ card, label, balance, selected, preview = null, canInfuse = false }: CardProps) {
  const cost = cardCost(card);
  const disabled = balance === null || !canAfford(balance, cost);
  const multiplied = preview !== null && preview.multiplier > 1;
  // Espacio duro tras el "=": si en el HUD compacto no cabe en una linea, parte en "×3" y "= 225" (T-010).
  const shownCost = multiplied ? `×${preview.multiplier} =\u00a0${preview.cost}` : String(cost);
  const short = preview !== null && !preview.affordable;
  const t = useText();

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
      title={disabled ? t.hud.noFunds : cardTitle(t, card, canInfuse)}
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

/** Lo que hace la carta. Antes de poder infundir (T-007), el elemento solo se siembra como mina. El escudo llega entero (T-024). */
function cardTitle(t: Dictionary, card: CardId, canInfuse: boolean): string {
  const help = t.hud.cardHelp;
  if (card === 'shooter') return help.shooter;
  if (card === 'shield') return help.shield;
  if (card === 'fire') return canInfuse ? help.fireInfuse : help.fire;
  return canInfuse ? help.iceInfuse : help.ice;
}

/**
 * Dibujo de la carta: la disparadora (un "Brote" en miniatura, en SVG, T-016), una llama o un copo sobre un montoncito
 * de tierra (en CSS), o un escudo de corteza con musgo (SVG, T-024). Tambien en el aviso de desbloqueo (T-009) y en los
 * dibujos de los tours (T-013).
 */
export function CardIcon({ card }: { card: CardId }) {
  if (card === 'shield') {
    return (
      <span className="card-icon" aria-hidden="true">
        <span className="card-icon-mound" />
        <ShieldIcon />
      </span>
    );
  }
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
      <ShooterIcon />
    </span>
  );
}

/**
 * Escudo en miniatura (T-024): una placa de corteza con dos filas de escamas, un gorro de musgo y una hojita, con los
 * colores del muro (`wallArt.ts`).
 */
function ShieldIcon() {
  const fill = `${useId()}-bark`;
  const outline = '#4a2c12';
  return (
    <svg className="card-icon-shield" viewBox="0 0 40 36" width="40" height="36">
      <defs>
        <radialGradient id={fill} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#f6e3bc" />
          <stop offset="0.5" stopColor="#c9945a" />
          <stop offset="1" stopColor="#8a5a2e" />
        </radialGradient>
      </defs>
      <path d="M20 5 Q28.5 6.5 31.5 9.5 Q31.5 22.5 20 31.5 Q8.5 22.5 8.5 9.5 Q11.5 6.5 20 5 Z" fill={`url(#${fill})`} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.5 14.5 Q15 17.5 20 14.5 Q25 17.5 29.5 14.5 M12.5 21 Q16.2 24 20 21 Q23.8 24 27.5 21" fill="none" stroke="rgba(255, 233, 190, 0.85)" strokeWidth="1.2" />
      <path d="M10.5 15.4 Q15 18.4 20 15.4 Q25 18.4 29.5 15.4 M12.5 21.9 Q16.2 24.9 20 21.9 Q23.8 24.9 27.5 21.9" fill="none" stroke="rgba(74, 44, 18, 0.55)" strokeWidth="1.2" />
      <path d="M9.5 9.6 Q14 5.2 20 5.4 Q26 5.2 30.5 9.6 Q25.5 11.6 20 10.6 Q14.5 11.6 9.5 9.6 Z" fill="#8fcf5a" stroke="#3f6a1e" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M20 5.6 Q17 2.2 13.6 1.6 Q15.6 5 20 5.6 Z" fill="#62c046" stroke="#3f6a1e" strokeWidth="1" strokeLinejoin="round" />
      <path d="M20 5.6 Q23.4 2 26.8 2 Q24.4 5.4 20 5.6 Z" fill="#62c046" stroke="#3f6a1e" strokeWidth="1" strokeLinejoin="round" />
      <ellipse cx="14.5" cy="13" rx="2.6" ry="1.5" fill="rgba(255, 255, 255, 0.45)" transform="rotate(-30 14.5 13)" />
    </svg>
  );
}

/**
 * "Brote" en miniatura, con los colores de su textura (`shooters/bulb.ts`): bulbo con ojo y sonrisa, hojas en la punta
 * y un brote-canon que sale del hombro y termina en un capullo abierto mirando a la derecha.
 */
function ShooterIcon() {
  const fill = `${useId()}-bulb`;
  const outline = '#2a6b22';
  return (
    <svg className="card-icon-shooter" viewBox="0 0 40 36" width="40" height="36">
      <defs>
        <radialGradient id={fill} cx="0.35" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#d0f59a" />
          <stop offset="0.45" stopColor="#80d153" />
          <stop offset="1" stopColor="#4aa236" />
        </radialGradient>
      </defs>
      {/* Brote-canon: tallito que sube del hombro y se dobla, con su capullo abierto. */}
      <path d="M20 21 Q22 9.5 30 9.5" fill="none" stroke={outline} strokeWidth="5.6" strokeLinecap="round" />
      <path d="M20 21 Q22 9.5 30 9.5" fill="none" stroke="#7fd45a" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M28 7.5 Q32.5 4.2 36.6 3.8 L36.6 15.2 Q32.5 14.8 28 11.5 Z" fill="#8fd863" stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="36.6" cy="9.5" rx="2.1" ry="5.2" fill="#6cc24a" stroke={outline} strokeWidth="1.3" />
      <ellipse cx="37.2" cy="9.5" rx="1.1" ry="3.1" fill="#1c3d15" />
      {/* Bulbo: barriga ancha, cuello que se afila y hojas en la punta. */}
      <path d="M8 31.5 Q3 26 4.5 21 Q6.5 15 13 12 Q16.5 10 17 7 Q17.6 10 21 12 Q27.5 15 29.5 21 Q31 26 26 31.5 Q17 34.5 8 31.5 Z" fill={`url(#${fill})`} stroke={outline} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M11 30 Q8.5 22 15.5 13.5 M23 30 Q25.5 22 18.5 13.5" fill="none" stroke="rgba(42, 107, 34, 0.32)" strokeWidth="1" />
      <path d="M17 7.5 Q12.5 5.5 11.5 1.5 Q15.8 2.8 17 7.5 Z" fill="#62c046" stroke={outline} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M17 7.5 Q20.5 3.5 24 2.6 Q21.6 6.6 17 7.5 Z" fill="#62c046" stroke={outline} strokeWidth="1.1" strokeLinejoin="round" />
      {/* Cara: ojo mirando a la derecha, sonrisa y mejilla. */}
      <ellipse cx="16.6" cy="20.5" rx="4.3" ry="4.9" fill="#ffffff" stroke={outline} strokeWidth="1.1" />
      <circle cx="18.2" cy="21.1" r="2.3" fill="#1a2614" />
      <circle cx="18.9" cy="19.9" r="0.8" fill="#ffffff" />
      <path d="M16.4 27.6 Q18.8 29.6 21.2 27.3" fill="none" stroke={outline} strokeWidth="1.1" strokeLinecap="round" />
      <ellipse cx="11.6" cy="27" rx="2.4" ry="1.4" fill="rgba(255, 130, 130, 0.45)" />
      <ellipse cx="11.2" cy="16.4" rx="2.8" ry="1.6" fill="rgba(255, 255, 255, 0.4)" transform="rotate(-35 11.2 16.4)" />
    </svg>
  );
}
