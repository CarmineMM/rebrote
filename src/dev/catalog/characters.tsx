import { useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { OUTBREAKS } from '../../game/config/balance';
import { CAST } from '../../game/view/characters/cast';
import { EXPRESSIONS, type CharacterId, type Expression } from '../../game/view/characters/design';
import { portraitUrl } from '../../game/view/characters/portraitImage';
import { setLanguage, text } from '../../i18n';
import { STORIES } from '../../ui/story/stories';
import { LivePortrait } from '../LivePortrait';
import { CatalogBar } from './kit';
import '../../styles.css';
import './catalog.css';

/**
 * Catalogo de personajes (T-040, ADR-0023): `npm run dev` y abrir `/catalog/personajes.html`. Cada personaje con el dibujo
 * que usa el juego (`CAST`), sus tres expresiones, quien es, cuando sale y que presenta en cada brote, sacado del guion. Un
 * personaje nuevo tiene que estar en `PEOPLE` (si falta, no compila). No la ve el jugador: sus textos van en espanol sin
 * `src/i18n/`.
 */

const EXPRESSION_NAMES: Record<Expression, string> = { normal: 'Normal', hurried: 'Apurado', happy: 'Contento' };

/** Quien es cada personaje, en pocas lineas (de `docs/specs/04-historia.md`). Un personaje nuevo, aqui. */
const PEOPLE: Record<CharacterId, { readonly role: string; readonly facts: readonly string[] }> = {
  boxer: {
    role: 'El mentor',
    facts: [
      'Era informático: sabe de la IA y de los virus, y cómo combatirlos. Rescata al jugador y le enseña a luchar.',
      'Es la voz de los tours de ayuda: cada cosa nueva la enseña él, con su cara, su nombre y su voz.',
      'En el brote 1 presenta cada desbloqueo ("Toma, esto te va a hacer falta").',
      'Antes de cada jefe cuenta en una línea qué fue el virus de verdad; lo completo va en la ficha del jefe.',
    ],
  },
  patty: {
    role: 'La botánica',
    facts: [
      'Creó las plantas que disparan y cuida el Invernadero, donde asoma junto al menú y a veces dice algo.',
      'Desde el brote 2 presenta cada planta o pieza nueva ("He creado algo nuevo"); Boxer enseña a usarla.',
      'Es la cara del Laboratorio de Patty, donde se fabrican los inventos y se sube el nivel base.',
    ],
  },
};

/** Las viñetas guionizadas en que habla, por secuencia. */
function storyLines(id: CharacterId): string[] {
  return Object.entries(STORIES)
    .map(([story, steps]) => [story, (steps as ReadonlyArray<{ speaker: CharacterId }>).filter((s) => s.speaker === id).length] as const)
    .filter(([, count]) => count > 0)
    .map(([story, count]) => `${story} (${count === 1 ? '1 viñeta' : `${count} viñetas`})`);
}

/** Los brotes en que presenta lo nuevo, y las rondas sueltas en que lo hace en un brote de otro. */
function presents(id: CharacterId): string[] {
  const lines: string[] = [];
  OUTBREAKS.forEach((outbreak, i) => {
    const own = outbreak.presenter === id;
    const rounds = outbreak.rounds.flatMap((round, r) => (round.presenter === id ? [r + 1] : []));
    if (own) lines.push(`Brote ${i + 1}: presenta lo que se desbloquea`);
    else if (rounds.length > 0) lines.push(`Brote ${i + 1}: presenta en ${rounds.length === 1 ? 'la ronda' : 'las rondas'} ${rounds.join(', ')}`);
  });
  return lines;
}

function Person({ id }: { id: CharacterId }) {
  const design = CAST[id];
  const [expression, setExpression] = useState<Expression>('normal');
  const [talking, setTalking] = useState(true);
  const person = PEOPLE[id];
  const lines = storyLines(id);
  const shows = presents(id);
  const { tone } = design;
  const voice = `voice${id[0].toUpperCase()}${id.slice(1)}`;
  return (
    <article className="cat-person" id={id} style={{ '--person': tone.light } as CSSProperties}>
      <div className="cat-person-photo">
        <LivePortrait design={design} expression={expression} talking={talking} height={320} className="cat-person-live" />
        <div className="cat-thumbs">
          {EXPRESSIONS.map((e) => (
            <button key={e} type="button" className={e === expression ? 'is-on' : ''} onClick={() => setExpression(e)}>
              <img src={portraitUrl(design, { expression: e, blink: false, open: false })} alt="" />
              <span>{EXPRESSION_NAMES[e]}</span>
            </button>
          ))}
        </div>
        <label className="cat-check">
          <input type="checkbox" checked={talking} onChange={(event) => setTalking(event.target.checked)} /> Hablando
        </label>
      </div>
      <div className="cat-detail">
        <h2>
          {text().story.names[id]}
          <small>{person.role}</small>
        </h2>
        <ul>
          {person.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <h3>Ficha técnica</h3>
        <dl className="cat-facts">
          <dt>Dibujo</dt>
          <dd>
            {design.label} (<code>{design.id}</code>, en <code>CAST</code>)
          </dd>
          <dt>Colores</dt>
          <dd>
            {(['light', 'mid', 'dark'] as const).map((key) => (
              <span key={key}>
                <span className="cat-swatch" style={{ background: tone[key] }} />
                <code>{tone[key]}</code>{' '}
              </span>
            ))}
          </dd>
          <dt>Voz</dt>
          <dd>
            <code>{voice}</code> en <code>SFX</code>
          </dd>
          <dt>Viñetas</dt>
          <dd>{lines.length > 0 ? lines.join(' · ') : 'ninguna guionizada'}</dd>
          <dt>Presenta</dt>
          <dd>{shows.length > 0 ? shows.join(' · ') : 'nada en los brotes de ahora'}</dd>
        </dl>
        <p className="cat-dim">
          Sus viñetas de verdad a 1600 × 900, 812 × 375 y 568 × 320, en <a href="/proposals/personajes.html?vista=vineta">proposals/personajes → Viñeta</a>.
        </p>
      </div>
    </article>
  );
}

function CharacterCatalog() {
  const ids = Object.keys(CAST) as CharacterId[];
  return (
    <div className="cat">
      <CatalogBar page="characters" />
      <main className="cat-main">
        <p className="cat-intro">
          Los personajes con el dibujo que usa el juego (las propuestas están en <a href="/proposals/personajes.html">proposals/personajes</a>), sus tres
          expresiones y cuándo salen.
        </p>
        {ids.map((id) => (
          <Person key={id} id={id} />
        ))}
      </main>
    </div>
  );
}

setLanguage('es');
createRoot(document.getElementById('root') as HTMLElement).render(<CharacterCatalog />);
