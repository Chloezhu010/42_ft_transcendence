import React from 'react';

interface ScoreBoardProps {
  playerScore: number;
  aiScore: number;
  isPlayerServing: boolean;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ playerScore, aiScore, isPlayerServing }) => {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 text-white pointer-events-none min-w-[100px]">
       {/* AI Score */}
       <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-orange-300 uppercase tracking-widest mb-1">AI</span>
          <div className={`text-6xl font-bold font-mono transition-all duration-300 ${!isPlayerServing ? 'text-white scale-110' : 'text-white/50'}`}>
            {aiScore}
          </div>
          {/* Always render text to reserve space, toggle opacity */}
          <div className={`text-xs text-orange-400 font-bold mt-1 h-4 flex items-center justify-center transition-opacity duration-300 ${!isPlayerServing ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
            SERVING
          </div>
       </div>

       {/* Center Divider - will now remain perfectly centered */}
       <div className="w-full h-px bg-white/20 my-2"></div>

       {/* Player Score */}
       <div className="flex flex-col items-center">
          {/* Always render text to reserve space, toggle opacity */}
          <div className={`text-xs text-blue-400 font-bold mb-1 h-4 flex items-center justify-center transition-opacity duration-300 ${isPlayerServing ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
            SERVING
          </div>
          <div className={`text-6xl font-bold font-mono transition-all duration-300 ${isPlayerServing ? 'text-white scale-110' : 'text-white/50'}`}>
            {playerScore}
          </div>
          <span className="text-sm font-semibold text-blue-300 uppercase tracking-widest mt-1">YOU</span>
       </div>
    </div>
  );
};

export default ScoreBoard;