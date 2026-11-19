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
