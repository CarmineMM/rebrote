import { useId, type PointerEvent as ReactPointerEvent } from 'react';
import { GRENADE, ICE_WALL } from '../game/config/balance';
import { iceWallAt, type PowerId } from '../game/core/powers';
import { EventBus, GameEvents, type PagePoint, type PowerInfo } from '../game/EventBus';
import { formatSeconds } from '../i18n';
import { useText } from './useText';

interface PowerPanelProps {
  /** Poderes de la partida, con sus cargas y si se pueden usar ahora (`powersChanged`). Sin ninguno, no hay panel. */
  powers: PowerInfo[];
  selected: PowerId | null;
}

const toPagePoint = (event: PointerEvent): PagePoint => ({ pageX: event.pageX, pageY: event.pageY });

/**
 * Panel izquierdo de los poderes (T-021): un boton por poder, con su dibujo y sus cargas. Se usa como una carta: se pulsa
 * y se arrastra al tablero, o se pulsa y se toca despues una casilla. Pulsar el elegido lo suelta sin gastarlo. Sin
 * cargas se ve apagado; la granada y el muro, en la preparacion, en espera (solo van en el ataque, O-07). React solo avisa
 * a Phaser por EventBus: las reglas son de la escena.
 */
export function PowerPanel({ powers, selected }: PowerPanelProps) {
  const t = useText();
  if (powers.length === 0) return null;
  return (
    <div className="power-panel" role="group" aria-label={t.hud.powers.label} data-silent>
      {powers.map((power) => (
        <PowerButton key={power.id} power={power} selected={selected === power.id} />
      ))}
    </div>
  );
}

function PowerButton({ power, selected }: { power: PowerInfo; selected: boolean }) {
  const t = useText();
  const { id, level, charges, blocker } = power;
  const usable = blocker === null;
  const waiting = blocker === 'attack-only';
  const help = t.hud.powers.help;
  const about =
    id === 'grenade'
      ? help.grenade(formatSeconds(GRENADE.fuseMs))
      : id === 'iceWall'
        ? help.iceWall(iceWallAt(level).span, formatSeconds(ICE_WALL.durationMs))
        : help.relocate;
  const state = waiting ? t.hud.powers.attackOnly : !usable ? t.hud.powers.noCharges : t.hud.powers.charges(charges);
  // Con nivel (T-022), tambien lo dice la ayuda y una pastilla verde abajo.
  const levelText = level > 1 ? t.hud.powers.level(level) : null;
  const title = [about, levelText, state].filter(Boolean).join(' · ');

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    // El elegido se suelta al volver a pulsarlo; uno que no se puede usar ni se elige.
    if (selected) {
      EventBus.emit(GameEvents.powerPicked, id);
      return;
    }
    if (!usable) return;
    EventBus.emit(GameEvents.powerPicked, id);

    // Se escucha en window para seguir el arrastre aunque el puntero salga del boton y entre en el canvas.
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
      className={`power power-${id}${waiting ? ' is-waiting' : ''}`}
      aria-pressed={selected}
      aria-disabled={!usable}
      aria-label={`${t.hud.powers.names[id]}${levelText ? ` (${levelText})` : ''}: ${state}`}
      title={title}
      data-tour={`power-${id}`}
      onPointerDown={onPointerDown}
    >
      <PowerIcon power={id} />
      {/* La clave cambia con las cargas: el numero salta al gastarse. */}
      <span key={charges} className={`power-charges${charges === 0 ? ' is-empty' : ''}`} aria-hidden="true">
        {charges}
      </span>
      {waiting && <span className="power-wait" aria-hidden="true" />}
      {level > 1 && (
        <span className="power-level" aria-hidden="true">
          {level}
        </span>
      )}
    </button>
  );
}

/**
 * Dibujo de cada poder (T-021), en SVG con los colores de su arte del tablero (`powerArt.ts`): un brote que salta de un
 * monton de tierra a otro (recolocar), la granada con su corona, su anilla y la mecha encendida, y tres bloques de hielo
 * apilados (el muro). Tambien en los dibujos de los tours.
 */
export function PowerIcon({ power }: { power: PowerId }) {
  if (power === 'grenade') return <GrenadeIcon />;
  if (power === 'iceWall') return <IceWallIcon />;
  return <RelocateIcon />;
}

function RelocateIcon() {
  return (
    <svg className="power-icon" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      {/* Flecha dorada en arco, de un sitio al otro. */}
      <path d="M8 22 Q20 2 32 18" fill="none" stroke="#5a3d00" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 6.5" />
      <path d="M8 22 Q20 2 32 18" fill="none" stroke="#ffd23f" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 6.5" />
      <path d="M27.5 16.5 L33.5 19.5 L33 12.8 Z" fill="#ffd23f" stroke="#5a3d00" strokeWidth="1.4" strokeLinejoin="round" />
      {/* Monton de tierra vacio a la izquierda y brote sobre el de la derecha. */}
      <ellipse cx="9" cy="33" rx="7" ry="3.2" fill="#6e4628" stroke="#3a2412" strokeWidth="1.2" />
      <ellipse cx="29" cy="34" rx="8" ry="3.4" fill="#8a5a34" stroke="#3a2412" strokeWidth="1.2" />
      <path d="M29 33 Q28.6 28 29.4 24" fill="none" stroke="#2a6b22" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M29 33 Q28.6 28 29.4 24" fill="none" stroke="#7fd45a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M29.4 25.5 Q24 24.5 22.6 20 Q27.6 20.4 29.4 25.5 Z" fill="#62c046" stroke="#2a6b22" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M29.6 25 Q33.8 22.2 36.4 23.2 Q33.6 27 29.6 25 Z" fill="#62c046" stroke="#2a6b22" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function GrenadeIcon() {
  const fill = `${useId()}-skin`;
  const outline = '#6a0b1c';
  return (
    <svg className="power-icon" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <defs>
        <radialGradient id={fill} cx="0.36" cy="0.34" r="0.78">
          <stop offset="0" stopColor="#ffd9cf" />
          <stop offset="0.45" stopColor="#ff5a6a" />
          <stop offset="1" stopColor="#b3122f" />
        </radialGradient>
      </defs>
      {/* Mecha y su chispa. */}
      <path d="M20 12 Q18 6 25 3.5" fill="none" stroke={outline} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M20 12 Q18 6 25 3.5" fill="none" stroke="#a07040" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="26" cy="3.4" r="3.2" fill="#ffd650" />
      <circle cx="26" cy="3.4" r="1.5" fill="#fffbe0" />
      {/* Cuerpo y corona. */}
      <circle cx="20" cy="25" r="12.5" fill={`url(#${fill})`} stroke={outline} strokeWidth="1.8" />
      <path d="M15.4 14.6 L14.6 10 L17.2 12.4 L20 9 L22.8 12.4 L25.4 10 L24.6 14.6 Z" fill="#c8293d" stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Anilla dorada. */}
      <circle cx="28.6" cy="15.4" r="3" fill="none" stroke={outline} strokeWidth="2.6" />
      <circle cx="28.6" cy="15.4" r="3" fill="none" stroke="#ffc23a" strokeWidth="1.3" />
      {/* Cara. */}
      <ellipse cx="16" cy="24" rx="2.8" ry="3.2" fill="#ffffff" stroke={outline} strokeWidth="0.9" />
      <ellipse cx="24.4" cy="24" rx="2.8" ry="3.2" fill="#ffffff" stroke={outline} strokeWidth="0.9" />
      <circle cx="16.9" cy="24.5" r="1.4" fill="#1d0a12" />
      <circle cx="25.3" cy="24.5" r="1.4" fill="#1d0a12" />
      <path d="M16.5 30 Q20.4 33 24.2 29.6" fill="none" stroke={outline} strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="14.2" cy="19.6" rx="3.2" ry="1.8" fill="rgba(255, 255, 255, 0.5)" transform="rotate(-35 14.2 19.6)" />
    </svg>
  );
}

function IceWallIcon() {
  const fill = `${useId()}-ice`;
  const outline = '#1f5a8a';
  const block = (y: number) => (
    <g key={y}>
      <rect x="9" y={y} width="22" height="10" rx="3" fill={`url(#${fill})`} stroke={outline} strokeWidth="1.5" />
      <path d={`M13 ${y + 8.4} L17 ${y + 1.6}`} stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
  return (
    <svg className="power-icon" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#effbff" />
          <stop offset="0.5" stopColor="#a8e4ff" />
          <stop offset="1" stopColor="#5cb2e6" />
        </linearGradient>
      </defs>
      {block(5)}
      {block(16)}
      {block(27)}
      {/* Nieve en lo alto y dos ojos decididos en el del medio. */}
      <path d="M9.6 7.4 Q12 3.2 17 4.6 Q20 2.6 23 4.4 Q28 3 30.4 7.4 Q26 6.4 23 7.6 Q20 6.2 17 7.6 Q13 6.2 9.6 7.4 Z" fill="#ffffff" stroke="rgba(63, 143, 200, 0.9)" strokeWidth="1" />
      <circle cx="17.6" cy="21" r="1.7" fill="#0f2a44" />
      <circle cx="23.6" cy="21" r="1.7" fill="#0f2a44" />
    </svg>
  );
}
