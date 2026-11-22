import type { ReactNode } from 'react';
import { ENEMIES } from '../../game/config/balance';
import type { CardId } from '../../game/core/match';
import type { TourArt, TourArtKey } from '../../game/EventBus';
import { CardIcon } from '../Card';
import { HEART_PATH } from '../Lives';
import { PowerIcon } from '../PowerPanel';
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
  const card = (kind: CardId, className: string) => (
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
    // Escudo (T-024): el muro brota de la tierra, para los escupitajos que iban a la planta de detras, y la carta sobre
    // una disparadora la vuelve de corteza.
    case 'wallSow':
      scene = (
        <>
          {card('shield', 'pic-fly')}
          <span className="pic-mound" />
          {pic('wall', 'pic-at-mound pic-pop is-wall', <CardIcon card="shield" />)}
        </>
      );
      break;
    case 'wallBlock':
      scene = (
        <>
          {plant('pic-behind is-small')}
          {pic('wall', 'pic-wall-mid pic-brace is-wall', <CardIcon card="shield" />)}
          {pic('spitter', 'pic-spitter pic-spitting is-small', <span className="pic-worm-fallback" />)}
          <span className="pic-spit" />
          <span className="pic-splat" />
        </>
      );
      break;
    case 'shieldInfuse':
      scene = (
        <>
          {card('shield', 'pic-drop')}
          {plant('pic-center pic-swap-a')}
          {plant('pic-center pic-swap-b', 'shooterShield')}
          <span className="pic-glow is-shield" />
        </>
      );
      break;
    // Poderes (T-021). Recolocar: la disparadora salta en curva de su monton de tierra a otro y brota alli.
    case 'relocate':
      scene = (
        <>
          <span className="pic-power">
            <PowerIcon power="relocate" />
          </span>
          <span className="pic-mound is-left" />
          <span className="pic-mound" />
          <span className="pic-arc" />
          {plant('pic-relocating')}
        </>
      );
      break;
    // Granada: la lanzan desde la izquierda, cae junto al gusano, cuenta 2 y 1 y explota.
    case 'grenade':
      scene = (
        <>
          {pic('grenade', 'pic-grenade is-mine', <PowerIcon power="grenade" />)}
          <span className="pic-count is-grenade">2</span>
          <span className="pic-count is-b is-grenade">1</span>
          <span className="pic-blast is-grenade" />
          {worm('pic-right pic-blasted')}
        </>
      );
      break;
    // Muro de hielo: tres bloques brotan en columna y el gusano que llega se para en seco ante ellos.
    case 'iceWall':
      scene = (
        <>
          {pic('iceBlock', 'pic-ice is-back', <PowerIcon power="iceWall" />)}
          {pic('iceBlock', 'pic-ice is-mid', <PowerIcon power="iceWall" />)}
          {worm('pic-bump')}
          {pic('iceBlock', 'pic-ice is-front', <PowerIcon power="iceWall" />)}
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
