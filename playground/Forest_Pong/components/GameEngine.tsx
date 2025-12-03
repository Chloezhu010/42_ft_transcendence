
import React, { useEffect, useRef, useState } from 'react';
import { visionService } from '../services/visionService';
import { GameState, Scores, ServeTurn, Point } from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_HEIGHT, PADDLE_WIDTH, WALL_OFFSET, 
  BALL_RADIUS, COLOR_BG, COLOR_TABLE, COLOR_LINES, COLOR_PADDLE_PLAYER, 
  COLOR_PADDLE_AI, COLOR_BALL, PADDLE_SPEED_AI, WINNING_SCORE,
  FIST_THRESHOLD, BEND_THRESHOLD 
} from '../constants';

// --- Skeleton Connections for Drawing ---
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 17], [5, 9], [9, 13], [13, 17],   // Palm
  [9, 10], [10, 11], [11, 12],          // Middle
  [13, 14], [14, 15], [15, 16],         // Ring
  [17, 18], [18, 19], [19, 20]          // Pinky
];

// --- Helper Functions for Physics ---
const resetBall = (turn: ServeTurn) => {
  const speed = 7; // Initial vertical speed
  // Serve direction: AI (Top) sends Down (+dy), Player (Bottom) sends Up (-dy)
  const dirY = turn === ServeTurn.PLAYER ? -1 : 1;
  
  // Randomize launch X angle slightly
  // A value between -0.5 and 0.5 for dx relative to speed
  const randomX = (Math.random() * 2 - 1) * 3;

  return {
    x: CANVAS_WIDTH / 2, // Start center X
    y: turn === ServeTurn.PLAYER ? CANVAS_HEIGHT - WALL_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 10 : WALL_OFFSET + PADDLE_HEIGHT + BALL_RADIUS + 10,
    dx: 0, 
    dy: 0,
    baseSpeed: speed,
    launchDirY: dirY,
    launchDx: randomX
  };
};

export const GameEngine: React.FC = () => {
  // --- Refs for Game Loop (Mutable state) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null); // Small PiP Canvas
  const requestRef = useRef<number>();
  
  // Game Objects - Using X coordinates now for paddles
  const paddlePlayerX = useRef(CANVAS_WIDTH / 2);
  const paddleAIX = useRef(CANVAS_WIDTH / 2);
  const ball = useRef(resetBall(ServeTurn.PLAYER));
  const aiErrorOffset = useRef(0); // Store AI error so it doesn't jitter every frame
  
  // Game Logic State
  const gameStateRef = useRef<GameState>(GameState.INITIALIZING);
  const scoresRef = useRef<Scores>({ player: 0, ai: 0 });
  const serveTurnRef = useRef<ServeTurn>(ServeTurn.PLAYER);
  const servesCountRef = useRef<number>(0); 
  const handDetectedRef = useRef<boolean>(false);
  const missingHandFramesRef = useRef<number>(0); // Debounce for tracking loss

  // --- React State for UI ---
  const [gameState, setGameState] = useState<GameState>(GameState.INITIALIZING);
  const [scores, setScores] = useState<Scores>({ player: 0, ai: 0 });
  const [serveInfo, setServeInfo] = useState<{turn: ServeTurn, countdown: number | null}>({ turn: ServeTurn.PLAYER, countdown: null });
  const [handStatus, setHandStatus] = useState<string>("Initializing Camera...");

  // --- Hand Tracking & Gesture Logic ---

  const isFist = (landmarks: Point[]) => {
    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20].map(i => landmarks[i]); 
    const avgDist = tips.reduce((acc, tip) => {
      const d = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
      return acc + d;
    }, 0) / 4;
    return avgDist < FIST_THRESHOLD;
  };

  const isIndexBent = (landmarks: Point[]) => {
    const tip = landmarks[8];
    const mcp = landmarks[5]; 
    const dist = Math.sqrt(Math.pow(tip.x - mcp.x, 2) + Math.pow(tip.y - mcp.y, 2));
    return dist < BEND_THRESHOLD;
  };

  // Map Hand X to Paddle X
  const updatePlayerPaddle = (landmarks: Point[]) => {
    // MediaPipe X: 0 (Left) -> 1 (Right). 
    // If camera is mirrored in CSS, we still receive 0..1 from MediaPipe (Raw data).
    // When we look at the screen (Mirrored):
    // Moving hand to physical Right -> appears on Screen Right.
    // Raw MediaPipe X is close to 0.
    // 1 - x gives us a value close to 1 (Right). 
    const x = 1 - landmarks[8].x; 
    
    const targetX = x * CANVAS_WIDTH;
    
    // Lerp for smoothing
    paddlePlayerX.current = paddlePlayerX.current + (targetX - paddlePlayerX.current) * 0.2;
    
    // Clamp inside walls
    paddlePlayerX.current = Math.max(PADDLE_WIDTH/2, Math.min(CANVAS_WIDTH - PADDLE_WIDTH/2, paddlePlayerX.current));
  };

  // --- Game Loop ---
  const update = (landmarks: Point[] | null) => {
    // 1. Process Input
    if (landmarks) {
      // Reset missing frame counter immediately if hand is seen
      missingHandFramesRef.current = 0;

      if (!handDetectedRef.current) {
        handDetectedRef.current = true;
        setHandStatus("Hand Detected");
        if (gameStateRef.current === GameState.WAITING_FOR_HAND) {
            gameStateRef.current = GameState.MENU;
            setGameState(GameState.MENU);
        }
      }
      updatePlayerPaddle(landmarks);

      if (gameStateRef.current === GameState.MENU || gameStateRef.current === GameState.GAME_OVER) {
         if (isFist(landmarks)) startGame();
      } else if (gameStateRef.current === GameState.SERVING && serveTurnRef.current === ServeTurn.PLAYER) {
         if (isIndexBent(landmarks)) triggerServe();
      }
    } else {
        // Debounce Logic: Only declare lost if missing for ~30 frames (approx 0.5s at 60fps)
        // This prevents flickering when webcam frame rate (30fps) < game frame rate (60fps)
        missingHandFramesRef.current++;
        if (missingHandFramesRef.current > 30) {
            if (handDetectedRef.current) {
                handDetectedRef.current = false;
                setHandStatus("Lost Tracking - Raise Hand");
            }
        }
    }

    // 2. AI Logic (Horizontal Movement)
    if (gameStateRef.current === GameState.PLAYING || gameStateRef.current === GameState.SERVING) {
       let targetX = ball.current.x;
       
       // If ball moving away from AI (down), return to center to be ready
       if (ball.current.dy > 0 && gameStateRef.current === GameState.PLAYING) {
           targetX = CANVAS_WIDTH / 2;
       } else {
           // Ball coming towards AI
           // Use the stored error offset. We DO NOT recalculate this every frame (avoids jitter).
           targetX = ball.current.x + aiErrorOffset.current; 
       }

       const diff = targetX - paddleAIX.current;
       if (Math.abs(diff) > PADDLE_SPEED_AI) {
           paddleAIX.current += diff > 0 ? PADDLE_SPEED_AI : -PADDLE_SPEED_AI;
       } else {
           paddleAIX.current = targetX;
       }
       paddleAIX.current = Math.max(PADDLE_WIDTH/2, Math.min(CANVAS_WIDTH - PADDLE_WIDTH/2, paddleAIX.current));
    }

    // 3. Ball Physics
    if (gameStateRef.current === GameState.PLAYING) {
        const b = ball.current;
        b.x += b.dx;
        b.y += b.dy;

        // Side Walls (Left/Right)
        if (b.x - BALL_RADIUS < 0 || b.x + BALL_RADIUS > CANVAS_WIDTH) {
            b.dx = -b.dx;
        }

        // Paddle Collisions
        // AI (Top)
        if (b.dy < 0 && b.y - BALL_RADIUS < WALL_OFFSET + PADDLE_HEIGHT && b.y - BALL_RADIUS > WALL_OFFSET - 5) {
             if (Math.abs(b.x - paddleAIX.current) < PADDLE_WIDTH / 2 + BALL_RADIUS) {
                 b.dy = -b.dy * 1.05; // Speed up
                 // Add Horizontal Spin
                 const impact = (b.x - paddleAIX.current) / (PADDLE_WIDTH / 2);
                 b.dx = impact * 10;
                 b.y = WALL_OFFSET + PADDLE_HEIGHT + BALL_RADIUS + 1; // Unstuck
             }
        }

        // Player (Bottom)
        if (b.dy > 0 && b.y + BALL_RADIUS > CANVAS_HEIGHT - WALL_OFFSET - PADDLE_HEIGHT && b.y + BALL_RADIUS < CANVAS_HEIGHT - WALL_OFFSET + 5) {
             if (Math.abs(b.x - paddlePlayerX.current) < PADDLE_WIDTH / 2 + BALL_RADIUS) {
                 b.dy = -b.dy * 1.05;
                 const impact = (b.x - paddlePlayerX.current) / (PADDLE_WIDTH / 2);
                 b.dx = impact * 10;
                 b.y = CANVAS_HEIGHT - WALL_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 1; // Unstuck
                 
                 // When Player hits ball, AI recalculates its error for the next shot
                 // This makes the AI behavior stable but imperfect
                 aiErrorOffset.current = (Math.random() - 0.5) * 80; 
             }
        }

        // Scoring (Top/Bottom)
        if (b.y < 0) {
            scorePoint(ServeTurn.PLAYER); // Ball passed AI
        } else if (b.y > CANVAS_HEIGHT) {
            scorePoint(ServeTurn.AI); // Ball passed Player
        }
    } else if (gameStateRef.current === GameState.SERVING) {
        // Ball sticks to paddle
        if (serveTurnRef.current === ServeTurn.PLAYER) {
            ball.current.x = paddlePlayerX.current;
            ball.current.y = CANVAS_HEIGHT - WALL_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 5;
        } else {
            ball.current.x = paddleAIX.current;
            ball.current.y = WALL_OFFSET + PADDLE_HEIGHT + BALL_RADIUS + 5;
            if (Math.random() < 0.02) triggerServe();
        }
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Table Area (Vertical)
    ctx.fillStyle = COLOR_TABLE;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw Center Net (Horizontal)
    ctx.strokeStyle = COLOR_LINES;
    ctx.setLineDash([10, 15]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
    ctx.stroke();

    // Draw Paddles
    // AI (Top)
    ctx.fillStyle = COLOR_PADDLE_AI;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillRect(paddleAIX.current - PADDLE_WIDTH / 2, WALL_OFFSET, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Player (Bottom)
    ctx.fillStyle = COLOR_PADDLE_PLAYER;
    ctx.fillRect(paddlePlayerX.current - PADDLE_WIDTH / 2, CANVAS_HEIGHT - WALL_OFFSET - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    ctx.shadowBlur = 0;

    // Draw Ball
    ctx.fillStyle = COLOR_BALL;
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawHandOverlay = (landmarks: Point[]) => {
    const canvas = debugCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw connections
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4ade80'; // Green skeleton

    HAND_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        
        // CORRECTION: Because the CANVAS is CSS transformed (mirrored) to match the mirrored video,
        // we should draw the RAW coordinates.
        const x1 = p1.x * canvas.width;
        const y1 = p1.y * canvas.height;
        const x2 = p2.x * canvas.width;
        const y2 = p2.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });

    // Draw points
    ctx.fillStyle = '#fbbf24'; // Yellow joints
    landmarks.forEach(p => {
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
  };

  const gameLoop = () => {
    // 1. Vision Update
    let landmarks = null;
    if (videoRef.current) {
        const result = visionService.detect(videoRef.current);
        if (result && result.landmarks && result.landmarks.length > 0) {
            landmarks = result.landmarks[0];
            drawHandOverlay(landmarks);
        } else {
             // Only clear debug canvas if we really lost track for a while
             if (missingHandFramesRef.current > 10) {
                 const dbgCtx = debugCanvasRef.current?.getContext('2d');
                 if (dbgCtx) dbgCtx.clearRect(0,0, 320, 240);
             }
        }
    }

    // 2. Physics & Logic Update
    update(landmarks);

    // 3. Render
    draw();

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // --- Logic Control (Same structure) ---
  const startGame = () => {
      scoresRef.current = { player: 0, ai: 0 };
      setScores({ player: 0, ai: 0 });
      servesCountRef.current = 0;
      serveTurnRef.current = ServeTurn.PLAYER;
      startServePhase();
  };

  const startServePhase = () => {
      gameStateRef.current = GameState.SERVING;
      setGameState(GameState.SERVING);
      setServeInfo({ turn: serveTurnRef.current, countdown: 3 });
      
      ball.current = resetBall(serveTurnRef.current);
      // Reset AI error for the serve
      aiErrorOffset.current = (Math.random() - 0.5) * 50;

      let count = 3;
      const interval = setInterval(() => {
          count--;
          if (count <= 0) {
              clearInterval(interval);
              setServeInfo(prev => ({ ...prev, countdown: 0 })); 
          } else {
              setServeInfo(prev => ({ ...prev, countdown: count }));
          }
      }, 1000);
  };

  const triggerServe = () => {
      if (gameStateRef.current === GameState.SERVING) {
        const b = ball.current;
        b.dy = b.baseSpeed * b.launchDirY;
        b.dx = b.launchDx;
        
        gameStateRef.current = GameState.PLAYING;
        setGameState(GameState.PLAYING);
        setServeInfo(prev => ({ ...prev, countdown: null }));
      }
  };

  const scorePoint = (winner: ServeTurn) => {
      const newScores = { ...scoresRef.current };
      if (winner === ServeTurn.PLAYER) newScores.player++;
      else newScores.ai++;
      
      scoresRef.current = newScores;
      setScores(newScores);

      const p = newScores.player;
      const a = newScores.ai;
      if ((p >= WINNING_SCORE || a >= WINNING_SCORE) && Math.abs(p - a) >= 2) {
          gameStateRef.current = GameState.GAME_OVER;
          setGameState(GameState.GAME_OVER);
          return;
      }

      const isDeuce = p >= 10 && a >= 10;
      servesCountRef.current++;
      
      let switchServe = false;
      if (isDeuce) {
          switchServe = true;
      } else if (servesCountRef.current >= 2) {
          switchServe = true;
          servesCountRef.current = 0;
      }

      if (switchServe) {
          serveTurnRef.current = serveTurnRef.current === ServeTurn.PLAYER ? ServeTurn.AI : ServeTurn.PLAYER;
      }

      startServePhase();
  };


  // --- Initialization Effect ---
  useEffect(() => {
    const init = async () => {
      await visionService.initialize();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          videoRef.current.onloadeddata = () => {
              gameStateRef.current = GameState.WAITING_FOR_HAND;
              setGameState(GameState.WAITING_FOR_HAND);
              requestRef.current = requestAnimationFrame(gameLoop);
          };
      }
    };
    init();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Rendering UI Overlays ---
  return (
    <div className="relative w-full h-full flex justify-center items-center gap-8 bg-black">
      
      {/* Main Game Canvas */}
      <div className="relative shadow-2xl rounded-xl overflow-hidden border-4 border-green-900/50">
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block bg-[#0f2310] max-w-full max-h-[85vh] object-contain"
        />

        {/* --- UI Overlays Inside Game Board --- */}

        {/* Status Indicator (Top Left) */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 z-20">
            <div className={`w-3 h-3 rounded-full ${handDetectedRef.current ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-xs text-white/70 uppercase tracking-wide font-semibold drop-shadow-md">{handStatus}</span>
        </div>

        {/* Initializing / Waiting */}
        {(gameState === GameState.INITIALIZING || gameState === GameState.WAITING_FOR_HAND) && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
                <h2 className="text-2xl font-light">Prepare your camera...</h2>
                <p className="text-green-400 mt-2">Raise your index finger to be detected</p>
            </div>
        )}

        {/* Menu */}
        {gameState === GameState.MENU && (
            <div className="absolute inset-0 bg-[#0f2310]/80 backdrop-blur-md flex flex-col items-center justify-center text-white z-40 animate-in fade-in duration-500">
                <h1 className="text-6xl font-bold mb-8 text-green-400 tracking-tighter">Forest Pong</h1>
                
                <div className="grid grid-cols-2 gap-8 mb-12 max-w-2xl w-full">
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                        <div className="text-4xl mb-2">☝️</div>
                        <h3 className="font-bold text-lg mb-2">Control</h3>
                        <p className="text-sm text-gray-300">Move your hand <strong>Left / Right</strong> to control the paddle at the bottom.</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                        <div className="text-4xl mb-2">✊</div>
                        <h3 className="font-bold text-lg mb-2">Start Game</h3>
                        <p className="text-sm text-gray-300">Make a <strong>FIST</strong> to start the match.</p>
                    </div>
                </div>

                <div className="animate-bounce mt-4">
                    <span className="bg-green-600 px-6 py-2 rounded-full font-bold shadow-lg shadow-green-900/50">
                        Make a Fist to Start
                    </span>
                </div>
            </div>
        )}

        {/* Serve Phase Overlay */}
        {gameState === GameState.SERVING && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                <div className="text-xl uppercase tracking-widest font-bold text-green-400 mb-2 bg-black/50 px-4 py-1 rounded-full">
                    {serveInfo.turn === ServeTurn.PLAYER ? "Your Serve (Bottom)" : "Opponent Serving (Top)"}
                </div>
                {serveInfo.countdown && serveInfo.countdown > 0 ? (
                    <div className="text-8xl font-black text-white drop-shadow-lg animate-ping">{serveInfo.countdown}</div>
                ) : (
                    serveInfo.turn === ServeTurn.PLAYER && (
                        <div className="flex flex-col items-center animate-pulse">
                            <span className="text-4xl font-bold text-yellow-400 mb-2 drop-shadow-xl">BEND FINGER!</span>
                            <span className="text-sm bg-black/60 px-3 py-1 rounded-full text-white">Curl index finger to hit ball up</span>
                        </div>
                    )
                )}
            </div>
        )}

        {/* Game Over */}
        {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur flex flex-col items-center justify-center text-white z-50">
                <h2 className="text-5xl font-bold mb-4">
                    {scores.player > scores.ai ? <span className="text-green-400">You Won!</span> : <span className="text-red-400">You Lost</span>}
                </h2>
                <div className="text-2xl mb-8 font-mono">
                    You: {scores.player} - AI: {scores.ai}
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-white/20 cursor-pointer hover:bg-white/20 transition">
                     Make a <strong>FIST</strong> to play again
                </div>
            </div>
        )}
      </div>

      {/* PiP Camera View (Fixed to Viewport Bottom Right - Outside Game Board) */}
      <div className="fixed bottom-6 right-6 w-48 h-36 bg-black border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl z-[60]">
             {/* Mirrored Video to match gameplay feel */}
             <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                style={{ transform: "scaleX(-1)" }} // Mirror effect
                playsInline muted autoPlay 
            />
            {/* Overlay Canvas for skeleton */}
            <canvas
                ref={debugCanvasRef}
                width={320}
                height={240}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }} // Mirror effect for canvas too
            />
            <div className="absolute bottom-1 left-1 text-[10px] text-white/80 bg-black/50 px-1 rounded">Camera Feed</div>
        </div>

      {/* Score Board - Next to Table */}
      <div className="flex flex-col items-center space-y-6 bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-white font-bold min-w-[120px]">
          <div className="text-xs text-slate-400 uppercase tracking-wider">AI</div>
          <span className="text-slate-400 text-5xl tabular-nums">{scores.ai}</span>
          <div className="w-12 h-1 bg-white/20 rounded-full"></div>
          <span className="text-yellow-400 text-5xl tabular-nums">{scores.player}</span>
          <div className="text-xs text-yellow-400 uppercase tracking-wider">YOU</div>
      </div>
    </div>
  );
};
