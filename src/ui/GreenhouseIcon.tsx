/**
 * El Invernadero (T-019) en dibujo: una casita de cristal en arco con el marco verde oscuro de las plantas del juego, un
 * brillo en el cristal y un brote dentro que se mece. Va en el boton de la victoria que lleva al Invernadero. No es una
 * entidad del juego: es el icono de un menu (regla 3 de `CLAUDE.md`).
 */
export function GreenhouseIcon() {
  return (
    <svg className="greenhouse-icon" viewBox="0 0 48 44" aria-hidden="true">
      <path className="greenhouse-glass" d="M5 41 V21 C5 10 13 4 24 4 C35 4 43 10 43 21 V41 Z" />
      <g className="greenhouse-sprout">
        <path className="greenhouse-stem" d="M24 41 C24 36 23.5 33 24 28" />
        <path className="greenhouse-leaf is-left" d="M24 33 C19 33.5 15.5 30.5 15 25.5 C20 25.5 23.5 28.5 24 33 Z" />
        <path className="greenhouse-leaf is-right" d="M24 30 C26 25 30 22 34 22.5 C33.5 27 29.5 30.5 24 30 Z" />
      </g>
      <path className="greenhouse-frame" d="M5 41 V21 C5 10 13 4 24 4 C35 4 43 10 43 21 V41 Z M24 4 V41 M5 23 H43 M13.5 7.5 V41 M34.5 7.5 V41" />
      <path className="greenhouse-shine" d="M9.5 18 C10.5 13 13.5 10 17.5 8.5" />
      <path className="greenhouse-base" d="M2.5 41 H45.5" />
    </svg>
  );
}
