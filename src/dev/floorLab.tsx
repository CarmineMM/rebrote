import * as Phaser from 'phaser';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FLOOR } from '../game/view/boardFloor';
import { FLOOR_DESIGNS, FLOOR_NAMES } from '../game/view/floors/catalog';
import { FLOOR_GRIDS, type FloorGrid } from '../game/view/floors/design';
import { viewFor } from '../game/view/layout';
import { QUALITY_LEVELS, QUALITY_PROFILES, type QualityLevel } from '../game/view/quality';
import { setLanguage } from '../i18n';
import { FLOOR_EFFECTS, FLOOR_LAB, FloorLabScene, type FloorLabData, type FloorMarks } from './floorLabScene';
import './shooterLab.css';

/**
 * Galeria de los suelos del tablero (T-050, fase 1): `npm run dev` y abrir `/proposals/suelo.html`. El suelo de siempre y las
 * propuestas (A bancales, B patio, C raices, D, C con otros colores, y E, la placa reconquistada) en el jardin de verdad, con lo que mas depende del suelo encima y botones
 * para los efectos; con las columnas insinuadas o a la vista (SU-03), a 1600 x 900, 812 x 375 y 568 x 320, y en miniatura,
 * como se ve al compartir una captura. No la ve el jugador (`npm run build` no la incluye), asi que sus textos van en
 * espanol sin `src/i18n/`.
 *
 * En la direccion: `?suelo=beds` (o `patio`, `roots`, `sunnyRoots`, `reclaimed`, `legacy`), `&columnas=shown`, `&tam=812` (o `568`, `1600`) y
 * `&calidad=low` (o `medium`, `high`, `ultra`) abren la galeria asi.
 */

const QUALITY_NAMES: Record<QualityLevel, string> = { low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra' };
const GRID_NAMES: Record<FloorGrid, string> = { hinted: 'Columnas insinuadas', shown: 'Columnas a la vista' };
const MARK_NAMES: Record<FloorMarks, string> = { off: 'Sin resaltes', sow: 'Resalte de sembrar', all: 'Todos los resaltes' };

type StageSize = 'fill' | '1600' | '812' | '568';
const SIZES: ReadonlyArray<{ id: StageSize; label: string; width?: number; height?: number }> = [
  { id: 'fill', label: 'Toda la ventana' },
  { id: '1600', label: '1600 × 900', width: 1600, height: 900 },
  { id: '812', label: '812 × 375', width: 812, height: 375 },
  { id: '568', label: '568 × 320', width: 568, height: 320 },
];
/** Miniatura al compartir una captura del juego (T-050): la de una vista previa de enlace y la de un chat. */
const THUMBS = [
  { width: 320, height: 180 },
  { width: 160, height: 90 },
] as const;

const params = new URLSearchParams(location.search);
const pickParam = <T extends string>(name: string, allowed: readonly T[], fallback: T): T => {
  const value = params.get(name) as T | null;
  return value && allowed.includes(value) ? value : fallback;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function FloorLab() {
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const [floor, setFloor] = useState(() => pickParam('suelo', FLOOR_DESIGNS.map((f) => f.id), FLOOR_DESIGNS[1].id));
  const [grid, setGrid] = useState<FloorGrid>(() => pickParam('columnas', FLOOR_GRIDS, 'hinted'));
  const [quality, setQuality] = useState<QualityLevel>(() => pickParam('calidad', QUALITY_LEVELS, 'high'));
  const [size, setSize] = useState<StageSize>(() => pickParam('tam', SIZES.map((s) => s.id), 'fill'));
  const [marks, setMarks] = useState<FloorMarks>('off');
  const [shooting, setShooting] = useState(true);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const scene = () => game.current?.scene.getScene(FLOOR_LAB) as FloorLabScene | undefined;
  const sceneData = (next: Partial<FloorLabData> = {}): FloorLabData => ({ quality, floor, grid, marks, shooting, ...next });

  // El marco del tamano elegido.
  useLayoutEffect(() => {
    const measure = () => {
      const bounds = stage.current?.getBoundingClientRect();
      if (!bounds) return;
      const chosen = SIZES.find((s) => s.id === size);
      if (!chosen?.width || !chosen.height) {
        setFrame({ width: Math.floor(bounds.width), height: Math.floor(bounds.height) });
        return;
      }
      // Los del movil, siempre a su tamano (si no caben, la pagina se desplaza); 1600 x 900, lo mas grande que quepa.
      const fit = chosen.id === '1600' ? Math.min(1, bounds.width / chosen.width, bounds.height / chosen.height) : 1;
      setFrame({ width: Math.floor(chosen.width * fit), height: Math.floor(chosen.height * fit) });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [size]);

  // El juego se crea con su nivel grafico y su tamano; cambiarlos lo vuelve a crear, como en el juego.
  useEffect(() => {
    const parent = host.current;
    if (!parent || !frame) return;
    const { renderScale } = QUALITY_PROFILES[quality];
    const fit = viewFor(frame.width / frame.height);
    const created = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: Math.max(1, Math.round(fit.width * renderScale)),
      height: Math.max(1, Math.round(fit.height * renderScale)),
      backgroundColor: '#1d2b1f',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { powerPreference: 'high-performance' },
      audio: { noAudio: true },
    });
    created.scene.add(FLOOR_LAB, FloorLabScene, true, sceneData());
    game.current = created;
    (window as unknown as { __floorLab?: Phaser.Game }).__floorLab = created;
    return () => {
      created.destroy(true);
      game.current = null;
    };
    // Solo con la calidad y el tamano: lo demas reinicia la escena sin recrear el juego.
  }, [quality, frame?.width, frame?.height]);

  const show = (next: Partial<FloorLabData>) => {
    if (next.floor) setFloor(next.floor);
    if (next.grid) setGrid(next.grid);
    scene()?.scene.restart(sceneData(next));
  };

  const pickMarks = (next: FloorMarks) => {
    setMarks(next);
    scene()?.setMarks(next);
  };

  const toggleShooting = () => {
    setShooting(!shooting);
    scene()?.setShooting(!shooting);
  };

  /** Una miniatura de cada suelo: lo ensena un momento, saca una foto del lienzo y la reduce al tamano de compartir. */
  const takeThumbs = async () => {
    const g = game.current;
    if (!g || busy) return;
    setBusy(true);
    const taken: Record<string, string> = {};
    for (const design of FLOOR_DESIGNS) {
      scene()?.scene.restart(sceneData({ floor: design.id, marks: 'off' }));
      await sleep(3500);
      const image = await new Promise<HTMLImageElement>((resolve) => g.renderer.snapshot((snap) => resolve(snap as HTMLImageElement)));
      const canvas = document.createElement('canvas');
      canvas.width = THUMBS[0].width;
      canvas.height = THUMBS[0].height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      // Recorte a 16:9 desde el centro, como una captura del juego.
      const aspect = THUMBS[0].width / THUMBS[0].height;
      const sw = Math.min(image.width, image.height * aspect);
      const sh = sw / aspect;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
      taken[design.id] = canvas.toDataURL('image/png');
      setThumbs({ ...taken });
    }
    scene()?.scene.restart(sceneData());
    setBusy(false);
  };

  const legacy = floor === 'legacy';
  const stageFrame = frame ? { width: frame.width, height: frame.height } : undefined;

  return (
    <div className="lab floor-lab">
      <header className="lab-bar">
        <h1>
          Suelo del tablero <span>T-050, solo desarrollo</span>
        </h1>
        <nav className="lab-tabs">
          {FLOOR_DESIGNS.map((design) => (
            <button key={design.id} className={design.id === floor ? 'is-on' : ''} onClick={() => show({ floor: design.id })}>
              {FLOOR_NAMES[design.id].letter} · {FLOOR_NAMES[design.id].name}
              {design.id === FLOOR.id ? ' (en el juego)' : ''}
            </button>
          ))}
        </nav>
        <nav className="lab-tabs">
          {FLOOR_GRIDS.map((g) => (
            <button key={g} className={g === grid ? 'is-on' : ''} disabled={legacy} onClick={() => show({ grid: g })} title="SU-03">
              {GRID_NAMES[g]}
            </button>
          ))}
        </nav>
        <div className="lab-tools">
          <select value={size} onChange={(event) => setSize(event.target.value as StageSize)} title="Tamaño de pantalla">
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={quality} onChange={(event) => setQuality(event.target.value as QualityLevel)} title="Nivel gráfico">
            {QUALITY_LEVELS.map((q) => (
              <option key={q} value={q}>
                {QUALITY_NAMES[q]}
              </option>
            ))}
          </select>
        </div>
        <div className="lab-actions">
          <button className={shooting ? 'is-on' : ''} onClick={toggleShooting}>
            Disparar
          </button>
          <select value={marks} onChange={(event) => pickMarks(event.target.value as FloorMarks)} title="Resaltes de casilla">
            {(Object.keys(MARK_NAMES) as FloorMarks[]).map((m) => (
              <option key={m} value={m}>
                {MARK_NAMES[m]}
              </option>
            ))}
          </select>
          {FLOOR_EFFECTS.map(([id, name]) => (
            <button key={id} onClick={() => scene()?.launch(id)}>
              {name}
            </button>
          ))}
          <button onClick={takeThumbs} disabled={busy}>
            {busy ? 'Haciendo miniaturas…' : 'Miniaturas de todos'}
          </button>
        </div>
      </header>
      <div className="floor-stage" ref={stage} style={size === '812' || size === '568' ? { flex: 'none', minHeight: (frame?.height ?? 0) + 24 } : undefined}>
        <div className="floor-frame" ref={host} style={stageFrame} />
      </div>
      <footer className="lab-notes">
        {FLOOR_DESIGNS.map((design) => (
          <p key={design.id}>
            <b>
              {FLOOR_NAMES[design.id].letter} · {FLOOR_NAMES[design.id].name}.
            </b>{' '}
            {FLOOR_NAMES[design.id].idea}
          </p>
        ))}
        {Object.keys(thumbs).length > 0 && (
          <div className="floor-thumbs">
            {FLOOR_DESIGNS.filter((design) => thumbs[design.id]).map((design) => (
              <figure key={design.id}>
                <img src={thumbs[design.id]} width={THUMBS[0].width} height={THUMBS[0].height} alt={FLOOR_NAMES[design.id].name} />
                <img src={thumbs[design.id]} width={THUMBS[1].width} height={THUMBS[1].height} alt="" />
                <figcaption>
                  {FLOOR_NAMES[design.id].letter} · {FLOOR_NAMES[design.id].name}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <p className="lab-ask">
          SU-02: ¿cuál pasa a la fase 2 (A, B, C, D, E, una mezcla o ninguna)? SU-03: ¿columnas insinuadas o a la vista? Qué mirar: que los cinco carriles se
          distingan de un vistazo (también en «Bajo» y a 568 × 320), que se sepa en qué casilla cae una planta con el resalte de sembrar, y que la llamarada y
          el chamuscado, la escarcha, el escupitajo, el verso, la moneda, el Lurker oculto, la sombra del Skipper y la tropa teñida se lean igual o mejor que
          sobre el césped. Las miniaturas son la prueba de la captura: enseñarlas a alguien ajeno al proyecto y preguntarle a qué juego le recuerdan.
        </p>
      </footer>
    </div>
  );
}

setLanguage('es');
createRoot(document.getElementById('root')!).render(<FloorLab />);
