import type { CSSProperties } from 'react';

/**
 * Decorados de las propuestas del Invernadero (`/proposals/invernadero.html`). Un SVG de 1600 x 900 que cubre la pantalla entera
 * (recortado, apoyado abajo): en el juego lo pintaria Phaser con el resto del decorado. Todo se mueve con CSS
 * (`greenhouseLab.css`), cada cosa a su ritmo.
 */

/** Numeros al azar pero siempre los mismos, para que el decorado no cambie al volver a pintar. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

function Cloud({ x, y, s, fill, className }: { x: number; y: number; s: number; fill: string; className?: string }) {
  return (
    <g className={className} transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="90" ry="28" fill={fill} />
      <ellipse cx="-38" cy="-18" rx="40" ry="30" fill={fill} />
      <ellipse cx="22" cy="-26" rx="48" ry="38" fill={fill} />
      <ellipse cx="62" cy="-6" rx="34" ry="24" fill={fill} />
    </g>
  );
}

/** Una guirnalda de bombillas colgando entre dos puntos, con las bombillas que parpadean por turnos. */
function StringLights({
  x0,
  y0,
  x1,
  y1,
  sag,
  count,
  colors,
  prefix,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sag: number;
  count: number;
  colors: readonly string[];
  prefix: string;
}) {
  const cx = (x0 + x1) / 2;
  const cy = Math.max(y0, y1) + sag;
  const at = (t: number) => ({
    x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
    y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1,
  });
  return (
    <g>
      <path d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`} fill="none" stroke="#2b2118" strokeWidth="3" />
      {Array.from({ length: count }, (_, i) => {
        const p = at((i + 0.5) / count);
        const color = colors[i % colors.length];
        return (
          <g key={`${prefix}${i}`} transform={`translate(${p.x} ${p.y})`}>
            <rect x="-3.5" y="0" width="7" height="8" rx="1.5" fill="#3a3026" />
            <circle className="gh-bulb-glow" style={delay((i % 3) * 0.7)} cx="0" cy="17" r="15" fill={color} opacity="0.28" />
            <path className="gh-bulb" style={delay((i % 3) * 0.7)} d="M0 7 C-8 11 -8 22 0 27 C8 22 8 11 0 7Z" fill={color} />
            <ellipse cx="-2.5" cy="15" rx="1.6" ry="3.2" fill="#ffffff" opacity="0.75" />
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1. Laboratorio de dia

export function LabBackdrop() {
  const rand = seeded(7);
  const mullions = Array.from({ length: 11 }, (_, i) => i * 160);
  const motes = Array.from({ length: 18 }, () => ({
    x: 520 + rand() * 700,
    y: 120 + rand() * 600,
    r: 1.5 + rand() * 2.5,
    d: rand() * 8,
  }));
  const vines = [
    { x: 660, len: 130 },
    { x: 800, len: 170 },
    { x: 1110, len: 120 },
    { x: 1430, len: 160 },
  ];
  return (
    <svg className="gh-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="lab-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ea7ea" />
          <stop offset="0.5" stopColor="#94d2f7" />
          <stop offset="0.75" stopColor="#d8f3ff" />
        </linearGradient>
        <radialGradient id="lab-sun-glow">
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#fff2a0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff2a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lab-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbe0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fffbe0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lab-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f1e1" />
          <stop offset="1" stopColor="#d7cfb7" />
        </linearGradient>
        <linearGradient id="lab-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dd9a6c" />
          <stop offset="1" stopColor="#b0663f" />
        </linearGradient>
        <linearGradient id="lab-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8f58a" />
          <stop offset="1" stopColor="#3fae3a" />
        </linearGradient>
        <linearGradient id="lab-liquid-pink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc0e0" />
          <stop offset="1" stopColor="#e0569a" />
        </linearGradient>
        <pattern id="lab-tiles" width="128" height="64" patternUnits="userSpaceOnUse">
          <rect width="64" height="32" fill="#ffffff" opacity="0.07" />
          <rect x="64" y="32" width="64" height="32" fill="#ffffff" opacity="0.07" />
          <path d="M0 1H128M0 33H128M1 0V64M65 0V64" stroke="#f4e3c8" strokeOpacity="0.55" strokeWidth="3" fill="none" />
        </pattern>
      </defs>

      {/* Fuera: cielo, sol, nubes y el jardin a lo lejos, a traves del cristal. */}
      <rect width="1600" height="900" fill="url(#lab-sky)" />
      <circle className="lab-sun-glow" cx="1200" cy="140" r="280" fill="url(#lab-sun-glow)" />
      <circle cx="1200" cy="140" r="56" fill="#fff4b8" />
      <g className="gh-drift">
        <Cloud x={260} y={200} s={1} fill="#ffffff" />
        <Cloud x={900} y={110} s={0.8} fill="#ffffff" />
        <Cloud x={1500} y={250} s={0.9} fill="#ffffff" />
      </g>
      <path d="M0 470 C200 420 380 450 560 430 C760 405 960 455 1160 425 C1340 400 1480 430 1600 415 V640 H0Z" fill="#9ad874" />
      <path d="M0 520 C240 490 420 515 640 500 C860 485 1080 520 1300 500 C1450 488 1540 500 1600 495 V640 H0Z" fill="#76c454" />
      {[90, 330, 610, 980, 1240, 1520].map((x, i) => (
        <g key={x} className="gh-sway-soft" style={delay(i * 0.6)}>
          <rect x={x - 6} y={470 - (i % 2) * 20} width="12" height="50" fill="#7a5233" />
          <circle cx={x} cy={455 - (i % 2) * 20} r={34 + (i % 3) * 6} fill="#4fa63c" />
          <circle cx={x - 14} cy={446 - (i % 2) * 20} r={14} fill="#6cc24f" />
        </g>
      ))}
      <rect width="1600" height="640" fill="#e9fbff" opacity="0.16" />

      {/* Reflejos en los cristales y rayos de luz. */}
      {mullions
        .slice(0, 10)
        .map((x, i) => (i % 2 === 0 ? <path key={x} d={`M${x + 50} 140 L${x + 95} 140 L${x + 35} 392 L${x - 10} 392Z`} fill="#ffffff" opacity="0.2" /> : null))}
      <g className="lab-rays">
        <path d="M1050 0 L1180 0 L760 900 L520 900Z" fill="url(#lab-ray)" />
        <path d="M1240 0 L1300 0 L1040 900 L930 900Z" fill="url(#lab-ray)" opacity="0.7" />
      </g>

      {/* El armazon de hierro pintado de blanco: viga de arriba, travesanos y montantes. */}
      <rect y="0" width="1600" height="30" fill="#f4f8f1" />
      <rect y="28" width="1600" height="4" fill="#a9bba8" />
      {[130, 396].map((y) => (
        <g key={y}>
          <rect y={y} width="1600" height="12" fill="#f4f8f1" />
          <rect y={y + 11} width="1600" height="3" fill="#a9bba8" />
        </g>
      ))}
      {mullions.map((x) => (
        <g key={x}>
          <rect x={x - 7} y="0" width="14" height="610" fill="#f4f8f1" />
          <rect x={x + 4} y="0" width="3" height="610" fill="#a9bba8" />
          <circle cx={x} cy="136" r="3" fill="#a9bba8" />
          <circle cx={x} cy="402" r="3" fill="#a9bba8" />
        </g>
      ))}

      {/* Enredaderas que cuelgan de la viga y se mecen. */}
      {vines.map(({ x, len }, i) => (
        <g key={x} className="lab-vine" style={{ ...delay(-i * 0.9), transformOrigin: `${x}px 30px` }}>
          <path
            d={`M${x} 30 C${x + 14} ${30 + len * 0.35} ${x - 14} ${30 + len * 0.65} ${x + 4} ${30 + len}`}
            stroke="#3e8a2e"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {Array.from({ length: Math.round(len / 26) }, (_, j) => {
            const y = 46 + j * 26;
            const side = j % 2 === 0 ? 1 : -1;
            return (
              <ellipse
                key={j}
                cx={x + side * 11}
                cy={y}
                rx="11"
                ry="7"
                transform={`rotate(${side * 30} ${x + side * 11} ${y})`}
                fill={j % 3 === 0 ? '#9be564' : '#6cc24f'}
                stroke="#2f6e24"
                strokeWidth="2"
              />
            );
          })}
        </g>
      ))}

      {/* Una balda con matraces que burbujean y un brote en su maceta (sobre Patty). */}
      <g>
        <rect x="860" y="452" width="280" height="14" rx="3" fill="#a8723f" stroke="#6b4320" strokeWidth="3" />
        <path d="M880 466 l0 26 l26 0" stroke="#6b4320" strokeWidth="5" fill="none" />
        <path d="M1120 466 l0 26 l-26 0" stroke="#6b4320" strokeWidth="5" fill="none" />
        {/* Matraz verde */}
        <path d="M905 382 h20 v26 l26 44 h-72 l26 -44Z" fill="#e8fbff" fillOpacity="0.5" stroke="#5d7f86" strokeWidth="3" strokeLinejoin="round" />
        <path d="M898 424 l-12 22 a4 4 0 0 0 3 6 h66 a4 4 0 0 0 3 -6 l-12 -22Z" fill="url(#lab-liquid)" />
        {[0, 1, 2].map((i) => (
          <circle key={i} className="lab-bubble" style={delay(i * 0.8)} cx={910 + i * 9} cy="436" r={3 + (i % 2)} fill="#eaffd0" />
        ))}
        {/* Tubos de ensayo */}
        <rect x="975" y="420" width="64" height="12" rx="3" fill="#a8723f" stroke="#6b4320" strokeWidth="2" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={982 + i * 18} y={392} width="12" height="58" rx="6" fill="#e8fbff" fillOpacity="0.55" stroke="#5d7f86" strokeWidth="2" />
            <rect x={984 + i * 18} y={418 - i * 8} width="8" height={30 + i * 8} rx="4" fill={['#ffd23f', '#ff8fc4', '#7fd3ff'][i]} />
          </g>
        ))}
        {/* Matraz rosa redondo */}
        <circle cx="1080" cy="428" r="24" fill="#e8fbff" fillOpacity="0.5" stroke="#5d7f86" strokeWidth="3" />
        <rect x="1072" y="392" width="16" height="16" fill="#e8fbff" fillOpacity="0.5" stroke="#5d7f86" strokeWidth="3" />
        <path d="M1058 432 a22 22 0 0 0 44 0Z" fill="url(#lab-liquid-pink)" />
        {[0, 1].map((i) => (
          <circle key={i} className="lab-bubble" style={delay(0.4 + i * 1.1)} cx={1074 + i * 12} cy="440" r="3" fill="#ffe0f0" />
        ))}
        {/* Brote en su maceta */}
        <path d="M1108 430 h26 l-4 22 h-18Z" fill="#d9774a" stroke="#7d3a1e" strokeWidth="2.5" strokeLinejoin="round" />
        <g className="gh-sway" style={{ transformOrigin: '1121px 430px' }}>
          <path d="M1121 430 C1121 418 1122 410 1121 402" stroke="#2f8a28" strokeWidth="3" fill="none" />
          <ellipse cx="1113" cy="404" rx="9" ry="5" transform="rotate(-25 1113 404)" fill="#9be564" stroke="#2f6e24" strokeWidth="2" />
          <ellipse cx="1130" cy="400" rx="9" ry="5" transform="rotate(25 1130 400)" fill="#74cc48" stroke="#2f6e24" strokeWidth="2" />
        </g>
      </g>

      {/* Pared baja, mesa de trabajo y suelo de baldosas. */}
      <rect y="606" width="1600" height="104" fill="url(#lab-wall)" />
      <rect y="598" width="1600" height="14" fill="#ffffff" />
      <rect y="610" width="1600" height="4" fill="#bdb49a" />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={i * 100 + 4} y="626" width="92" height="72" rx="6" fill="none" stroke="#c6bd9f" strokeWidth="3" />
      ))}
      <rect y="706" width="1600" height="194" fill="url(#lab-floor)" />
      <rect y="706" width="1600" height="194" fill="url(#lab-tiles)" />
      <rect y="706" width="1600" height="10" fill="#6e3119" opacity="0.35" />

      {/* Motas de polvo que flotan en la luz. */}
      {motes.map((m, i) => (
        <circle key={i} className="gh-mote" style={delay(-m.d)} cx={m.x} cy={m.y} r={m.r} fill="#fffbe0" opacity="0.8" />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. Refugio de noche

export function RefugeBackdrop() {
  const rand = seeded(11);
  const stars = Array.from({ length: 40 }, () => ({
    x: rand() * 1600,
    y: rand() * 330,
    r: 0.8 + rand() * 1.8,
    d: rand() * 4,
  }));
  const rain = Array.from({ length: 22 }, (_, i) => ({
    x: 30 + i * 72 + rand() * 30,
    d: rand() * 6,
    speed: 4 + rand() * 4,
    bits: Array.from({ length: 5 }, () => (rand() > 0.5 ? 1 : 0)),
  }));
  const mullions = Array.from({ length: 11 }, (_, i) => i * 160);
  return (
    <svg className="gh-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ref-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d0a26" />
          <stop offset="0.45" stopColor="#24164a" />
          <stop offset="0.7" stopColor="#4a2468" />
        </linearGradient>
        <radialGradient id="ref-lamp" cx="0.56" cy="0.28" r="0.75">
          <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#ffa94d" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ff9a3d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ref-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#05030c" stopOpacity="0.7" />
        </radialGradient>
        <linearGradient id="ref-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3820" />
          <stop offset="1" stopColor="#2c1a0e" />
        </linearGradient>
        <linearGradient id="ref-plank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a6a3e" />
          <stop offset="1" stopColor="#6f4724" />
        </linearGradient>
        <radialGradient id="ref-corrupt" cx="0.5" cy="1" r="0.7">
          <stop offset="0" stopColor="#c86bff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c86bff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Fuera, de noche: estrellas, una luna tapada, el resplandor de la corrupcion y sus colinas con circuitos. */}
      <rect width="1600" height="900" fill="url(#ref-night)" />
      {stars.map((s, i) => (
        <circle key={i} className="gh-twinkle" style={delay(-s.d)} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" />
      ))}
      <circle cx="380" cy="150" r="48" fill="#ece6ff" opacity="0.9" />
      <circle cx="400" cy="140" r="44" fill="#24164a" opacity="0.55" />
      <g className="gh-drift">
        <Cloud x={420} y={190} s={1.1} fill="#3a2563" />
        <Cloud x={1200} y={120} s={0.9} fill="#2e1d55" />
      </g>
      <ellipse cx="1150" cy="620" rx="900" ry="260" fill="url(#ref-corrupt)" className="ref-corrupt" />
      <path d="M0 520 C180 470 330 500 520 470 C700 440 860 500 1040 470 C1220 440 1400 490 1600 455 V640 H0Z" fill="#2a1542" />
      <path d="M0 570 C220 540 420 560 640 545 C880 530 1060 565 1300 545 C1440 535 1530 548 1600 540 V640 H0Z" fill="#1c0e30" />
      <g className="ref-circuit">
        <path d="M60 600 h120 l30 -40 h140 l20 30 h110" fill="none" stroke="#5ff2d0" strokeWidth="3" />
        <path d="M640 590 h90 l40 -50 h160 l30 40 h140" fill="none" stroke="#c86bff" strokeWidth="3" />
        <path d="M1160 585 h110 l26 -36 h170 l20 30 h80" fill="none" stroke="#5ff2d0" strokeWidth="3" />
        {[180, 350, 730, 930, 1270, 1466].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 ? 560 : 600} r="6" fill={i % 3 ? '#5ff2d0' : '#c86bff'} />
        ))}
      </g>
      {/* Lluvia de bits. */}
      {rain.map((r, i) => (
        <g
          key={i}
          className="ref-rain"
          style={{
            animationDelay: `${-r.d}s`,
            animationDuration: `${r.speed}s`,
          }}
        >
          {r.bits.map((b, j) => (
            <text
              key={j}
              x={r.x}
              y={j * 26}
              fontSize="20"
              fontFamily="monospace"
              fontWeight="700"
              fill={i % 3 === 0 ? '#c86bff' : '#5ff2d0'}
              opacity={1 - j * 0.18}
            >
              {b}
            </text>
          ))}
        </g>
      ))}
      {/* Un gusano que pasa por fuera, con los ojos encendidos. */}
      <g className="ref-worm">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={-40 - i * 34} cy={520 + (i % 2) * 6} r={26 - i * 2.5} fill="#120822" />
        ))}
        <circle cx="-34" cy="512" r="5" fill="#ff5ad9" />
        <circle cx="-20" cy="514" r="5" fill="#ff5ad9" />
      </g>
      <rect className="ref-flash" width="1600" height="640" fill="#c9a2ff" />

      {/* El cristal, oscuro, y su armazon de madera. Tablas clavadas y cinta en los cristales. */}
      <rect width="1600" height="640" fill="#1a1030" opacity="0.25" />
      {[130, 396].map((y) => (
        <rect key={y} y={y} width="1600" height="14" fill="#3a2414" />
      ))}
      <rect y="0" width="1600" height="30" fill="#3a2414" />
      {mullions.map((x) => (
        <rect key={x} x={x - 8} y="0" width="16" height="610" fill="#3a2414" />
      ))}
      {[
        { x: 0, y: 160, w: 160, h: 230 },
        { x: 1440, y: 160, w: 160, h: 230 },
        { x: 640, y: 420, w: 160, h: 180 },
      ].map((pane, i) => (
        <g key={i}>
          {[0.25, 0.62].map((f, j) => (
            <g key={j} transform={`rotate(${j ? -9 : 7} ${pane.x + pane.w / 2} ${pane.y + pane.h * f})`}>
              <rect
                x={pane.x - 14}
                y={pane.y + pane.h * f - 18}
                width={pane.w + 28}
                height="36"
                rx="4"
                fill="url(#ref-plank)"
                stroke="#3d2410"
                strokeWidth="3"
              />
              <circle cx={pane.x + 4} cy={pane.y + pane.h * f} r="3.5" fill="#cfcfcf" />
              <circle cx={pane.x + pane.w - 4} cy={pane.y + pane.h * f} r="3.5" fill="#cfcfcf" />
            </g>
          ))}
        </g>
      ))}
      <g opacity="0.7">
        <rect x="975" y="262" width="130" height="14" fill="#e6d49a" transform="rotate(52 1040 269)" />
        <rect x="975" y="262" width="130" height="14" fill="#e6d49a" transform="rotate(-52 1040 269)" />
      </g>

      {/* Dentro: sacos terreros bajo los cristales, suelo de tablas y una alfombra. */}
      <rect y="600" width="1600" height="110" fill="#3b2617" />
      {Array.from({ length: 2 }, (_, row) =>
        Array.from({ length: 15 }, (_, i) => (
          <ellipse
            key={`${row}-${i}`}
            cx={i * 112 + (row ? 56 : 0)}
            cy={688 - row * 44}
            rx="62"
            ry="26"
            fill={row ? '#c9ae7d' : '#b59a68'}
            stroke="#6f5832"
            strokeWidth="3"
          />
        )),
      )}
      <rect y="706" width="1600" height="194" fill="url(#ref-floor)" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} y={720 + i * 32} width="1600" height="3" fill="#1d1009" opacity="0.6" />
      ))}
      <ellipse cx="760" cy="840" rx="520" ry="70" fill="#8c2f39" />
      <ellipse cx="760" cy="840" rx="480" ry="56" fill="none" stroke="#e8b04f" strokeWidth="5" strokeDasharray="14 10" />

      {/* Guirnalda y lampara que se mece, con su luz calida. */}
      <StringLights x0={-20} y0={40} x1={760} y1={36} sag={70} count={9} colors={['#ffd36b', '#ff9e5e', '#ffe9a8']} prefix="a" />
      <StringLights x0={1020} y0={36} x1={1620} y1={44} sag={60} count={7} colors={['#ffe9a8', '#ffd36b', '#ff9e5e']} prefix="b" />
      <g className="ref-lamp" style={{ transformOrigin: '900px 0px' }}>
        <line x1="900" y1="0" x2="900" y2="150" stroke="#1a120c" strokeWidth="4" />
        <circle cx="900" cy="200" r="70" fill="#ffd27a" opacity="0.25" className="ref-lamp-halo" />
        <path d="M866 150 h68 l26 44 h-120Z" fill="#2f5a46" stroke="#173126" strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="900" cy="200" rx="16" ry="12" fill="#fff1c2" />
      </g>
      <rect className="ref-glow" width="1600" height="900" fill="url(#ref-lamp)" />
      <rect width="1600" height="900" fill="url(#ref-vignette)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Azotea al atardecer

export function StallBackdrop() {
  const rand = seeded(23);
  const far = Array.from({ length: 22 }, (_, i) => ({
    x: i * 76 - 10,
    w: 60 + rand() * 30,
    h: 120 + rand() * 170,
  }));
  const near = Array.from({ length: 12 }, (_, i) => ({
    x: i * 140 - 30,
    w: 110 + rand() * 40,
    h: 70 + rand() * 120,
  }));
  const flies = Array.from({ length: 16 }, () => ({
    x: 80 + rand() * 1440,
    y: 380 + rand() * 420,
    d: rand() * 6,
  }));
  return (
    <svg className="gh-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d2f8a" />
          <stop offset="0.3" stopColor="#8c4fa6" />
          <stop offset="0.52" stopColor="#e7708a" />
          <stop offset="0.68" stopColor="#ffa86a" />
          <stop offset="0.78" stopColor="#ffd88a" />
        </linearGradient>
        <radialGradient id="st-sun-glow">
          <stop offset="0" stopColor="#fff1b8" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#ffc46e" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ff9a6a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="st-corrupt" cx="1" cy="1" r="0.9">
          <stop offset="0" stopColor="#7dffcf" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#b04bff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#b04bff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="st-deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8704a" />
          <stop offset="1" stopColor="#6e4229" />
        </linearGradient>
        <linearGradient id="st-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99a8c" />
          <stop offset="1" stopColor="#9c6f68" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#st-sky)" />
      <circle cx="1020" cy="590" r="320" fill="url(#st-sun-glow)" className="lab-sun-glow" />
      <circle cx="1020" cy="590" r="105" fill="#fff0b0" />
      <g className="gh-drift">
        {[
          [180, 200, 1.4],
          [760, 140, 1.1],
          [1320, 260, 1.3],
          [520, 360, 0.9],
        ].map(([x, y, s], i) => (
          <ellipse key={i} cx={x} cy={y} rx={160 * s} ry={14 * s} fill={i % 2 ? '#ffb7c2' : '#f59bb0'} opacity="0.7" />
        ))}
      </g>
      {[0, 1, 2].map((i) => (
        <g key={i} className="st-bird" style={delay(-i * 4)}>
          <path d={`M${200 + i * 50} ${220 + i * 30} q8 -8 16 0 q8 -8 16 0`} stroke="#3b2850" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* La ciudad: dos filas de edificios. A la derecha, en el horizonte, la corrupcion que avanza. */}
      <rect x="0" y="380" width="1600" height="520" fill="url(#st-corrupt)" />
      {far.map((b, i) => (
        <rect key={i} x={b.x} y={690 - b.h} width={b.w} height={b.h} fill={b.x > 1250 ? '#5a3a7e' : '#8a5a9e'} />
      ))}
      <g className="ref-circuit">
        <path d="M1300 600 v-60 h40 v-50 M1380 640 v-90 h50 v-40 M1460 610 v-70 h60" fill="none" stroke="#7dffcf" strokeWidth="3" />
        <circle cx="1340" cy="490" r="5" fill="#7dffcf" />
        <circle cx="1430" cy="510" r="5" fill="#c86bff" />
        <circle cx="1520" cy="540" r="5" fill="#7dffcf" />
      </g>
      {near.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={700 - b.h} width={b.w} height={b.h} fill="#4f3466" />
          {Array.from({ length: Math.floor(b.h / 34) }, (_, r) =>
            Array.from({ length: Math.floor(b.w / 30) }, (_, c) => (
              <rect
                key={`${r}-${c}`}
                className="st-window"
                style={delay(((i * 7 + r * 3 + c * 5) % 17) * 0.6)}
                x={b.x + 12 + c * 30}
                y={700 - b.h + 14 + r * 34}
                width="12"
                height="16"
                rx="2"
                fill="#ffd56b"
              />
            )),
          )}
        </g>
      ))}

      {/* Un deposito de agua y una antena con su luz, en el tejado de al lado. */}
      <g>
        <rect x="1150" y="420" width="10" height="130" fill="#3b2850" />
        <rect x="1230" y="420" width="10" height="130" fill="#3b2850" />
        <path d="M1140 330 h110 v100 a55 14 0 0 1 -110 0Z" fill="#6b4a5e" stroke="#3b2850" strokeWidth="4" />
        <path d="M1132 334 l63 -36 l63 36Z" fill="#59384d" stroke="#3b2850" strokeWidth="4" strokeLinejoin="round" />
        <line x1="1560" y1="250" x2="1560" y2="700" stroke="#3b2850" strokeWidth="6" />
        <line x1="1540" y1="300" x2="1580" y2="300" stroke="#3b2850" strokeWidth="4" />
        <circle className="st-beacon" cx="1560" cy="246" r="8" fill="#ff4d4d" />
      </g>

      {/* La azotea: pretil con macetas y el suelo de tablas. */}
      <rect y="690" width="1600" height="70" fill="url(#st-wall)" />
      <rect y="682" width="1600" height="16" rx="4" fill="#e3bfb2" />
      {[860, 960, 1080].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 26} 640 h52 l-6 44 h-40Z`} fill="#d9774a" stroke="#7d3a1e" strokeWidth="3" strokeLinejoin="round" />
          <g className="gh-sway" style={{ ...delay(i * 0.5), transformOrigin: `${x}px 640px` }}>
            <circle cx={x} cy={622 - i * 6} r={22 + i * 3} fill={['#5fbf4a', '#e86a9a', '#4fa63c'][i]} />
            <circle cx={x - 10} cy={612 - i * 6} r={10} fill={['#8ad957', '#ffb3cf', '#6cc24f'][i]} />
          </g>
        </g>
      ))}
      <rect y="756" width="1600" height="144" fill="url(#st-deck)" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} y={772 + i * 28} width="1600" height="3" fill="#4a2a18" opacity="0.5" />
      ))}

      <StringLights x0={-20} y0={70} x1={820} y1={60} sag={80} count={10} colors={['#fff1a8', '#ffd36b', '#ffb3cf']} prefix="a" />
      <StringLights x0={820} y0={60} x1={1620} y1={80} sag={70} count={10} colors={['#ffd36b', '#fff1a8', '#9fe3ff']} prefix="b" />

      {flies.map((f, i) => (
        <g key={i} className="st-firefly" style={delay(-f.d)}>
          <circle cx={f.x} cy={f.y} r="10" fill="#fff3a0" opacity="0.25" />
          <circle cx={f.x} cy={f.y} r="3" fill="#fffbd0" />
        </g>
      ))}
    </svg>
  );
}
