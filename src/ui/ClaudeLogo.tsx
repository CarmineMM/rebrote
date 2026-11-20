/**
 * Logo de Claude para los creditos (T-011): la chispa de rayos redondeados en su color terracota, dibujada con codigo
 * como el resto del arte del juego (ADR-0004). Si algun dia se quiere el archivo oficial, se cambia aqui y nada mas.
 */

/** Rayos de la chispa: angulo (grados) y largo (fraccion del radio). Irregulares a proposito, como el original. */
const RAYS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [31, 0.8],
  [58, 0.95],
  [92, 0.74],
  [121, 0.9],
  [149, 0.8],
  [182, 1],
  [208, 0.76],
  [239, 0.93],
  [271, 0.72],
  [298, 0.9],
  [329, 0.78],
];

const CENTER = 50;
const RADIUS = 44;

export function ClaudeLogo({ size = 40, title }: { size?: number; title?: string }) {
  return (
    <svg className="claude-logo" width={size} height={size} viewBox="0 0 100 100" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g stroke="#D97757" strokeWidth="9" strokeLinecap="round">
        {RAYS.map(([angle, length]) => {
          const radians = (angle * Math.PI) / 180;
          const reach = RADIUS * length;
          return (
            <line
              key={angle}
              x1={CENTER + Math.cos(radians) * 7}
              y1={CENTER + Math.sin(radians) * 7}
              x2={CENTER + Math.cos(radians) * reach}
              y2={CENTER + Math.sin(radians) * reach}
            />
          );
        })}
      </g>
    </svg>
  );
}
