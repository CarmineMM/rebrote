/**
 * Icono del Laboratorio de Patty (T-036; antes, el puesto de la tienda de T-022): un tarro de la despensa con su tapa de
 * corcho y un brote que brilla dentro. Va en el aviso de la victoria la primera vez que cae Creeper. Decorativo.
 */
export function ShopIcon() {
  return (
    <svg className="shop-icon" viewBox="0 0 28 26" width="28" height="26" aria-hidden="true" focusable="false">
      {/* El brillo de dentro. */}
      <circle cx="14" cy="15.5" r="7.5" fill="rgba(255, 214, 90, 0.55)" />
      {/* El tarro de cristal. */}
      <path
        d="M7.5 9 Q6 10.5 6 13 V21.5 Q6 24 8.5 24 H19.5 Q22 24 22 21.5 V13 Q22 10.5 20.5 9 Z"
        fill="rgba(200, 235, 255, 0.35)"
        stroke="#d8ecf5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.6 12.5 V20.5" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.4" strokeLinecap="round" />
      {/* El brote. */}
      <path d="M14 21.5 Q13.6 18 14.4 15.6" fill="none" stroke="#2a6b22" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14.3 17.4 Q11.2 17.2 10.6 14.8 Q13.6 14.8 14.3 17.4 Z" fill="#62c046" stroke="#2a6b22" strokeWidth="0.9" />
      <path d="M14.4 16.2 Q17.4 15.4 17.8 13 Q14.9 13.3 14.4 16.2 Z" fill="#9be564" stroke="#2a6b22" strokeWidth="0.9" />
      {/* La tapa de corcho. */}
      <rect x="9" y="4" width="10" height="5.5" rx="1.6" fill="#c9945e" stroke="#6b4320" strokeWidth="1.4" />
      <path d="M11 6.2 H13 M15.5 7.2 H17" stroke="#8a5a2e" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
