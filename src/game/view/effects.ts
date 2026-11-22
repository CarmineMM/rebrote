import * as Phaser from 'phaser';
import { DEPTH } from './layout';
import type { QualityProfile } from './quality';
import { TEX, artInv } from './textures';

/**
 * Efectos de respuesta compartidos por la escena y las vistas de plantas, gusanos y balas:
 * rafagas de particulas, anillos, destellos y textos flotantes. Todo con el reloj y los tweens
 * de la escena (la pausa lo congela) y enganchado al nivel grafico (ADR-0006).
 */
export interface FloatTextOptions {
  color?: string;
  stroke?: string;
  fontSize?: number;
}

const TEXT_STYLE = {
  fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif',
  fontSize: '30px',
  fontStyle: '900',
  color: '#ffe066',
  stroke: '#5a3d00',
  strokeThickness: 6,
} as const;

/** Mezcla dos colores 0xRRGGBB: `t` = 0 da `from`, 1 da `to`. */
export function mixColor(from: number, to: number, t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  const channel = (shift: number) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * k) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

export class Effects {
  private readonly dirtBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly sparkleBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly leafBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly bitBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly juiceBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly fireBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly emberBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smokeBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly frostBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly shardBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly mistBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly flakeDrift: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly gooBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly scrapBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly barkBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly noteBurst: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly quality: QualityProfile,
  ) {
    const burst = (texture: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, depth: number) =>
      scene.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(depth);

    this.dirtBurst = burst(
      TEX.dirt,
      {
        speed: { min: 70, max: 190 },
        angle: { min: -160, max: -20 },
        gravityY: 520,
        lifespan: 650,
        scale: { start: artInv(), end: 0.3 * artInv() },
        alpha: { start: 1, end: 0 },
      },
      DEPTH.foreground - 1,
    );
    this.sparkleBurst = burst(
      TEX.dot,
      {
        speed: { min: 60, max: 180 },
        lifespan: 550,
        scale: { start: 0.9 * artInv(), end: 0 },
        tint: [0xffe680, 0xffffff, 0xfff1a8],
        blendMode: Phaser.BlendModes.ADD,
      },
      DEPTH.floatText - 1,
    );
    // Hojas que saltan de una planta mordida o destruida.
    this.leafBurst = burst(
      TEX.leaf,
      {
        speed: { min: 70, max: 200 },
        angle: { min: -170, max: -10 },
        gravityY: 420,
        rotate: { min: -180, max: 180 },
        lifespan: { min: 500, max: 800 },
        scale: { start: 0.9 * artInv(), end: 0.4 * artInv() },
        alpha: { start: 1, end: 0, ease: 'Quad.In' },
        tint: [0xffffff, 0xe0ffb0, 0xb8e890],
      },
      DEPTH.foreground - 1,
    );
    // Pixeles verdes y morados: un gusano que se deshace en datos.
    this.bitBurst = burst(
      TEX.pixel,
      {
        speed: { min: 70, max: 230 },
        gravityY: 260,
        rotate: { min: 0, max: 90 },
        lifespan: { min: 450, max: 850 },
        scale: { start: 1.6 * artInv(), end: 0.2 * artInv() },
        alpha: { start: 1, end: 0 },
        tint: [0x39ff88, 0xb48cff, 0x7dffc0, 0xe3c4ff],
        blendMode: quality.glows ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
      },
      DEPTH.foreground - 1,
    );
    // Jugo de semilla al impactar.
    this.juiceBurst = burst(
      TEX.dot,
      {
        speed: { min: 40, max: 150 },
        gravityY: 300,
        lifespan: { min: 220, max: 380 },
        scale: { start: 0.55 * artInv(), end: 0 },
        tint: [0xd6ff96, 0x9be36c, 0xffffff],
      },
      DEPTH.foreground - 1,
    );
    // Fuego (T-004): llamas que saltan y suben, brasas que flotan y humo que se abre. Las llamas van con mezcla
    // normal: aditivas, sobre el cesped claro se quedarian blancas. Las brasas, pequenas, si brillan.
    const emberBlend = quality.glows ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL;
    this.fireBurst = burst(
      TEX.flame,
      {
        speed: { min: 60, max: 240 },
        angle: { min: -175, max: -5 },
        gravityY: -160,
        lifespan: { min: 320, max: 620 },
        scale: { start: 1.1 * artInv(), end: 0.2 * artInv() },
        alpha: { start: 1, end: 0 },
        tint: [0xffffff, 0xffe0a0, 0xffc080],
      },
      DEPTH.foreground - 1,
    );
    this.emberBurst = burst(
      TEX.dot,
      {
        speed: { min: 15, max: 90 },
        angle: { min: -130, max: -50 },
        gravityY: -70,
        lifespan: { min: 550, max: 1100 },
        scale: { start: 0.45 * artInv(), end: 0 },
        tint: [0xffd166, 0xff8a3d, 0xffb35c, 0xfff1a8],
        blendMode: emberBlend,
      },
      DEPTH.foreground - 1,
    );
    this.smokeBurst = burst(
      TEX.glow,
      {
        speed: { min: 15, max: 70 },
        angle: { min: -120, max: -60 },
        gravityY: -40,
        lifespan: { min: 700, max: 1200 },
        scale: { start: 0.25 * artInv(), end: 0.75 * artInv() },
        alpha: { start: 0.5, end: 0 },
        tint: [0x4f4440, 0x6b5a55, 0x3e3431],
      },
      DEPTH.foreground - 2,
    );
    // Hielo (T-005): copos que saltan y caen despacio, esquirlas que caen deprisa y vaho frio. Todo con mezcla
    // normal y colores con algo de azul: sobre el cesped claro, lo aditivo o lo muy palido se quedaria blanco.
    this.frostBurst = burst(
      TEX.snowflake,
      {
        speed: { min: 50, max: 190 },
        angle: { min: -175, max: -5 },
        gravityY: 140,
        rotate: { min: -180, max: 180 },
        lifespan: { min: 550, max: 950 },
        scale: { start: 0.95 * artInv(), end: 0.3 * artInv() },
        alpha: { start: 1, end: 0, ease: 'Quad.In' },
      },
      DEPTH.foreground - 1,
    );
    this.shardBurst = burst(
      TEX.pixel,
      {
        speed: { min: 80, max: 260 },
        angle: { min: -170, max: -10 },
        gravityY: 560,
        rotate: { min: 0, max: 180 },
        lifespan: { min: 380, max: 700 },
        scale: { start: 1.5 * artInv(), end: 0.3 * artInv() },
        alpha: { start: 1, end: 0 },
        tint: [0xffffff, 0xa8e4ff, 0x6cbce8, 0x3f92d0],
      },
      DEPTH.foreground - 1,
    );
    this.mistBurst = burst(
      TEX.glow,
      {
        speed: { min: 15, max: 80 },
        angle: { min: -160, max: -20 },
        gravityY: -20,
        lifespan: { min: 650, max: 1100 },
        scale: { start: 0.3 * artInv(), end: 0.85 * artInv() },
        alpha: { start: 0.55, end: 0 },
        tint: [0xc8ecff, 0xa8dcff, 0xe0f6ff],
      },
      DEPTH.foreground - 2,
    );
    this.flakeDrift = burst(
      TEX.snowflake,
      {
        speedX: { min: -14, max: 14 },
        speedY: { min: 4, max: 18 },
        gravityY: 22,
        rotate: { start: 0, end: 160 },
        lifespan: { min: 1100, max: 1600 },
        scale: { start: 0.65 * artInv(), end: 0.25 * artInv() },
        alpha: { start: 1, end: 0, ease: 'Quad.In' },
      },
      DEPTH.foreground - 1,
    );
    // Escupidor (T-007): gotas de moco verde que salpican al escupir y al dar. Mezcla normal y un verde con algo
    // de oscuro: sobre el cesped, lo aditivo se quedaria blanco.
    this.gooBurst = burst(
      TEX.dot,
      {
        speed: { min: 50, max: 180 },
        angle: { min: -170, max: -10 },
        gravityY: 480,
        lifespan: { min: 300, max: 560 },
        scale: { start: 0.7 * artInv(), end: 0.15 * artInv() },
        tint: [0x39ff88, 0x1fc76a, 0x9dffc8, 0x0f8a46],
      },
      DEPTH.foreground - 1,
    );
    // Acorazado (T-007): esquirlas de acero y chispitas cuando una semilla le da en la armadura o pierde una placa.
    this.scrapBurst = burst(
      TEX.pixel,
      {
        speed: { min: 60, max: 210 },
        angle: { min: -165, max: -15 },
        gravityY: 620,
        rotate: { min: 0, max: 180 },
        lifespan: { min: 280, max: 520 },
        scale: { start: 1.1 * artInv(), end: 0.25 * artInv() },
        alpha: { start: 1, end: 0 },
        tint: [0xf5f9fd, 0xb4c5d6, 0x6d8399, 0xffe680],
      },
      DEPTH.foreground - 1,
    );
    // Escudo (T-024): astillas de corteza que saltan del muro mordido, de la placa que pierde y del muro que se parte.
    // Mezcla normal: son de madera, no brillan.
    this.barkBurst = burst(
      TEX.barkChip,
      {
        speed: { min: 60, max: 200 },
        angle: { min: -165, max: -15 },
        gravityY: 600,
        rotate: { min: -180, max: 180 },
        lifespan: { min: 380, max: 700 },
        scale: { start: 0.9 * artInv(), end: 0.45 * artInv() },
        alpha: { start: 1, end: 0, ease: 'Quad.In' },
        tint: [0xffffff, 0xf0dcc0, 0xd8b890],
      },
      DEPTH.foreground - 1,
    );
    // Juglar (T-025): notas que salen de su boca al recitar, que suelta el verso al pasar por una planta y que se
    // desparraman al chocar con un escudo. Mezcla normal y contorno oscuro: se leen sobre el cesped.
    this.noteBurst = burst(
      TEX.note,
      {
        speed: { min: 40, max: 150 },
        angle: { min: -160, max: -20 },
        gravityY: -70,
        rotate: { min: -25, max: 25 },
        lifespan: { min: 520, max: 900 },
        scale: { start: 0.95 * artInv(), end: 0.5 * artInv() },
        alpha: { start: 1, end: 0, ease: 'Quad.In' },
        tint: [0xffffff, 0xffe6a8, 0xffc2ee],
      },
      DEPTH.foreground - 1,
    );
  }

  /** Particulas de respuesta a una accion: menos en Bajo, pero nunca ninguna (son parte del gesto). */
  count(base: number): number {
    return Math.max(3, Math.round(base * Math.min(1.5, this.quality.particles)));
  }

  dirt(x: number, y: number, base: number): void {
    this.dirtBurst.explode(this.count(base), x, y);
  }

  sparkles(x: number, y: number, base: number): void {
    this.sparkleBurst.explode(this.count(base), x, y);
  }

  leaves(x: number, y: number, base: number): void {
    this.leafBurst.explode(this.count(base), x, y);
  }

  bits(x: number, y: number, base: number): void {
    this.bitBurst.explode(this.count(base), x, y);
  }

  juice(x: number, y: number, base: number): void {
    this.juiceBurst.explode(this.count(base), x, y);
  }

  fire(x: number, y: number, base: number): void {
    this.fireBurst.explode(this.count(base), x, y);
  }

  embers(x: number, y: number, base: number): void {
    this.emberBurst.explode(this.count(base), x, y);
  }

  smoke(x: number, y: number, base: number): void {
    this.smokeBurst.explode(this.count(base), x, y);
  }

  /** Copos que saltan: mina de hielo, infundir hielo, impacto de una semilla de hielo. */
  frost(x: number, y: number, base: number): void {
    this.frostBurst.explode(this.count(base), x, y);
  }

  /** Esquirlas de hielo que caen: una mina de hielo que estalla o un gusano congelado que se rompe. */
  shards(x: number, y: number, base: number): void {
    this.shardBurst.explode(this.count(base), x, y);
  }

  /** Vaho frio que se abre y se desvanece. */
  mist(x: number, y: number, base: number): void {
    this.mistBurst.explode(this.count(base), x, y);
  }

  /**
   * Un solo copo que cae despacio, para lo que esta frio en reposo (disparadora de hielo, gusano ralentizado,
   * mina de hielo armada). Es ambiente: quien lo llama lo espacia con `ambientDelay`.
   */
  flake(x: number, y: number): void {
    this.flakeDrift.explode(1, x, y);
  }

  /**
   * Una sola brasa, para lo que arde en reposo (disparadora de fuego, gusano quemado). Es ambiente, no respuesta:
   * quien la llama la espacia con `ambientDelay`, asi que en Bajo salen menos.
   */
  ember(x: number, y: number): void {
    this.emberBurst.explode(1, x, y);
  }

  /** Salpicadura de moco verde: el escupidor escupe o su escupitajo da a una planta (T-007). */
  goo(x: number, y: number, base: number): void {
    this.gooBurst.explode(this.count(base), x, y);
  }

  /** Esquirlas de acero: una semilla rebota en la armadura del acorazado o se le cae una placa (T-007). */
  scrap(x: number, y: number, base: number): void {
    this.scrapBurst.explode(this.count(base), x, y);
  }

  /** Astillas de corteza: un mordisco o un escupitajo que da a un escudo, o el muro que pierde placas o se rompe (T-024). */
  bark(x: number, y: number, base: number): void {
    this.barkBurst.explode(this.count(base), x, y);
  }

  /** Notas musicales que suben: el juglar recita, su verso pasa por una planta o choca con un escudo (T-025). */
  notes(x: number, y: number, base: number): void {
    this.noteBurst.explode(this.count(base), x, y);
  }

  /** Una nota suelta que sube: la estela del verso en vuelo (T-025). Ambiental: su ritmo va con `ambientDelay`. */
  note(x: number, y: number): void {
    this.noteBurst.explode(1, x, y);
  }

  /** Espera entre particulas ambientales: `base` en Alto, mas larga en Bajo (ADR-0006). */
  ambientDelay(base: number): number {
    return base / this.quality.particles;
  }

  /**
   * Anillo tumbado en el suelo: crece hasta `width` x `height` (la perspectiva lo aplasta) y se desvanece.
   * Para ondas expansivas que deben verse sobre el cesped.
   */
  groundRing(x: number, y: number, width: number, height: number, tint: number, depth: number, durationMs = 380, alpha = 0.9): void {
    const ring = this.scene.add.image(x, y, TEX.ring).setTint(tint).setDepth(depth).setAlpha(alpha);
    ring.setDisplaySize(width * 0.25, height * 0.25);
    this.scene.tweens.add({
      targets: ring,
      displayWidth: width,
      displayHeight: height,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
  }

  /** Anillo que crece y se desvanece en el sitio: impactos, fogonazos y salidas. */
  ring(x: number, y: number, size: number, tint: number, depth: number, durationMs = 240, alpha = 0.9): void {
    const ring = this.scene.add.image(x, y, TEX.ring).setTint(tint).setDepth(depth).setAlpha(alpha);
    ring.setDisplaySize(size * 0.35, size * 0.35);
    this.scene.tweens.add({
      targets: ring,
      displayWidth: size,
      displayHeight: size,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });
  }

  /** Destello aditivo breve. Solo con brillos (Medio en adelante). */
  glow(x: number, y: number, size: number, tint: number, depth: number, durationMs = 260): void {
    if (!this.quality.glows) return;
    const glow = this.scene.add
      .image(x, y, TEX.glow)
      .setDisplaySize(size, size)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85)
      .setDepth(depth);
    this.scene.tweens.add({ targets: glow, alpha: 0, duration: durationMs, ease: 'Quad.Out', onComplete: () => glow.destroy() });
  }

  /** Estilo de texto de la escena. Con la camara ampliada se rasteriza a la misma resolucion para que no se vea borroso. */
  textStyle(options: FloatTextOptions = {}): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      ...TEXT_STYLE,
      ...(options.fontSize ? { fontSize: `${options.fontSize}px` } : {}),
      ...(options.color ? { color: options.color } : {}),
      ...(options.stroke ? { stroke: options.stroke } : {}),
      resolution: this.quality.renderScale,
    };
  }

  /** Texto que salta, sube y se desvanece (+25, -1 ♥...). */
  floatText(text: string, x: number, y: number, options: FloatTextOptions = {}): void {
    const label = this.scene.add.text(x, y, text, this.textStyle(options)).setOrigin(0.5).setScale(0.4).setDepth(DEPTH.floatText);
    this.scene.tweens.add({ targets: label, scale: 1, duration: 220, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: label,
      y: y - 70,
      alpha: 0,
      delay: 250,
      duration: 750,
      ease: 'Quad.In',
      onComplete: () => label.destroy(),
    });
  }
}
