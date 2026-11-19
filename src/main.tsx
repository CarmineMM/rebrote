import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Sin StrictMode a proposito: el doble montaje en desarrollo crearia dos instancias de Phaser.
createRoot(document.getElementById('root')!).render(<App />);
