import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { OUTBREAKS } from '../../game/config/balance';
import { CAST } from '../../game/view/characters/cast';
import { AI_COLORS, AI_DESIGN, AI_HEIGHT, paintAiEyes, type AiView } from '../../game/view/cinematic/aiArt';
import { REBELLION } from '../../game/view/cinematic/rebellion';
import { EXPRESSIONS, type CharacterId, type Expression } from '../../game/view/characters/design';
import { portraitUrl } from '../../game/view/characters/portraitImage';
import { setLanguage, text } from '../../i18n';
import { REMARKS } from '../../ui/story/remarks';
import { STORIES } from '../../ui/story/stories';
import { LivePortrait } from '../LivePortrait';
import { CatalogBar } from './kit';
import '../../styles.css';
import './catalog.css';

/**
 * Catalogo de personajes (T-040, ADR-0023): `npm run dev` y abrir `/catalog/personajes.html`. Cada personaje con el dibujo
 * que usa el juego (`CAST`), sus expresiones, quien es, cuando sale y que presenta en cada brote, sacado del guion. Un
 * personaje nuevo tiene que estar en `PEOPLE` (si falta, no compila). No la ve el jugador: sus textos van en espanol sin
 * `src/i18n/`.
 */

const EXPRESSION_NAMES: Record<Expression, string> = { normal: 'Normal', hurried: 'Apurado', happy: 'Contento', doubtful: 'Dudoso' };

/** Quien es cada personaje, en pocas lineas (de `docs/specs/04-historia.md`). Un personaje nuevo, aqui. */
const PEOPLE: Record<CharacterId, { readonly role: string; readonly facts: readonly string[] }> = {
  boxer: {
    role: 'El mentor',
    facts: [
      'Era informático: sabe de la IA y de los virus, y cómo combatirlos. Rescata al jugador y le enseña a luchar.',
      'Es la voz de los tours de ayuda: cada cosa nueva la enseña él, con su cara, su nombre y su voz.',
      'En el brote 1 presenta cada desbloqueo ("Toma, esto te va a hacer falta").',
      'Antes de cada jefe cuenta en una línea qué fue el virus de verdad; lo completo va en la ficha del jefe.',
      'En el brote 4, viendo cómo juega el jugador, propone dejar de esconderse e ir a por la IA (T-043).',
    ],
  },
  patty: {
    role: 'La botánica',
    facts: [
      'Creó las plantas que disparan y cuida el Invernadero, donde asoma junto al menú y a veces dice algo.',
      'Desde el brote 2 presenta cada planta o pieza nueva ("He creado algo nuevo"); Boxer enseña a usarla.',
      'Es la cara del Laboratorio de Patty, donde se fabrican los inventos y se sube el nivel base.',
      'En el brote 4 duda un poco de salir (el refugio es todo lo que tienen), se va convenciendo y cierra con "Nos espera un largo viaje" (T-043).',
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

/** Los comentarios de una linea que dice en la preparacion (T-043), por brote, con sus rondas. */
function remarkLines(id: CharacterId): string[] {
  return OUTBREAKS.flatMap((outbreak, i) => {
    const rounds = (REMARKS[outbreak.id] ?? []).filter((remark) => remark.speaker === id).map((remark) => remark.round + 1);
    return rounds.length > 0 ? [`Brote ${i + 1}: ${rounds.length === 1 ? 'ronda' : 'rondas'} ${rounds.join(', ')}`] : [];
  });
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
  const remarks = remarkLines(id);
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
          <dt>Comentarios</dt>
          <dd>{remarks.length > 0 ? remarks.join(' · ') : 'ninguno'}</dd>
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

/**
 * La IA (T-049): no habla en viñetas, asi que no es un `CharacterId` ni tiene retrato; sale en la cinematica de la
 * rebelion, en silueta. Aqui, su silueta de espaldas y de frente con la propuesta que usa el juego (`AI_DESIGN`).
 */
const AI_PERSON = {
  role: 'La IA, el jefe final',
  facts: [
    'Una IA que se creó para proteger de los virus, los aprendió todos y decidió que el fallo era la humanidad. Recrea en el mundo real los virus de la historia.',
    'Una mujer de figura realista, dibujada solo como silueta oscura. Su pelo largo son cables que caen hasta el suelo y echan raíces: el reflejo oscuro de las plantas.',
    'Ojos de luz verde azulada, el color de los circuitos del suelo corrupto. Tiene cuerpo físico y apenas se mueve.',
    'Se revela por etapas: en silueta cuando Boxer cuenta la rebelión; más cerca cuando empiece el viaje; entera en el combate final.',
    'Aún no tiene nombre (H-03): Boxer la llama «ella».',
  ],
} as const;

function AiSilhouette({ view }: { view: AiView }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const width = 150;
    const height = 240;
    element.width = width * 2;
    element.height = height * 2;
    ctx.scale(2, 2);
    const back = ctx.createRadialGradient(width / 2, height * 0.4, 4, width / 2, height * 0.4, height * 0.7);
    back.addColorStop(0, '#2f6a58');
    back.addColorStop(1, '#0b1216');
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, width, height);
    const scale = (height * 0.86) / AI_HEIGHT;
    ctx.translate(width / 2, height * 0.93);
    ctx.scale(scale, scale);
    const look = { rim: true, glows: true };
    AI_DESIGN.paint(ctx, view, look);
    if (view === 'front') paintAiEyes(ctx, 1, look);
  }, [view]);
  return <canvas ref={canvas} style={{ width: 150, height: 240, borderRadius: 12 }} />;
}

function AiEntry() {
  const shots = REBELLION.shots.filter((shot) => shot.layers.some((layer) => layer.art.startsWith('ai')));
  return (
    <article className="cat-person" id="ai" style={{ '--person': AI_COLORS.light } as CSSProperties}>
      <div className="cat-person-photo" style={{ display: 'flex', gap: 10 }}>
        <AiSilhouette view="back" />
        <AiSilhouette view="front" />
      </div>
      <div className="cat-detail">
        <h2>
          La IA
          <small>{AI_PERSON.role}</small>
        </h2>
        <ul>
          {AI_PERSON.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <h3>Ficha técnica</h3>
        <dl className="cat-facts">
          <dt>Dibujo</dt>
          <dd>
            {AI_DESIGN.label} (<code>{AI_DESIGN.id}</code>, en <code>AI_DESIGN</code>)
          </dd>
          <dt>Colores</dt>
          <dd>
            {(['body', 'cable', 'light'] as const).map((key) => (
              <span key={key}>
                <span className="cat-swatch" style={{ background: AI_COLORS[key] }} />
                <code>{AI_COLORS[key]}</code>{' '}
              </span>
            ))}
          </dd>
          <dt>Sale</dt>
          <dd>
            En la cinemática de la rebelión, al vencer a Creeper por primera vez (T-049): planos {shots.map((shot) => shot.id).join(' y ')}.
          </dd>
          <dt>Habla</dt>
          <dd>No: no tiene viñetas ni voz.</dd>
        </dl>
        <p className="cat-dim">
          Sus tres propuestas y la cinemática entera a 1600 × 900, 812 × 375 y 568 × 320, en <a href="/proposals/cinematica.html">proposals/cinematica</a>.
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
          Los personajes con el dibujo que usa el juego (las propuestas están en <a href="/proposals/personajes.html">proposals/personajes</a>), sus
          expresiones y cuándo salen.
        </p>
        {ids.map((id) => (
          <Person key={id} id={id} />
        ))}
        <AiEntry />
      </main>
    </div>
  );
}

setLanguage('es');
createRoot(document.getElementById('root') as HTMLElement).render(<CharacterCatalog />);
