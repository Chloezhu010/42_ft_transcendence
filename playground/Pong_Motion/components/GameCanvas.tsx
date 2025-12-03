import React, { useEffect, useRef } from 'react';
import { GameState, HandGesture, GamePhysicsState } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  gesture: HandGesture;
  paddleX: number; // 0 to 1
  onScoreUpdate: (player: number, ai: number) => void;
  onGameStateChange: (state: GameState) => void;
  onServeChange: (isPlayerTurn: boolean) => void;
  resetTrigger: number; // Increment to reset game
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 1200; // Vertical aspect ratio
const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 20;
const BALL_RADIUS = 12;
const WINNING_SCORE = 11;

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  gesture, 
  paddleX, 
  onScoreUpdate, 
  onGameStateChange,
  onServeChange,
  resetTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Mutable game state for high-frequency updates
  const physics = useRef<GamePhysicsState>({
    paddleX: 0.5,
    aiPaddleX: 0.5,
    ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, dx: 0, dy: 0, speed: 0 }
  });

  const scores = useRef({ player: 0, ai: 0 });
  const server = useRef<'player' | 'ai'>('player');
  const servesCount = useRef(0); // Track serves for the 2-serve rule
  const isServing = useRef(true);
  const serveTimer = useRef(0);

  // Initialize or Reset Game
  useEffect(() => {
    scores.current = { player: 0, ai: 0 };
    server.current = 'player';
    servesCount.current = 0;
    resetBall('player');
    onScoreUpdate(0, 0);
    onServeChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  const resetBall = (whoServes: 'player' | 'ai') => {
    physics.current.ball.speed = 0;
    physics.current.ball.dx = 0;
    physics.current.ball.dy = 0;
    physics.current.ball.x = GAME_WIDTH / 2;
    // Set ball closer to server
    physics.current.ball.y = whoServes === 'player' ? GAME_HEIGHT - 150 : 150;
    
    isServing.current = true;
    server.current = whoServes;
    onServeChange(whoServes === 'player');
    serveTimer.current = performance.now();
  };

  const checkWinCondition = () => {
    const { player, ai } = scores.current;
    if ((player >= WINNING_SCORE || ai >= WINNING_SCORE) && Math.abs(player - ai) >= 2) {
      onGameStateChange(GameState.GAME_OVER);
      return true;
    }
    return false;
  };

  const handleScoring = (winner: 'player' | 'ai') => {
    if (winner === 'player') scores.current.player++;
    else scores.current.ai++;

    onScoreUpdate(scores.current.player, scores.current.ai);

    if (checkWinCondition()) return;

    // Serve Logic
    // Standard: Change server every 2 serves
    // Deuce (10-10): Change server every 1 serve
    const totalPoints = scores.current.player + scores.current.ai;
    const isDeuce = scores.current.player >= 10 && scores.current.ai >= 10;
    
    let shouldSwitch = false;
    
    if (isDeuce) {
      shouldSwitch = true; // Switch every time in deuce
    } else {
      // 0, 1 -> Server A. 2, 3 -> Server B.
      // If total points is even, we might switch.
      if (totalPoints % 2 === 0) {
        shouldSwitch = true;
      }
    }

    // Determine who serves next based on switch logic.
    // Actually simplest way: 
    // (Total points / 2) floor is mostly consistent, but let's stick to the prompt's explicit tracking.
    // "One game, each person serves 2 balls continuous, then switch."
    
    servesCount.current++;
    
    let nextServer = server.current;
    const servesAllowed = isDeuce ? 1 : 2;

    if (servesCount.current >= servesAllowed) {
      nextServer = server.current === 'player' ? 'ai' : 'player';
      servesCount.current = 0; // Reset counter for the new server
    }

    resetBall(nextServer);
  };

  const launchBall = () => {
    const dirY = server.current === 'player' ? -1 : 1;
    // Random slight X angle
    const dirX = (Math.random() - 0.5) * 1.5;
    
    physics.current.ball.dx = dirX * 8;
    physics.current.ball.dy = dirY * 12; // Initial speed
    physics.current.ball.speed = 12;
    isServing.current = false;
  };

  const update = (deltaTime: number) => {
    if (gameState !== GameState.PLAYING) return;

    const state = physics.current;
    
    // 1. Update Player Paddle from Prop
    // Map 0-1 to canvas width, keeping paddle inside bounds
    const maxX = GAME_WIDTH - PADDLE_WIDTH;
    const targetX = paddleX * GAME_WIDTH - PADDLE_WIDTH / 2;
    // Smooth lerp for paddle
    state.paddleX += (Math.max(0, Math.min(maxX, targetX)) - state.paddleX) * 0.3;

    // 2. Serve Logic
    if (isServing.current) {
      // Position ball relative to paddle
      if (server.current === 'player') {
        state.ball.x = state.paddleX + PADDLE_WIDTH / 2;
        state.ball.y = GAME_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10;
        
        // Trigger Serve: Index Finger Bent
        if (gesture === HandGesture.INDEX_BENT) {
          launchBall();
        }
      } else {
        // AI Serve
        state.aiPaddleX = state.ball.x - PADDLE_WIDTH / 2; // AI follows ball perfectly during serve
        state.ball.y = PADDLE_HEIGHT + BALL_RADIUS + 10;
        
        // AI serves after 1.5 seconds automatically
        if (performance.now() - serveTimer.current > 1500) {
          launchBall();
        }
      }
      return; 
    }

    // 3. Ball Physics
    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;

    // Wall Collisions
    if (state.ball.x - BALL_RADIUS < 0 || state.ball.x + BALL_RADIUS > GAME_WIDTH) {
      state.ball.dx = -state.ball.dx;
    }

    // AI Movement (Simple tracking with speed limit)
    const aiTarget = state.ball.x - PADDLE_WIDTH / 2;
    const aiSpeed = 8; // Difficulty factor
    if (state.aiPaddleX < aiTarget) state.aiPaddleX += aiSpeed;
    if (state.aiPaddleX > aiTarget) state.aiPaddleX -= aiSpeed;
    // Clamp AI
    state.aiPaddleX = Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, state.aiPaddleX));

    // Paddle Collisions
    // Player (Bottom)
    if (state.ball.y + BALL_RADIUS > GAME_HEIGHT - PADDLE_HEIGHT - 10 &&
        state.ball.y - BALL_RADIUS < GAME_HEIGHT - 10) {
      if (state.ball.x > state.paddleX && state.ball.x < state.paddleX + PADDLE_WIDTH) {
        // Hit!
        // Calculate angle based on where it hit the paddle
        const hitPoint = state.ball.x - (state.paddleX + PADDLE_WIDTH / 2);
        // Normalize hit point (-1 to 1)
        const normalizedHit = hitPoint / (PADDLE_WIDTH / 2);
        
        const angle = normalizedHit * (Math.PI / 4); // Max 45 degrees
        
        state.ball.speed = Math.min(state.ball.speed + 1, 25); // Increase speed slightly
        state.ball.dx = state.ball.speed * Math.sin(angle);
        state.ball.dy = -state.ball.speed * Math.cos(angle);
        state.ball.y = GAME_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10; // Unstuck
      }
    }

    // AI (Top)
    if (state.ball.y - BALL_RADIUS < PADDLE_HEIGHT + 10 &&
        state.ball.y + BALL_RADIUS > 10) {
      if (state.ball.x > state.aiPaddleX && state.ball.x < state.aiPaddleX + PADDLE_WIDTH) {
        const hitPoint = state.ball.x - (state.aiPaddleX + PADDLE_WIDTH / 2);
        const normalizedHit = hitPoint / (PADDLE_WIDTH / 2);
        const angle = normalizedHit * (Math.PI / 4);

        state.ball.speed = Math.min(state.ball.speed + 1, 25);
        state.ball.dx = state.ball.speed * Math.sin(angle);
        state.ball.dy = state.ball.speed * Math.cos(angle);
        state.ball.y = PADDLE_HEIGHT + BALL_RADIUS + 10;
      }
    }

    // Scoring
    if (state.ball.y > GAME_HEIGHT) {
      handleScoring('ai');
    } else if (state.ball.y < 0) {
      handleScoring('player');
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Table (Wood/Forest theme)
    ctx.fillStyle = '#2d5a27'; // Table Color
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw Center Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT / 2);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 2);
    ctx.stroke();

    // Draw Paddles
    // AI Paddle (Top) - Wood Texture
    ctx.fillStyle = '#d97706';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillRect(physics.current.aiPaddleX, 10, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // Player Paddle (Bottom)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(physics.current.paddleX, GAME_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;

    // Draw Ball
    ctx.beginPath();
    ctx.arc(physics.current.ball.x, physics.current.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24'; // Glowing yellow
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    // Helper arrow during serve
    if (isServing.current && server.current === 'player') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '30px Fredoka';
      ctx.textAlign = 'center';
      ctx.fillText("Bend index finger to serve!", GAME_WIDTH/2, GAME_HEIGHT - 200);
      
      // Draw gesture hint
      if (gesture === HandGesture.INDEX_BENT) {
        ctx.fillStyle = '#4ade80';
        ctx.fillText("Serving!", GAME_WIDTH/2, GAME_HEIGHT - 160);
      }
    }
  };

  const animate = (time: number) => {
    update(time);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, gesture, paddleX]); // Dependencies to ensure props are fresh inside loop

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      {/* 
        We use a fixed logical size for the canvas but scale it with CSS to fit the container.
        Aspect Ratio 2:3 (800x1200)
      */}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="h-full w-auto max-w-full object-contain rounded-lg shadow-2xl border-4 border-[#3f2e18]"
      />
    </div>
  );
};

export default GameCanvas;