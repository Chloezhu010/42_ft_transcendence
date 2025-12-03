import { HandLandmarkerResult } from '../types';

// We use the global script loaded in index.html to avoid WASM bundler issues in this environment
const VISION_CDN_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm";

export class VisionService {
  private handLandmarker: any = null;
  private runningMode: "IMAGE" | "VIDEO" = "VIDEO";
  private lastVideoTime = -1;

  async initialize() {
    if (this.handLandmarker) return;

    // Wait for the script to load if it hasn't yet (simple retry mechanism)
    const waitForGlobal = async () => {
        // @ts-ignore
        const vision = window.FilesetResolver; 
        if (vision) return vision;
        return new Promise(resolve => setTimeout(() => resolve(waitForGlobal()), 100));
    };

    // @ts-ignore
    const { FilesetResolver, HandLandmarker } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/+esm");

    const vision = await FilesetResolver.forVisionTasks(VISION_CDN_BASE);
    
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: this.runningMode,
      numHands: 1
    });
  }

  detect(video: HTMLVideoElement): HandLandmarkerResult | null {
    if (!this.handLandmarker) return null;

    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      const results = this.handLandmarker.detectForVideo(video, performance.now());
      return results;
    }
    return null;
  }
}

export const visionService = new VisionService();