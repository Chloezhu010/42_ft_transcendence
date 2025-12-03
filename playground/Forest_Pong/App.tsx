
import React from 'react';
import { GameEngine } from './components/GameEngine';

const App: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#051006] text-white flex flex-col">
      <header className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0f2310]">
        <div className="flex items-center gap-2">
            <span className="text-2xl">🌲</span>
            <h1 className="font-bold text-xl tracking-tight text-green-100">Forest Pong Motion</h1>
        </div>
        <div className="text-xs text-green-400/60 hidden md:block">
            Powered by MediaPipe & React
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <GameEngine />
      </main>

      <footer className="p-4 text-center text-white/20 text-xs">
         Stand back 1-2 meters. Use your index finger to move the paddle Left/Right.
      </footer>
    </div>
  );
};

export default App;
