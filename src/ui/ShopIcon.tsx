/**
 * Icono de la tienda (T-022): un puesto de jardin con su toldo a rayas verdes y crema, el mostrador de madera y un saquito
 * de semillas con su brote encima. Va en el boton del Invernadero y en el aviso de la victoria. Decorativo.
 */
export function ShopIcon() {
  return (
    <svg className="shop-icon" viewBox="0 0 28 26" width="28" height="26" aria-hidden="true" focusable="false">
      {/* Postes y mostrador. */}
      <path d="M5 10 V23 M23 10 V23" stroke="#3a2412" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="3" y="17" width="22" height="6.5" rx="1.6" fill="#a8703f" stroke="#3a2412" strokeWidth="1.5" />
      <path d="M5 20 H23" stroke="rgba(58, 36, 18, 0.45)" strokeWidth="1" />
      {/* Saquito de semillas con su brote. */}
      <path d="M11 17 Q10.4 13.4 12 12.4 H16 Q17.6 13.4 17 17 Z" fill="#e8c98c" stroke="#5a3a1a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M14 12.4 Q13.8 10.6 14.3 9.4" fill="none" stroke="#2a6b22" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.2 10.4 Q11.8 10.2 11.4 8.4 Q13.6 8.4 14.2 10.4 Z" fill="#62c046" stroke="#2a6b22" strokeWidth="0.9" />
      {/* Toldo a rayas, con su borde ondulado. */}
      <path d="M2 4.5 Q14 1 26 4.5 V9 H2 Z" fill="#f3ecd2" stroke="#1f4d16" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 3.2 V9 M14 2.4 V9 M21 3.2 V9" stroke="#4fae3a" strokeWidth="3.6" />
      <path
        d="M2 9 Q4.5 12 7 9 Q9.5 12 12 9 Q14.5 12 17 9 Q19.5 12 22 9 Q24.5 12 26 9"
        fill="#4fae3a"
        stroke="#1f4d16"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
