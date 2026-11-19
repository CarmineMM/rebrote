import { useEffect, useState } from 'react';
import { EventBus, GameEvents } from './game/EventBus';
import { GameCanvas } from './ui/GameCanvas';

export function App() {
  const [scene, setScene] = useState<string | null>(null);

  useEffect(() => {
    EventBus.on(GameEvents.sceneReady, setScene);
    return () => {
      EventBus.off(GameEvents.sceneReady, setScene);
    };
  }, []);

  return (
    <main className="app">
      <header className="hud">
        <strong>Rebrote</strong>
        <span>{scene ? 'Mundo 1: Gusanos' : 'Cargando...'}</span>
      </header>
      <GameCanvas />
    </main>
  );
}
