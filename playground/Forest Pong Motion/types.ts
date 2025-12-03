export enum GameState {
  INITIALIZING = 'INITIALIZING',
  WAITING_FOR_HAND = 'WAITING_FOR_HAND',
  MENU = 'MENU', // Detected hand, waiting for Fist to start
  SERVING = 'SERVING', // Waiting for Serve gesture
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Point {
  x: number;
  y: number;
}

export interface Scores {
  player: number;
  ai: number;
}

export enum ServeTurn {
  PLAYER = 'PLAYER',
  AI = 'AI'
}

// Simplified MediaPipe Types since we are loading via CDN Global but using in TS
export interface HandLandmarkerResult {
  landmarks: Point[][];
  worldLandmarks: Point[][];
}

export interface VisionGlobal {
  HandLandmarker: any;
  FilesetResolver: any;
}

declare global {
  interface Window {
    vision: VisionGlobal;
  }
}