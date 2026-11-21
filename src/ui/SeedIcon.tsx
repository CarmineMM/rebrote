import { useId } from 'react';

/**
 * Icono de las semillas (T-020): una semilla parda con un brote verde. La moneda de la partida es un disco dorado, asi que
 * no se confunden ni por la forma ni por el color. Decorativo: quien lo usa dice al lector de pantalla de que se trata.
 */
export function SeedIcon({ className = '' }: { className?: string }) {
  const id = useId();
  const body = `seed-body-${id}`;
  return (
    <svg className={`seed-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={body} cx="0.38" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#f7d79a" />
          <stop offset="0.5" stopColor="#c98a44" />
          <stop offset="1" stopColor="#7d4b1d" />
        </radialGradient>
      </defs>
      <path className="seed-icon-stem" d="M12 9.2 C12 7.6 12 6.4 12.2 5" />
      <path className="seed-icon-leaf" d="M12.1 6.4 C9.6 6.6 7.6 5.2 7 2.6 C9.7 2.4 11.6 3.8 12.1 6.4 Z" />
      <path className="seed-icon-leaf" d="M12.2 5.6 C13 3.2 15.2 1.8 17.6 2.2 C17.2 4.6 15 6 12.2 5.6 Z" />
      <path className="seed-icon-body" fill={`url(#${body})`} d="M12 8.4 C15.6 10.6 18.6 13.8 18.2 17.4 C17.8 20.6 15.2 22.4 12 22.4 C8.8 22.4 6.2 20.6 5.8 17.4 C5.4 13.8 8.4 10.6 12 8.4 Z" />
      <path className="seed-icon-seam" d="M12 11.4 C10.4 14 10.3 17.6 11.6 20.4" />
    </svg>
  );
}
