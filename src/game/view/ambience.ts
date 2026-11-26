import * as Phaser from 'phaser';
import { BOARD } from '../config/balance';
import { DEPTH, SCENERY, VIEW, WORLD, entityDepth, perspective } from './layout';
import type { QualityProfile } from './quality';
import { CANOPY, CORRUPTION_GLOW_AREA, LAND_TOP, SKYLINE_LIGHTS, TEX, artInv, artInvOf, seededRandom } from './textures';

/**
 * Todo lo que se mueve en el escenario (ADR-0004): sol, nubes, pajaros, arbol, viento sobre el cesped,
 * polen, hojas, mariposas, flores, luces de la ciudad y el suelo corrupto que late.
 * Cuanto se pinta depende del nivel grafico (ADR-0006). Es solo decorado: no toca reglas ni estado.
 */
export interface Ambience {
  update(deltaMs: number): void;
}

interface Drifter {
  image: Phaser.GameObjects.Image;
  speed: number;
  /** Rango vertical donde reaparece al dar la vuelta. */
  minY: number;
  maxY: number;
}

type TweenProps = Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>;

const P = (x: number, y: number) => perspective.toScreen({ x, y });

/** Zona rectangular de pantalla para emitir particulas. */
const rectZone = (x: number, y: number, width: number, height: number) => ({
  type: 'random',
  source: {
    getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
      point.x = x + Math.random() * width;
      point.y = y + Math.random() * height;
    },
  },
});

/** Va y vuelve sin parar: el gesto basico de todo lo que respira en la escena. */
function breathe(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, props: TweenProps): void {
  scene.tweens.add({ yoyo: true, repeat: -1, ease: 'Sine.InOut', ...props, targets: target });
}

/** Cantidad de cosas segun el nivel, sin bajar de `min`. */
const amount = (base: number, factor: number, min = 1) => Math.max(min, Math.round(base * factor));

/** Lo que cambia el escenario de siempre. */
export interface AmbienceOptions {
  /**
   * Textura del terreno: sin ella, la del juego (`TEX.land`). La galeria de los suelos (T-050, `/proposals/suelo.html`)
   * pone la del suelo que ensena (`registerFloorLand`).
   */
  land?: string;
}

export function createAmbience(scene: Phaser.Scene, quality: QualityProfile, options: AmbienceOptions = {}): Ambience {
  scene.add.image(WORLD.left, WORLD.top, TEX.sky).setOrigin(0).setScale(artInvOf(TEX.sky)).setDepth(DEPTH.sky);
  addSun(scene, quality);
  const drifters = addClouds(scene, quality);
  scheduleBirds(scene, quality);

  const land = options.land ?? TEX.land;
  scene.add.image(WORLD.left, LAND_TOP, land).setOrigin(0).setScale(artInvOf(land)).setDepth(DEPTH.land);
  addCanopy(scene);
  addSkylineLights(scene, quality);
  addCorruption(scene, quality);
  if (quality.cloudShadows) drifters.push(addCloudShadow(scene));
  if (quality.wind) addWind(scene);
  if (quality.extras) {
    addLightShafts(scene);
    addDew(scene, quality);
  }
  addFlowers(scene, quality);
  addButterflies(scene, quality);
  addPollen(scene, quality);
  addFallingLeaves(scene, quality);
  addForeground(scene, quality);

  return {
    update(deltaMs: number) {
      const step = deltaMs / 1000;
      for (const d of drifters) {
        d.image.x += d.speed * step;
        const half = d.image.displayWidth / 2;
        if (d.image.x - half > WORLD.right) {
          d.image.x = WORLD.left - half - Phaser.Math.Between(0, 200);
          d.image.y = Phaser.Math.FloatBetween(d.minY, d.maxY);
        }
      }
    },
  };
}

function addSun(scene: Phaser.Scene, quality: QualityProfile): void {
  const { x, y } = SCENERY.sun;
  const core = scene.add.image(x, y, TEX.sunCore).setScale(artInv()).setDepth(DEPTH.sun + 0.1);
  breathe(scene, core, { scale: core.scale * 1.05, duration: 1800 });
  if (!quality.sunRays) return;

  const halo = scene.add
    .image(x, y, TEX.glow)
    .setDisplaySize(440, 440)
    .setTint(0xfff1a8)
    .setAlpha(0.55)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.sun);
  const rays = scene.add.image(x, y, TEX.sunRays).setScale(artInv()).setDepth(DEPTH.sun).setAlpha(0.8);
  scene.tweens.add({ targets: rays, angle: 360, duration: 120_000, repeat: -1 });
  breathe(scene, rays, { alpha: 0.45, duration: 3200 });
  breathe(scene, halo, { alpha: 0.8, scale: halo.scale * 1.08, duration: 2600 });
}

function addClouds(scene: Phaser.Scene, quality: QualityProfile): Drifter[] {
  const rand = seededRandom(31);
  const drifters: Drifter[] = [];
  const count = amount(8, quality.life, 4);
  for (let i = 0; i < count; i++) {
    const scale = 0.55 + rand() * 0.6;
    // Dos de cada tres van por el cielo de siempre; el resto, mas arriba (se ven en pantallas altas).
    const high = i % 3 === 2;
    const [minY, maxY] = high ? [WORLD.top + 60, -20] : [40, 230];
    const image = scene.add
      .image(WORLD.left + rand() * WORLD.width, minY + rand() * (maxY - minY), TEX.clouds[i % TEX.clouds.length])
      .setScale(scale * artInv())
      .setAlpha(0.85 + rand() * 0.15)
      .setDepth(DEPTH.clouds);
    // Las grandes parecen mas cerca: se mueven algo mas rapido.
    drifters.push({ image, speed: 6 + scale * 14, minY, maxY });
  }
  return drifters;
}

function addCloudShadow(scene: Phaser.Scene): Drifter {
  const image = scene.add
    .image(VIEW.width * 0.3, 620, TEX.glow)
    .setDisplaySize(620, 240)
    .setTint(0x103010)
    .setAlpha(0.13)
    .setDepth(DEPTH.groundFx);
  return { image, speed: 16, minY: 450, maxY: 780 };
}

function scheduleBirds(scene: Phaser.Scene, quality: QualityProfile): void {
  const flock = () => {
    const count = Phaser.Math.Between(2, amount(4, quality.life, 2));
    const baseY = Phaser.Math.Between(60, 200);
    const duration = Phaser.Math.Between(15_000, 21_000);
    for (let i = 0; i < count; i++) {
      const bird = scene.add
        .image(WORLD.left - 40 - i * 34, baseY + (i % 2) * 14 + i * 4, TEX.bird)
        .setScale((0.6 + Math.random() * 0.35) * artInv())
        .setDepth(DEPTH.birds);
      scene.tweens.add({ targets: bird, scaleY: bird.scaleY * 0.3, duration: 170 + i * 15, yoyo: true, repeat: -1 });
      scene.tweens.add({ targets: bird, y: bird.y - 18, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      scene.tweens.add({
        targets: bird,
        x: WORLD.right + 60,
        duration: duration * (WORLD.width / VIEW.width),
        delay: i * 120,
        onComplete: () => {
          scene.tweens.killTweensOf(bird);
          bird.destroy();
        },
      });
    }
    scene.time.delayedCall(Phaser.Math.Between(9_000, 17_000) / quality.life, flock);
  };
  scene.time.delayedCall(1500, flock);
}

function addCanopy(scene: Phaser.Scene): void {
  const canopy = scene.add
    .image(CANOPY.screenX, CANOPY.screenY, TEX.canopy)
    .setOrigin(CANOPY.anchorX / CANOPY.width, CANOPY.anchorY / CANOPY.height)
    .setScale(artInvOf(TEX.canopy))
    .setAngle(-1.2)
    .setDepth(DEPTH.canopy);
  breathe(scene, canopy, { angle: 1.2, duration: 3400 });
}

function addSkylineLights(scene: Phaser.Scene, quality: QualityProfile): void {
  SKYLINE_LIGHTS.forEach((p, i) => {
    const targets: Phaser.GameObjects.GameObject[] = [scene.add.circle(p.x, p.y, 2.2, 0xff6b6b).setDepth(DEPTH.land + 0.5)];
    if (quality.glows) {
      targets.push(
        scene.add
          .image(p.x, p.y, TEX.glow)
          .setDisplaySize(22, 22)
          .setTint(0xff5a5a)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH.land + 0.5),
      );
    }
    scene.tweens.add({ targets, alpha: 0.12, duration: 700, delay: i * 330, yoyo: true, repeat: -1, hold: 400 });
  });
}

function addCorruption(scene: Phaser.Scene, quality: QualityProfile): void {
  if (quality.glows) {
    const glow = scene.add
      .image(CORRUPTION_GLOW_AREA.x, CORRUPTION_GLOW_AREA.y, TEX.corruptionGlow)
      .setOrigin(0)
      .setScale(artInvOf(TEX.corruptionGlow))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.35)
      .setDepth(DEPTH.groundFx);
    breathe(scene, glow, { alpha: 1, duration: 1500 });

    for (let lane = 0; lane < BOARD.lanes; lane++) {
      const p = P(SCENERY.holeX, lane + 0.5);
      const cw = perspective.cellWidthAt({ x: SCENERY.holeX, y: lane + 0.5 });
      const hole = scene.add
        .image(p.x, p.y, TEX.glow)
        .setDisplaySize(cw * 0.95, cw * 0.45)
        .setTint(0x39ff88)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.25)
        .setDepth(DEPTH.groundFx);
      breathe(scene, hole, { alpha: 0.75, duration: 900 + lane * 130, delay: lane * 220 });
    }
  }

  // Bits verdes y morados que suben de los agujeros, como datos que se escapan.
  scene.add
    .particles(0, 0, TEX.pixel, {
      emitZone: {
        type: 'random',
        source: {
          getRandomPoint: (point) => {
            const lane = Phaser.Math.Between(0, BOARD.lanes - 1);
            const p = P(SCENERY.holeX + Phaser.Math.FloatBetween(-0.25, 0.25), lane + 0.5 + Phaser.Math.FloatBetween(-0.12, 0.12));
            point.x = p.x;
            point.y = p.y;
          },
        },
      },
      speedY: { min: -70, max: -25 },
      speedX: { min: -10, max: 10 },
      lifespan: { min: 1100, max: 2300 },
      scale: { start: 1.2 * artInv(), end: 0.2 * artInv() },
      alpha: { start: 0.9, end: 0 },
      tint: [0x39ff88, 0x7dffc0, 0xb48cff],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 60 / quality.particles,
    })
    .setDepth(DEPTH.groundFx + 1);
}

/** Rafagas de viento: una franja de luz que barre el cesped de izquierda a derecha. */
function addWind(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(DEPTH.groundFx).setBlendMode(Phaser.BlendModes.ADD);
  const width = 1.6;
  const strips = 8;
  const draw = (start: number) => {
    g.clear();
    for (let i = 0; i < strips; i++) {
      const x0 = Math.max(0, start + (i / strips) * width);
      const x1 = Math.min(BOARD.columns, start + ((i + 1) / strips) * width);
      if (x1 <= x0) continue;
      const alpha = 0.1 * Math.sin((Math.PI * (i + 0.5)) / strips);
      const corners = [P(x0, 0), P(x1, 0), P(x1, BOARD.lanes), P(x0, BOARD.lanes)];
      g.fillStyle(0xfff6c8, alpha);
      g.beginPath();
      g.moveTo(corners[0].x, corners[0].y);
      for (const c of corners.slice(1)) g.lineTo(c.x, c.y);
      g.closePath();
      g.fillPath();
    }
  };
  const gust = () => {
    scene.tweens.addCounter({
      from: -width,
      to: BOARD.columns,
      duration: Phaser.Math.Between(3200, 4200),
      ease: 'Sine.InOut',
      onUpdate: (tween) => draw(tween.getValue() ?? -width),
      onComplete: () => {
        g.clear();
        scene.time.delayedCall(Phaser.Math.Between(4000, 8000), gust);
      },
    });
  };
  scene.time.delayedCall(2500, gust);
}

/** Haces de luz que bajan del sol y se mecen despacio (Alto y Ultra). */
function addLightShafts(scene: Phaser.Scene): void {
  const { x, y } = SCENERY.sun;
  [
    { angle: 28, alpha: 0.1, width: 1.2 },
    { angle: 46, alpha: 0.08, width: 0.8 },
    { angle: 12, alpha: 0.06, width: 0.9 },
  ].forEach((shaft, i) => {
    const beam = scene.add
      .image(x, y, TEX.beam)
      .setOrigin(0.5, 0)
      .setScale(shaft.width * artInv(), artInv())
      .setAngle(shaft.angle)
      .setAlpha(shaft.alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.groundFx + 3);
    breathe(scene, beam, { angle: shaft.angle + 4, alpha: shaft.alpha * 1.8, duration: 5200 + i * 1300, delay: i * 900 });
  });
}

/** Destellos de rocio que se encienden y apagan sobre el cesped (Alto y Ultra). */
function addDew(scene: Phaser.Scene, quality: QualityProfile): void {
  scene.add
    .particles(0, 0, TEX.sparkle, {
      emitZone: {
        type: 'random',
        source: {
          getRandomPoint: (point) => {
            const p = P(Phaser.Math.FloatBetween(0.05, BOARD.columns - 0.05), Phaser.Math.FloatBetween(0.05, BOARD.lanes - 0.05));
            point.x = p.x;
            point.y = p.y;
          },
        },
      },
      lifespan: { min: 500, max: 900 },
      scale: { start: 0.7 * artInv(), end: 0 },
      rotate: { min: 0, max: 45 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfff7c2, 0xe8fff0],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 180 / quality.particles,
    })
    .setDepth(DEPTH.groundFx + 2);
}

function addFlowers(scene: Phaser.Scene, quality: QualityProfile): void {
  const rand = seededRandom(64);
  const { fromX, toX } = SCENERY.flowerSpots;
  // El bancal sigue hacia la izquierda en pantallas anchas: alli tambien hay flores.
  const count = amount(30, quality.life, 10);
  for (let i = 0; i < count; i++) {
    const spot = { x: fromX + 0.1 + rand() * (toX - fromX - 0.2), y: 0.15 + rand() * (SCENERY.frontEdgeY - 0.3) };
    const p = P(spot.x, spot.y);
    const cw = perspective.cellWidthAt(spot);
    const flower = scene.add
      .image(p.x, p.y, TEX.flowers[i % TEX.flowers.length])
      .setOrigin(0.5, 1)
      .setScale(((cw * 0.5) / 96) * artInv())
      .setAngle(-4)
      .setDepth(entityDepth(p.y));
    breathe(scene, flower, { angle: 4, duration: 1500 + rand() * 1200, delay: rand() * 1500 });
  }
}

function addButterflies(scene: Phaser.Scene, quality: QualityProfile): void {
  const tints = [0xff9fd0, 0xffe27a, 0x9fd8ff, 0xc9a7ff, 0xffffff];
  const count = amount(3, quality.life);
  for (let i = 0; i < count; i++) {
    const scale = 0.75 * artInv();
    const butterfly = scene.add
      .image(Phaser.Math.Between(60, 400), Phaser.Math.Between(420, 760), TEX.butterfly)
      .setTint(tints[i % tints.length])
      .setScale(scale)
      .setDepth(DEPTH.butterflies);
    scene.tweens.add({ targets: butterfly, scaleX: scale * 0.2, duration: 110 + i * 20, yoyo: true, repeat: -1 });
    const wander = () => {
      const x = Phaser.Math.Between(40, 620);
      const y = Phaser.Math.Between(400, 800);
      const distance = Phaser.Math.Distance.Between(butterfly.x, butterfly.y, x, y);
      butterfly.setFlipX(x < butterfly.x);
      scene.tweens.add({
        targets: butterfly,
        x,
        y,
        duration: (distance / 55) * 1000,
        ease: 'Sine.InOut',
        onComplete: () => scene.time.delayedCall(Phaser.Math.Between(200, 1200), wander),
      });
    };
    wander();
  }
}

function addPollen(scene: Phaser.Scene, quality: QualityProfile): void {
  scene.add
    .particles(0, 0, TEX.dot, {
      emitZone: rectZone(WORLD.left, 330, WORLD.width, 560),
      speedX: { min: 6, max: 24 },
      speedY: { min: -12, max: -2 },
      lifespan: { min: 5000, max: 9000 },
      scale: { min: 0.15 * artInv(), max: 0.45 * artInv() },
      alpha: { start: 0.75, end: 0 },
      tint: [0xfff7c2, 0xffffff, 0xe8ffd0],
      blendMode: Phaser.BlendModes.ADD,
      frequency: (140 * VIEW.width) / WORLD.width / quality.particles,
      advance: 6000,
    })
    .setDepth(DEPTH.pollen);
}

function addFallingLeaves(scene: Phaser.Scene, quality: QualityProfile): void {
  scene.add
    .particles(0, 0, TEX.leaf, {
      emitZone: rectZone(WORLD.left, 120, 460 - WORLD.left, 140),
      speedX: { min: 10, max: 45 },
      speedY: { min: 8, max: 30 },
      gravityY: 8,
      rotate: { start: 0, end: 720 },
      lifespan: { min: 7000, max: 10_000 },
      scale: { min: 0.7 * artInv(), max: 1.15 * artInv() },
      alpha: { start: 1, end: 0, ease: 'Quad.In' },
      tint: [0xffffff, 0xfff0a0, 0xd0ffa0],
      frequency: 1300 / quality.particles,
      advance: 8000,
    })
    .setDepth(DEPTH.butterflies);
}

/**
 * Matas que se mecen en el borde delantero del terreno, sobre el corte de tierra. Van pegadas al mundo
 * (no al borde de la pantalla) para que queden bien con cualquier proporcion de pantalla.
 */
function addForeground(scene: Phaser.Scene, quality: QualityProfile): void {
  const rand = seededRandom(18);
  const gap = 85 / Math.min(1.2, quality.life);
  const edgeY = P(0, SCENERY.frontEdgeY).y + 12;
  for (let x = WORLD.left - 30; x < WORLD.right + 60; x += gap + rand() * 50) {
    const tuft = scene.add
      .image(x, edgeY, TEX.tufts[Math.floor(rand() * TEX.tufts.length)])
      .setOrigin(0.5, 1)
      .setScale((0.38 + rand() * 0.28) * artInv())
      .setFlipX(rand() > 0.5)
      .setAngle(-3)
      .setDepth(DEPTH.foreground);
    breathe(scene, tuft, { angle: 3, duration: 1700 + rand() * 1300, delay: rand() * 1600 });
  }
}
