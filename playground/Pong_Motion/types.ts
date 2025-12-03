export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',         // Waiting for user to be ready
  HAND_DETECTED = 'HAND_DETECTED', // Hand found, waiting for fist to start
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum HandGesture {
  UNKNOWN = 'UNKNOWN',
  OPEN_PALM = 'OPEN_PALM', // Index up / open
  FIST = 'FIST',
  INDEX_BENT = 'INDEX_BENT' // Trigger for serve
}

export interface PlayerState {
  score: number;
  name: string;
}

export interface GamePhysicsState {
  paddleX: number; // 0 to 1 (normalized width)
  aiPaddleX: number;
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    speed: number;
  };
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}