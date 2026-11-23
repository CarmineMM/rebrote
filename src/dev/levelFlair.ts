import * as Phaser from 'phaser';
import { type Ctx, circle, ellipse, leafShape } from '../game/view/canvasKit';
import type { Effects } from '../game/view/effects';
import { MEDAL_TIERS, medalTier } from '../game/view/levelMedal';
import type { ScreenPoint } from '../game/view/perspective';
import { TEX, artInv } from '../game/view/textures';

/**
 * Propuestas de adorno para los niveles con premio de la disparadora (5, 10, 15 y 20): algo mas vistoso que la
 * medallita, sin tocar el dibujo de la planta. Carmine eligio el jardincito (21 nov 2026), que ya esta en el juego
 * (`src/game/view/levelGarden.ts`) y lo pinta la propia planta. Las otras tres se quedan aqui, solo en la galeria de
 * desarrollo (`/propuestas/disparadoras.html`, vista "Niveles"), para ver como quedarian combinadas con el.
 *
 * El tramo es el de la medallita (`medalTier`): 1 plata (5 a 9), 2 oro (10 a 14), 3 rubi (15 a 19) y 4 cristal (20),
 * con sus mismos colores (`MEDAL_TIERS`). Por debajo del 5 no hay adorno. Todo se mide en anchos de casilla (`w`) y
 * respeta los niveles graficos: brillos aditivos solo con `glows`, destellos solo con `extras`, particulas espaciadas
 * con `ambientDelay`.
 */

export type FlairId = 'aura' | 'garden' | 'fireflies' | 'gems';

export const FLAIRS: ReadonlyArray<{ id: FlairId; name: string; about: string }> = [
  {
    id: 'garden',
    name: 'Jardincito',
    about: 'Elegido y ya en el juego: matas y flores que brotan a los pies y se mecen. Margaritas en el 5, botones de oro en el 10, un arbusto con bayas rojas en el 15 y flores de cristal que destellan en el 20.',
  },
  {
    id: 'aura',
    name: '+ Aura',
    about: 'Círculo de pétalos tumbado en el suelo, bajo la planta, que gira despacio y late. Más pétalos y adornos en cada tramo; en el 15 suben motas y en el 20 cambia de color como un arcoíris.',
  },
  {
    id: 'fireflies',
    name: '+ Luciérnagas',
    about: 'Luciérnagas del color del tramo que dan vueltas a la planta (por delante y por detrás): una en el 5, dos en el 10, tres en el 15 y cuatro en el 20. Se cuentan de un vistazo.',
  },
  {
    id: 'gems',
    name: '+ Gemas',
    about: 'Un corro de piedras alrededor de la planta, cada vez más preciosas y más: guijarros de plata, pepitas de oro, rubíes tallados y cristales que destellan.',
  },
];

/** Tramo del adorno: 0 sin adorno (niveles 1 a 4), 1 a 4 como la medallita. */
export const flairTier = (level: number): number => (level >= 5 ? medalTier(level) : 0);

const hex = (color: string): number => Number.parseInt(color.slice(1), 16);

function rgba(color: string, alpha: number): string {
  const n = hex(color);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Texturas (pixeles de diseno: 160 por casilla, como la disparadora)

const AURA_SIZE = 160;
const FIREFLY = { width: 30, height: 26 } as const;
const GEM = { width: 30, height: 32, footY: 30 } as const;

const flairKey = (kind: string, tier: number, part = '') => `dev-flair-${kind}-${tier}${part}`;

/** Pinta las texturas de los adornos a la resolucion del nivel grafico (llamar despues de `registerTextures`). */
export function registerFlairTextures(scene: Phaser.Scene): void {
  const scale = 1 / artInv();
  const paint = (key: string, width: number, height: number, painter: (ctx: Ctx) => void) => {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, Math.ceil(width * scale), Math.ceil(height * scale));
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.scale(scale, scale);
    painter(ctx);
    texture.refresh();
  };
  for (let tier = 1; tier <= 4; tier++) {
    paint(flairKey('aura', tier), AURA_SIZE, AURA_SIZE, (ctx) => paintAura(ctx, tier));
    paint(flairKey('firefly', tier), FIREFLY.width, FIREFLY.height, (ctx) => paintFirefly(ctx, tier));
    paint(flairKey('gem', tier), GEM.width, GEM.height, (ctx) => paintGem(ctx, tier));
  }
}

/** Aura vista desde arriba (la vista la tumba): disco suave, corona de petalos y, segun el tramo, aros y estrellas. */
function paintAura(ctx: Ctx, tier: number): void {
  const p = MEDAL_TIERS[tier];
  const c = AURA_SIZE / 2;
  const disc = ctx.createRadialGradient(c, c, 4, c, c, c * 0.96);
  disc.addColorStop(0, rgba(p.light, 0.75));
  disc.addColorStop(0.6, rgba(p.mid, 0.45));
  disc.addColorStop(1, rgba(p.mid, 0));
  circle(ctx, c, c, c * 0.96, disc);
  if (tier >= 2) {
    ctx.strokeStyle = rgba(p.outline, 0.7);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(c, c, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = p.light;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  const petals = [0, 6, 8, 10, 12][tier];
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const x = c + Math.cos(a) * 40;
    const y = c + Math.sin(a) * 40;
    leafShape(ctx, x, y, 30 + tier * 2, 11 + tier, a);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * 34, y + Math.sin(a) * 34);
    g.addColorStop(0, p.light);
    g.addColorStop(1, p.mid);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  if (tier >= 3) {
    for (let i = 0; i < 24; i++) {
      const a = ((i + 0.5) / 24) * Math.PI * 2;
      circle(ctx, c + Math.cos(a) * 75, c + Math.sin(a) * 75, 2.8, p.light);
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * 75, c + Math.sin(a) * 75, 2.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (tier === 4) {
    for (let i = 0; i < petals; i++) {
      const a = ((i + 0.5) / petals) * Math.PI * 2;
      star(ctx, c + Math.cos(a) * 58, c + Math.sin(a) * 58, 7, '#ffffff', p.dark);
    }
  }
}

/** Estrella de cuatro puntas. */
function star(ctx: Ctx, x: number, y: number, size: number, fill: string, outline: string): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.34;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Luciernaga: alas claras, cabecita oscura y la barriga que brilla del color del tramo. */
function paintFirefly(ctx: Ctx, tier: number): void {
  const p = MEDAL_TIERS[tier];
  const cx = FIREFLY.width / 2;
  ellipse(ctx, cx - 6, 8, 7, 4.4, 'rgba(255, 255, 255, 0.8)', -0.5);
  ellipse(ctx, cx + 6, 8, 7, 4.4, 'rgba(255, 255, 255, 0.8)', 0.5);
  ctx.strokeStyle = 'rgba(60, 70, 90, 0.6)';
  ctx.lineWidth = 1;
  for (const [dx, rot] of [
    [-6, -0.5],
    [6, 0.5],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, 8, 7, 4.4, rot, 0, Math.PI * 2);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(cx - 2, 15, 1, cx, 16, 8);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, p.light);
  g.addColorStop(1, p.mid);
  circle(ctx, cx, 16, 7.5, g);
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, 16, 7.5, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, cx, 8.5, 3.6, '#2b2a3a');
  circle(ctx, cx + 1.2, 7.6, 1, '#ffffff');
}

/** Gema del corro: guijarro de plata, pepita de oro, rubi tallado o cristales. */
function paintGem(ctx: Ctx, tier: number): void {
  const p = MEDAL_TIERS[tier];
  const cx = GEM.width / 2;
  const y = GEM.footY;
  const fill = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, p.light);
    g.addColorStop(0.5, p.mid);
    g.addColorStop(1, p.dark);
    return g;
  };
  ctx.lineJoin = 'round';
  if (tier === 1) {
    ctx.beginPath();
    ctx.ellipse(cx, y - 7, 12, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill(cx - 10, y - 14, cx + 10, y);
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ellipse(ctx, cx - 4, y - 10, 4, 2, 'rgba(255, 255, 255, 0.8)', -0.3);
    return;
  }
  if (tier === 2) {
    const pts: Array<[number, number]> = [
      [-12, -4],
      [-9, -12],
      [-2, -16],
      [7, -14],
      [12, -7],
      [10, -1],
      [-6, 0],
    ];
    ctx.beginPath();
    pts.forEach(([dx, dy], i) => (i === 0 ? ctx.moveTo(cx + dx, y + dy) : ctx.lineTo(cx + dx, y + dy)));
    ctx.closePath();
    ctx.fillStyle = fill(cx - 10, y - 16, cx + 10, y);
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ellipse(ctx, cx - 3, y - 11, 3.5, 2, 'rgba(255, 255, 255, 0.85)', -0.4);
    circle(ctx, cx + 6, y - 6, 1.4, 'rgba(255, 255, 255, 0.7)');
    return;
  }
  if (tier === 3) {
    // Rubi tallado: corona arriba y pabellon en punta abajo.
    const crown: Array<[number, number]> = [
      [-12, -14],
      [-6, -21],
      [6, -21],
      [12, -14],
      [0, -1],
    ];
    ctx.beginPath();
    crown.forEach(([dx, dy], i) => (i === 0 ? ctx.moveTo(cx + dx, y + dy) : ctx.lineTo(cx + dx, y + dy)));
    ctx.closePath();
    ctx.fillStyle = fill(cx - 12, y - 21, cx + 12, y);
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.strokeStyle = rgba(p.light, 0.8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx - 12, y - 14);
    ctx.lineTo(cx + 12, y - 14);
    ctx.moveTo(cx - 6, y - 21);
    ctx.lineTo(cx - 3, y - 14);
    ctx.lineTo(cx, y - 1);
    ctx.moveTo(cx + 6, y - 21);
    ctx.lineTo(cx + 3, y - 14);
    ctx.lineTo(cx, y - 1);
    ctx.stroke();
    ellipse(ctx, cx - 3, y - 18, 2.6, 1.4, 'rgba(255, 255, 255, 0.9)', 0);
    return;
  }
  // Cristales: tres puntas, la del centro mas alta.
  const shards: Array<[number, number, number, number]> = [
    [-7, 15, 5, -0.3],
    [7, 15, 5, 0.3],
    [0, 24, 6, 0],
  ];
  for (const [dx, height, half, tilt] of shards) {
    ctx.save();
    ctx.translate(cx + dx, y);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(-half, -height * 0.7);
    ctx.lineTo(0, -height);
    ctx.lineTo(half, -height * 0.7);
    ctx.lineTo(half, 0);
    ctx.closePath();
    ctx.fillStyle = fill(-half, -height, half, 0);
    ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-half * 0.4, -2);
    ctx.lineTo(-half * 0.4, -height * 0.68);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Vista

/** Arcoiris suave del tramo maximo: tinte que recorre los colores. */
const rainbow = (t: number): number => Phaser.Display.Color.HSVToRGB(t % 1, 0.32, 1).color as number;

/**
 * Adorno de tramo de una disparadora: se coloca en sus pies (`foot`, en pantalla), a la escala de su casilla (`w`) y
 * alrededor de su profundidad (`depth`: lo de detras por debajo y lo de delante por encima). Aparece con un salto.
 */
export class LevelFlair {
  private readonly parts: Phaser.GameObjects.GameObject[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  /** Tweens de contadores (giro de las luciernagas, arcoiris): no van sobre un objeto de Phaser. */
  private readonly loops: Phaser.Tweens.Tween[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    id: FlairId,
    private readonly tier: number,
    private readonly foot: ScreenPoint,
    private readonly w: number,
    private readonly depth: number,
    private readonly delayMs = 0,
  ) {
    if (tier < 1) return;
    if (id === 'aura') this.aura();
    // El jardincito ya lo pinta la propia planta (`PlantView`, `levelGarden.ts`): aqui no hace falta nada.
    else if (id === 'garden') return;
    else if (id === 'fireflies') this.fireflies();
    else this.gems();
  }

  destroy(): void {
    this.timers.forEach((timer) => timer.remove());
    this.loops.forEach((loop) => loop.remove());
    this.scene.tweens.killTweensOf(this.parts);
    this.parts.forEach((part) => part.destroy());
  }

  private get palette() {
    return MEDAL_TIERS[this.tier];
  }

  private keep<T extends Phaser.GameObjects.GameObject>(part: T): T {
    this.parts.push(part);
    return part;
  }

  /** Brota con un salto hasta su escala. */
  private pop(target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, scaleX: number, scaleY: number, extraDelay = 0): void {
    target.setScale(0, 0);
    this.scene.tweens.add({ targets: target, scaleX, scaleY, delay: this.delayMs + extraDelay, duration: 460, ease: 'Back.Out', easeParams: [2.4] });
  }

  /** Recorre el arcoiris (tramo maximo). */
  private cycleRainbow(targets: Array<Phaser.GameObjects.Components.Tint>): void {
    const counter = { t: Math.random() };
    this.loops.push(
      this.scene.tweens.add({
        targets: counter,
        t: counter.t + 1,
        duration: 5200,
        repeat: -1,
        onUpdate: () => targets.forEach((target) => target.setTint(rainbow(counter.t))),
      }),
    );
  }

  /** Destello que salta cada tanto en un punto al azar (`spot`). Solo con `extras`. */
  private twinkle(everyMs: number, spot: () => ScreenPoint, depth: number): void {
    if (!this.fx.quality.extras) return;
    this.timers.push(
      this.scene.time.addEvent({
        delay: everyMs,
        startAt: Math.random() * everyMs,
        loop: true,
        callback: () => {
          const at = spot();
          const sparkle = this.scene.add
            .image(at.x, at.y, TEX.sparkle)
            .setDepth(depth)
            .setScale(0)
            .setAngle(Phaser.Math.Between(0, 45));
          const size = (this.w / 160) * 0.7 * artInv();
          this.scene.tweens.add({
            targets: sparkle,
            scale: size,
            angle: '+=60',
            duration: 220,
            yoyo: true,
            ease: 'Quad.Out',
            onComplete: () => sparkle.destroy(),
          });
        },
      }),
    );
  }

  /** Aura: circulo de petalos tumbado bajo la planta: gira, late y, desde el 15, suelta motas. */
  private aura(): void {
    const { foot, w, tier } = this;
    const squash = 0.44;
    const size = w * (1.18 + tier * 0.1);
    const holder = this.keep(this.scene.add.container(foot.x, foot.y + w * 0.02).setDepth(this.depth - 0.7));
    if (this.fx.quality.glows) {
      const glow = this.scene.add
        .image(0, 0, TEX.glow)
        .setTint(hex(this.palette.mid))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(size * 1.15, size * 1.15)
        .setAlpha(0.3 + tier * 0.05);
      holder.add(glow);
      this.scene.tweens.add({ targets: glow, alpha: 0.12, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const ring = this.scene.add.image(0, 0, flairKey('aura', tier)).setDisplaySize(size, size);
    holder.add(ring);
    this.pop(holder, 1, squash);
    this.scene.tweens.add({ targets: ring, angle: 360, duration: 26000 - tier * 3500, repeat: -1 });
    this.scene.tweens.add({ targets: ring, alpha: 0.78, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (tier === 4) this.cycleRainbow([ring]);
    if (tier >= 3) {
      this.timers.push(
        this.scene.time.addEvent({
          delay: this.fx.ambientDelay(380),
          loop: true,
          callback: () => {
            const a = Math.random() * Math.PI * 2;
            const x = foot.x + Math.cos(a) * size * 0.4;
            const y = foot.y + Math.sin(a) * size * 0.4 * squash;
            const mote = this.scene.add
              .image(x, y, TEX.dot)
              .setTint(tier === 4 ? rainbow(Math.random()) : hex(this.palette.light))
              .setScale(0.4 * artInv())
              .setDepth(Math.sin(a) > 0 ? this.depth + 0.4 : this.depth - 0.6);
            if (this.fx.quality.glows) mote.setBlendMode(Phaser.BlendModes.ADD);
            this.scene.tweens.add({ targets: mote, y: y - w * 0.45, alpha: 0, scale: 0.15 * artInv(), duration: 1100, ease: 'Sine.Out', onComplete: () => mote.destroy() });
          },
        }),
      );
    }
  }

  /** Luciernagas que dan vueltas a la planta: una por tramo, por delante y por detras. */
  private fireflies(): void {
    const { foot, w, tier } = this;
    const center = { x: foot.x, y: foot.y - w * 0.5 };
    const radius = { x: w * 0.56, y: w * 0.16 };
    const scale = (w / 160) * artInv() * 1.75;
    const bugs = Array.from({ length: tier }, (_v, i) => {
      const glow = this.fx.quality.glows
        ? this.keep(
            this.scene.add
              .image(0, 0, TEX.glow)
              .setTint(hex(this.palette.mid))
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDisplaySize(w * 0.55, w * 0.55)
              .setAlpha(0.8),
          )
        : null;
      const bug = this.keep(this.scene.add.image(0, 0, flairKey('firefly', tier)).setScale(0));
      this.scene.tweens.add({ targets: bug, scale, delay: this.delayMs + i * 120, duration: 400, ease: 'Back.Out' });
      if (glow) this.scene.tweens.add({ targets: glow, alpha: 0.3, duration: 500 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      return { bug, glow, phase: (i / tier) * Math.PI * 2 };
    });
    if (tier === 4) this.cycleRainbow(bugs.flatMap(({ bug, glow }) => (glow ? [bug, glow] : [bug])));
    const clock = { t: 0 };
    const place = () => {
      for (const { bug, glow, phase } of bugs) {
        const a = clock.t + phase;
        const x = center.x + Math.cos(a) * radius.x;
        const y = center.y + Math.sin(a) * radius.y + Math.sin(a * 3) * w * 0.035;
        const front = Math.sin(a) > 0;
        const depth = front ? this.depth + 0.4 : this.depth - 0.4;
        bug.setPosition(x, y).setDepth(depth).setFlipX(Math.cos(a) < 0 === front);
        glow?.setPosition(x, y + w * 0.02).setDepth(depth - 0.01);
      }
    };
    place();
    this.loops.push(this.scene.tweens.add({ targets: clock, t: Math.PI * 2, duration: 3600, repeat: -1, onUpdate: place }));
  }

  /** Corro de gemas alrededor de la planta: mas y mas preciosas en cada tramo, con destellos. */
  private gems(): void {
    const { foot, w, tier } = this;
    const count = 3 + tier;
    const radius = { x: w * 0.5, y: w * 0.16 };
    const base = (w / 160) * artInv() * (tier === 4 ? 1.45 : 1.5 + tier * 0.08);
    const spots: ScreenPoint[] = [];
    for (let i = 0; i < count; i++) {
      // Ninguna justo delante del centro: tapan menos la base de la planta.
      const a = Math.PI / 2 + Math.PI / count + (i / count) * Math.PI * 2;
      const front = Math.sin(a) > 0.05;
      const x = foot.x + Math.cos(a) * radius.x;
      const y = foot.y + Math.sin(a) * radius.y;
      spots.push({ x, y });
      if (this.fx.quality.glows && tier >= 3) {
        const glow = this.keep(
          this.scene.add
            .image(x, y - w * 0.05, TEX.glow)
            .setTint(hex(this.palette.mid))
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDisplaySize(w * 0.3, w * 0.3)
            .setAlpha(0.5)
            .setDepth(front ? this.depth + 0.29 : this.depth - 0.61),
        );
        this.scene.tweens.add({ targets: glow, alpha: 0.15, duration: 900 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      const gem = this.keep(
        this.scene.add
          .image(x, y, flairKey('gem', tier))
          .setOrigin(0.5, GEM.footY / GEM.height)
          .setDepth(front ? this.depth + 0.3 : this.depth - 0.6)
          .setFlipX(i % 2 === 1),
      );
      const scale = base * (front ? 1 : 0.86);
      this.pop(gem, i % 2 === 1 ? -scale : scale, scale, i * 70);
      if (tier === 4) this.cycleRainbow([gem]);
    }
    this.twinkle(tier >= 3 ? 700 : 1300, () => {
      const spot = spots[Math.floor(Math.random() * spots.length)];
      return { x: spot.x + Phaser.Math.FloatBetween(-0.04, 0.04) * w, y: spot.y - w * 0.08 };
    }, this.depth + 0.5);
  }
}
