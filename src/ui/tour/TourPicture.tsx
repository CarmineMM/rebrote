import type { ReactNode } from 'react';
import { ENEMIES } from '../../game/config/balance';
import type { TourArt, TourArtKey } from '../../game/EventBus';
import { CardIcon } from '../Card';
import { HEART_PATH } from '../Lives';
import type { PictureId } from './tours';

interface TourPictureProps {
  id: PictureId;
  /** Dibujos compuestos por la escena con las texturas del tablero; mientras no llegan, la carta del HUD. */
  art: TourArt | null;
}

/**
 * Dibujo animado del bocadillo de un tour (T-013): una escena pequena en bucle que cuenta el paso sin palabras (la carta
 * vuela y brota la planta, las semillas van por su carril, el gusano suelta su moneda...). Las plantas, minas y gusanos
 * son imagenes que compone la escena con sus texturas (regla 3); el resto (cartas, monedas, corazones, ondas) es HUD.
 */
export function TourPicture({ id, art }: TourPictureProps) {
  const pic = (key: TourArtKey, className: string, fallback: ReactNode = null) =>
    art ? <img className={`pic-art ${className}`} src={art[key]} alt="" draggable={false} /> : <span className={`pic-art ${className}`}>{fallback}</span>;
  const plant = (className: string, key: TourArtKey = 'shooter') => pic(key, className, <CardIcon card="shooter" />);
  const worm = (className: string) => pic('worm', className, <span className="pic-worm-fallback" />);
  const card = (kind: 'shooter' | 'fire' | 'ice', className: string) => (
    <span className={`pic-card is-${kind} ${className}`}>
      <CardIcon card={kind} />
    </span>
  );

  let scene: ReactNode;
  switch (id) {
    case 'sow':
    case 'fireSow':
    case 'iceSow': {
      const kind = id === 'sow' ? 'shooter' : id === 'fireSow' ? 'fire' : 'ice';
      const sprout = id === 'sow' ? plant('pic-at-mound pic-pop') : pic(id === 'fireSow' ? 'fireMine' : 'iceMine', 'pic-at-mound pic-pop is-mine', <CardIcon card={kind} />);
      scene = (
        <>
          {card(kind, 'pic-fly')}
          <span className="pic-mound" />
          {sprout}
        </>
      );
      break;
    }
    case 'lane':
      scene = (
        <>
          <span className="pic-lane" />
          {plant('pic-left')}
          <span className="pic-seed" />
          <span className="pic-seed is-b" />
          <span className="pic-seed is-c" />
          {worm('pic-right pic-flinch')}
        </>
      );
      break;
    case 'coins':
      scene = (
        <>
          {worm('pic-left-mid pic-poof')}
          <span className="coin pic-coin" />
          <span className="pic-balance">
            <span className="coin coin-small" />+{ENEMIES.worm.reward}
          </span>
        </>
      );
      break;
    case 'lives':
      scene = (
        <>
          <span className="pic-edge" />
          {worm('pic-crawl')}
          <span className="pic-hearts">
            {[0, 1, 2].map((i) => (
              <svg key={i} viewBox="0 0 24 24" className={i === 2 ? 'is-lost' : ''}>
                <path d={HEART_PATH} />
              </svg>
            ))}
          </span>
        </>
      );
      break;
    case 'info':
      scene = (
        <>
          {plant('pic-left')}
          <span className="pic-ripple is-on-plant" />
          <span className="pic-ripple is-on-plant is-second" />
          <span className="pic-photo">{plant('pic-photo-art')}</span>
        </>
      );
      break;
    case 'go':
      scene = (
        <>
          <span className="pic-hole" />
          {worm('pic-peek')}
          <span className="pic-alert">!</span>
          {plant('pic-left is-small')}
        </>
      );
      break;
    case 'pick':
      scene = (
        <>
          <span className="pic-tile" />
          {plant('pic-center pic-hop')}
          <span className="pic-ripple is-center" />
        </>
      );
      break;
    case 'levelUp':
      scene = (
        <>
          {plant('pic-center pic-stretch')}
          <span className="medal medal-tier-0 pic-medal">2</span>
          <span className="pic-up" />
          <span className="pic-up is-b" />
        </>
      );
      break;
    case 'fireBoom':
    case 'iceFreeze': {
      const fire = id === 'fireBoom';
      scene = (
        <>
          {pic(fire ? 'fireMineArmed' : 'iceMineArmed', 'pic-left pic-tremble is-mine', <CardIcon card={fire ? 'fire' : 'ice'} />)}
          <span className={`pic-count is-${fire ? 'fire' : 'ice'}`}>2</span>
          <span className={`pic-count is-b is-${fire ? 'fire' : 'ice'}`}>1</span>
          <span className={`pic-blast ${fire ? 'is-fire' : 'is-ice'}`} />
          {worm(`pic-right ${fire ? 'pic-blasted' : 'pic-frozen'}`)}
        </>
      );
      break;
    }
    case 'infuseCard':
      scene = (
        <>
          {card('fire', 'pic-drop')}
          {plant('pic-center pic-swap-a')}
          {plant('pic-center pic-swap-b', 'shooterFire')}
          <span className="pic-glow is-fire" />
        </>
      );
      break;
    case 'infuseMine':
      scene = (
        <>
          {plant('pic-center pic-swap-a')}
          {plant('pic-center pic-swap-b', 'shooterIce')}
          {pic('iceMine', 'pic-slide-in is-mine', <CardIcon card="ice" />)}
          <span className="pic-glow is-ice" />
        </>
      );
      break;
    case 'fuse':
      scene = (
        <>
          {plant('pic-merge-from')}
          {plant('pic-merge-to')}
          {plant('pic-merged', 'shooter2')}
          <span className="pic-ring" />
        </>
      );
      break;
  }

  return (
    <span className={`tour-pic is-${id}`} aria-hidden="true">
      {scene}
    </span>
  );
}

/**
 * Brotito, el que acompana los bocadillos de ayuda (T-013): una semillita verde con dos hojas, ojos que parpadean y una
 * sonrisa. Se asoma por la esquina del bocadillo y se mece.
 */
export function TourBuddy() {
  return (
    <svg className="tour-buddy" viewBox="0 0 44 48" aria-hidden="true">
      <path className="tour-buddy-stem" d="M22 20 Q21 14 22 9" />
      <path className="tour-buddy-leaf" d="M22 10 Q12 1 5 7 Q12 15 22 10 Z" />
      <path className="tour-buddy-leaf is-right" d="M22 9 Q31 -1 39 5 Q32 14 22 9 Z" />
      <ellipse className="tour-buddy-body" cx="22" cy="32" rx="15" ry="13.5" />
      <ellipse className="tour-buddy-blush" cx="13.5" cy="35.5" rx="3" ry="1.8" />
      <ellipse className="tour-buddy-blush" cx="30.5" cy="35.5" rx="3" ry="1.8" />
      <g className="tour-buddy-eyes">
        <ellipse cx="16.5" cy="30" rx="2.2" ry="2.8" />
        <ellipse cx="27.5" cy="30" rx="2.2" ry="2.8" />
      </g>
      <path className="tour-buddy-smile" d="M18 37 Q22 40.5 26 37" />
    </svg>
  );
}
