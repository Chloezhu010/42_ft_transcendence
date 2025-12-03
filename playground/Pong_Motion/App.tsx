import React, { useState, useEffect, useRef } from 'react';
import WebcamInput from './components/WebcamInput';
import GameCanvas from './components/GameCanvas';
import ScoreBoard from './components/ScoreBoard';
import { GameState, HandGesture } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [handGesture, setHandGesture] = useState<HandGesture>(HandGesture.UNKNOWN);
  const [paddleX, setPaddleX] = useState<number>(0.5);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [resetCount, setResetCount] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Vision callback
  const handleHandUpdate = (x: number, gesture: HandGesture) => {
    setPaddleX(x);
    setHandGesture(gesture);
  };

  const handleCameraReady = () => {
    if (gameState === GameState.LOADING) {
      setGameState(GameState.MENU);
    }
  };

  // State Machine Logic
  useEffect(() => {
    if (gameState === GameState.MENU) {
      if (handGesture === HandGesture.OPEN_PALM || handGesture === HandGesture.INDEX_BENT) {
        setGameState(GameState.HAND_DETECTED);
      }
    } else if (gameState === GameState.HAND_DETECTED) {
      if (handGesture === HandGesture.FIST) {
        startCountdown();
      }
    }
  }, [handGesture, gameState]);

  const startCountdown = () => {
    setGameState(GameState.COUNTDOWN);
    setCountdown(3);
  };

  useEffect(() => {
    if (gameState === GameState.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState(GameState.PLAYING);
      }
    }
  }, [countdown, gameState]);

  const restartGame = () => {
    setScores({ player: 0, ai: 0 });
    setResetCount(prev => prev + 1);
    setGameState(GameState.MENU);
  };

  return (
    <div className="relative w-screen h-screen bg-[#0f172a] overflow-hidden flex items-center justify-center">
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
      
      {/* Main Game Area */}
      <div className="relative w-full h-full max-w-[800px] aspect-[2/3] flex flex-col">
        <GameCanvas 
          gameState={gameState}
          gesture={handGesture}
          paddleX={paddleX}
          onScoreUpdate={(p, a) => setScores({ player: p, ai: a })}
          onGameStateChange={setGameState}
          onServeChange={setIsPlayerTurn}
          resetTrigger={resetCount}
        />
      </div>

      {/* UI Overlay: Scores (Left Side) */}
      {gameState !== GameState.MENU && gameState !== GameState.LOADING && (
        <ScoreBoard 
          playerScore={scores.player} 
          aiScore={scores.ai} 
          isPlayerServing={isPlayerTurn}
        />
      )}

      {/* Camera Feed (Bottom Right) */}
      <div className="absolute bottom-6 right-6 w-48 h-36 z-50">
        <WebcamInput 
          onHandUpdate={handleHandUpdate} 
          onCameraReady={handleCameraReady}
        />
        {/* Debug / Status Text */}
        <div className="mt-2 text-right">
             <span className={`px-2 py-1 rounded text-xs font-bold ${
               handGesture === HandGesture.FIST ? 'bg-red-500 text-white' :
               handGesture === HandGesture.INDEX_BENT ? 'bg-yellow-500 text-black' :
               handGesture === HandGesture.OPEN_PALM ? 'bg-green-500 text-black' :
               'bg-gray-700 text-gray-400'
             }`}>
               {handGesture === HandGesture.INDEX_BENT ? 'BENT (SERVE)' : handGesture}
             </span>
        </div>
      </div>

      {/* Game State Overlays */}
      
      {/* LOADING */}
      {gameState === GameState.LOADING && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="text-2xl text-green-400 animate-pulse font-bold">Initializing Vision...</div>
        </div>
      )}

      {/* MENU */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-40 backdrop-blur-sm">
          <h1 className="text-6xl font-bold text-white mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">FOREST PONG</h1>
          <div className="bg-white/10 p-8 rounded-2xl border border-white/20 text-center max-w-md">
            <p className="text-xl text-green-300 mb-4">Raise your Index Finger to Connect</p>
            <div className="w-16 h-16 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-4">
               <span className="text-3xl">👆</span>
            </div>
            <p className="text-sm text-gray-400">Ensure your hand is visible in the camera box</p>
          </div>
        </div>
      )}

      {/* HAND DETECTED - WAITING FOR START */}
      {gameState === GameState.HAND_DETECTED && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-40">
          <div className="bg-green-900/90 p-8 rounded-2xl border-2 border-green-500 text-center animate-bounce">
            <h2 className="text-3xl font-bold text-white mb-4">Hand Detected!</h2>
            <p className="text-xl text-green-200 mb-6">Make a <span className="font-bold text-white">FIST ✊</span> to Start Game</p>
          </div>
        </div>
      )}

      {/* COUNTDOWN */}
      {gameState === GameState.COUNTDOWN && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-[150px] font-bold text-white drop-shadow-2xl animate-ping">
            {countdown}
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 backdrop-blur-md">
          <h2 className="text-5xl font-bold mb-4 text-white">
            {scores.player > scores.ai ? <span className="text-green-400">VICTORY!</span> : <span className="text-red-400">DEFEAT</span>}
          </h2>
          <div className="text-3xl text-gray-300 mb-8 font-mono">
            {scores.player} - {scores.ai}
          </div>
          <button 
            onClick={restartGame}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-full font-bold text-xl transition-transform hover:scale-105 shadow-lg shadow-green-900/50"
          >
            Play Again
          </button>
        </div>
      )}

    </div>
  );
};

export default App;