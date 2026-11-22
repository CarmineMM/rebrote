import { createRoot } from 'react-dom/client';
import { App } from './App';
import { sfx } from './game/audio/sfx';
import { pwaInstall } from './pwa/install';
import { pwaUpdate } from './pwa/update';
import './styles.css';

// Efectos de sonido (T-014): esperan el primer gesto del jugador y se descargan cuando la portada ya se ve.
sfx.install();

// Instalable y sin conexion (T-029): el aviso de instalar llega al cargar, antes que React; el service worker, solo en el build.
pwaInstall.listen();
pwaUpdate.start();

// Sin StrictMode a proposito: el doble montaje en desarrollo crearia dos instancias de Phaser.
createRoot(document.getElementById('root')!).render(<App />);
