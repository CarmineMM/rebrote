import { createRoot } from 'react-dom/client';
import { App } from './App';
import { sfx } from './game/audio/sfx';
import './styles.css';

// Efectos de sonido (T-014): esperan el primer gesto del jugador y se descargan cuando la portada ya se ve.
sfx.install();

// Sin StrictMode a proposito: el doble montaje en desarrollo crearia dos instancias de Phaser.
createRoot(document.getElementById('root')!).render(<App />);
