import { INK, SPROUT } from '../../icons/iconArt';
import { CAP, DROP, Flower, Leaf, LetterGradient, LetterStrokes, OUTER, cssVars, delays, layoutWord, polar, useSvgId } from './letters';
import './titleLogo.css';

/**
 * Logo del titulo, "Huerto" (elegido entre tres en `/proposals/logo.html`): letras de tallo verde que brotan del suelo
 * una tras otra y luego se mecen por turnos. La primera "O" es una semilla rajada de la que sale el brote del icono
 * (`SPROUT`); en las puntas de las letras hay hojas que aletean y flores que giran, y una mariposa ronda el nombre de vez
 * en cuando. La caja del SVG es la de las letras: el brote, las hojas y la mariposa se salen por arriba, como el brote
 * del titulo de antes. Mide `1.1em` de alto: el tamano lo pone el `font-size` de `.title-logo`. Se mueve con CSS
 * (`titleLogo.css`).
 */

const GREEN = ['#f6ffd8', '#c2f285', '#74cc48', '#3a8f2b'];
const SEED = ['#fff1d2', '#f2c27a', '#c97a36', '#7f4519'];
/** Lo que mide el brote del icono sobre la semilla, respecto a su caja de 48 x 40. */
const SPROUT_SCALE = 1.5;

/** Ancho, en las unidades de las letras, que cabe sin encoger: el de REBROTE con letra y media de holgura. */
export const LOGO_ROOM = layoutWord('REBROTE').width * (8.5 / 7);

/** Cuanto encoge una palabra (`--logo-fit`) para no pasar del ancho de REBROTE con su holgura. */
export function logoFit(word: string): number {
  return Math.min(1, LOGO_ROOM / layoutWord(word).width);
}

/** El brote del icono, de pie sobre (0, 0). */
function IconSprout() {
  return (
    <g transform={`scale(${SPROUT_SCALE}) translate(-24 -40)`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={SPROUT.stem} stroke={INK.outline} strokeWidth={SPROUT.stemWidth.full + SPROUT.outline.full} />
      <path d={SPROUT.stem} stroke={INK.stem} strokeWidth={SPROUT.stemWidth.full} />
      <path d={SPROUT.leafLeft} fill={INK.leafLeft} stroke={INK.outline} strokeWidth={SPROUT.outline.full} />
      <path d={SPROUT.leafRight} fill={INK.leafRight} stroke={INK.outline} strokeWidth={SPROUT.outline.full} />
      <path d={SPROUT.veinLeft} stroke={INK.vein} strokeWidth="1.1" opacity="0.7" />
      <path d={SPROUT.veinRight} stroke={INK.vein} strokeWidth="1.1" opacity="0.7" />
    </g>
  );
}

export function TitleLogo({ word, butterfly = true }: { word: string; butterfly?: boolean }) {
  const id = useSvgId();
  const { letters, width } = layoutWord(word);
  const seed = word.indexOf('O');
  const box = [-8, -OUTER, width + 16, 2 * OUTER + CAP + DROP + 1];
  return (
    <svg
      className="title-logo-svg"
      viewBox={box.join(' ')}
      width={box[2]}
      height={box[3]}
      style={cssVars({ '--aspect': box[2] / box[3], '--w': width })}
      aria-hidden="true"
    >
      <defs>
        <LetterGradient id={id('green')} stops={GREEN} />
        <LetterGradient id={id('seed')} stops={SEED} />
      </defs>
      {letters.map(({ glyph, x, i }) => {
        const isSeed = i === seed;
        const [tx, ty, ta] = glyph.tip;
        const [fx, fy] = polar(tx, ty, ta, 26);
        return (
          <g key={i} transform={`translate(${x} 0)`}>
            <g className="tl-grow" style={delays(0.08 * i)}>
              <g className="tl-sway" style={delays(1.2 + 0.08 * i)}>
                {isSeed ? (
                  <LetterStrokes glyph={glyph} fill={`url(#${id('seed')})`} rim="#4a2a12" shadow="#2e1909" />
                ) : (
                  <LetterStrokes glyph={glyph} fill={`url(#${id('green')})`} rim={INK.outline} shadow={INK.letterShadow} />
                )}
                {isSeed && (
                  <>
                    <path d="M36 -12 L30 -4 L37 3 L32 11" fill="none" stroke="#4a2a12" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <g transform={`translate(33 ${-OUTER + 4})`}>
                      <g className="tl-pop" style={delays(0.9)}>
                        <g className="tl-sprout" style={delays(1.5)}>
                          <IconSprout />
                        </g>
                      </g>
                    </g>
                  </>
                )}
                {!isSeed && i % 2 === 0 && (
                  <g transform={`translate(${tx} ${ty})`}>
                    <g className="tl-pop" style={delays(0.7 + 0.06 * i)}>
                      <g className="tl-flutter" style={delays(1.3 + 0.21 * i)}>
                        <Leaf angle={ta} fill={INK.leafLeft} rim={INK.outline} />
                      </g>
                    </g>
                  </g>
                )}
                {!isSeed && i % 4 === 1 && (
                  <>
                    <path d={`M${tx} ${ty} L${fx} ${fy}`} stroke={INK.stem} strokeWidth="4" strokeLinecap="round" />
                    <g transform={`translate(${fx} ${fy})`}>
                      <g className="tl-pop" style={delays(0.8 + 0.06 * i)}>
                        <g className="tl-spin">
                          <Flower petal={i % 8 === 1 ? '#fff4f8' : '#ffd1e6'} rim="#8a3a5a" />
                        </g>
                      </g>
                    </g>
                  </>
                )}
              </g>
            </g>
          </g>
        );
      })}
      {butterfly && (
        <g className="tl-butterfly">
          <g className="tl-wings">
            <path d="M0 0 C-6 -16 -22 -18 -20 -4 C-19 4 -8 4 0 0 Z M0 0 C-4 10 -16 14 -16 6 C-16 1 -6 0 0 0 Z" fill="#ff9fc8" stroke="#7a2f52" strokeWidth="2" strokeLinejoin="round" />
            <path d="M0 0 C6 -16 22 -18 20 -4 C19 4 8 4 0 0 Z M0 0 C4 10 16 14 16 6 C16 1 6 0 0 0 Z" fill="#ffc2dc" stroke="#7a2f52" strokeWidth="2" strokeLinejoin="round" />
          </g>
          <path d="M0 -8 V8" stroke="#4a2440" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
