import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { HandGesture, HandLandmark } from "../types";

const VISION_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm";

export class VisionService {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private drawingUtils: DrawingUtils | null = null;
  private lastVideoTime = -1;
  private frameId: number = 0;
  
  // Callback to return data to React
  private onResults: (x: number, gesture: HandGesture) => void;

  constructor(onResults: (x: number, gesture: HandGesture) => void) {
    this.onResults = onResults;
  }

  public async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(VISION_BASE_URL);
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      console.log("HandLandmarker loaded");
    } catch (error) {
      console.error("Error initializing vision:", error);
    }
  }

  public start(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    
    // Initialize Drawing Utils
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      this.drawingUtils = new DrawingUtils(ctx);
    }

    this.processVideo();
  }

  public stop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
  }

  private processVideo = () => {
    if (!this.video || !this.handLandmarker) {
      this.frameId = requestAnimationFrame(this.processVideo);
      return;
    }

    if (this.video.currentTime !== this.lastVideoTime) {
      const results = this.handLandmarker.detectForVideo(this.video, performance.now());
      this.lastVideoTime = this.video.currentTime;

      // Draw Logic
      if (this.canvas && this.drawingUtils) {
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // Ensure canvas size matches video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            if (results.landmarks) {
              for (const landmarks of results.landmarks) {
                this.drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                  color: "#4ade80", // Green connector
                  lineWidth: 3
                });
                this.drawingUtils.drawLandmarks(landmarks, {
                  color: "#fbbf24", // Orange/Yellow dots
                  lineWidth: 1,
                  radius: 3
                });
              }
            }
        }
      }

      // Logic Processing
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0] as unknown as HandLandmark[];
        this.analyzeHand(landmarks);
      }
    }
    this.frameId = requestAnimationFrame(this.processVideo);
  };

  private analyzeHand(landmarks: HandLandmark[]) {
    // 1. Extract Index Finger Tip X position (Landmark 8) for paddle control
    // Mirror logic for natural interaction: 1 - x
    const indexTip = landmarks[8];
    const paddleX = 1 - indexTip.x;

    // 2. Gesture Detection
    const gesture = this.detectGesture(landmarks);

    this.onResults(paddleX, gesture);
  }

  // Helper for Euclidean distance
  private dist(a: HandLandmark, b: HandLandmark): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private detectGesture(landmarks: HandLandmark[]): HandGesture {
    const wrist = landmarks[0];
    const indexMcp = landmarks[5]; // Base of index finger
    
    // Calculate a reference scale based on hand size (Wrist to Index Base)
    const handSize = this.dist(wrist, indexMcp);

    // Helper to check if a finger is curled
    // A finger is curled if the tip is closer to the wrist/base than the PIP joint is, 
    // or simply if the distance from Tip to MCP is significantly short compared to full extension.
    const isFingerCurled = (tipIdx: number, mcpIdx: number) => {
        const tip = landmarks[tipIdx];
        const mcp = landmarks[mcpIdx];
        const distTipToMcp = this.dist(tip, mcp);
        
        // Threshold: If tip is within 1.0x (approx) of the base scale, it's likely curled.
        // An extended finger is usually > 1.5x the palm base length.
        return distTipToMcp < handSize * 0.9; // Tuned for reliability
    };

    const isIndexCurled = isFingerCurled(8, 5);
    const isMiddleCurled = isFingerCurled(12, 9);
    const isRingCurled = isFingerCurled(16, 13);
    const isPinkyCurled = isFingerCurled(20, 17);

    // Fist Detection: All main fingers curled
    if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) {
      return HandGesture.FIST;
    }

    // Index Bent (Serve Trigger)
    // We strictly check if Index is curled. 
    // To allow for "pointing" style play where other fingers might be loosely curled,
    // we prioritize FIST check first. If not a fist, but index is curled, it's a serve trigger.
    if (isIndexCurled) {
        return HandGesture.INDEX_BENT;
    }

    // Default: Open Palm / Pointing
    return HandGesture.OPEN_PALM;
  }
}