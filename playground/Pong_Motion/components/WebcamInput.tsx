import React, { useEffect, useRef, useState } from 'react';
import { VisionService } from '../services/visionService';
import { HandGesture } from '../types';

interface WebcamInputProps {
  onHandUpdate: (x: number, gesture: HandGesture) => void;
  onCameraReady: () => void;
}

const WebcamInput: React.FC<WebcamInputProps> = ({ onHandUpdate, onCameraReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visionRef = useRef<VisionService | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    // initialize vision service
    const initVision = async () => {
      const vision = new VisionService(onHandUpdate);
      await vision.initialize();
      visionRef.current = vision;
      
      // Start camera after vision is ready
      startCamera();
    };

    initVision();

    return () => {
      if (visionRef.current) {
        visionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          frameRate: { ideal: 30 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', () => {
          setHasPermission(true);
          onCameraReady();
          if (visionRef.current && videoRef.current && canvasRef.current) {
            // Pass both video and canvas to the service
            visionRef.current.start(videoRef.current, canvasRef.current);
          }
        });
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera permission is required to play!");
    }
  };

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border-2 border-white/20 shadow-lg bg-black">
      {!hasPermission && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
          Loading Camera...
        </div>
      )}
      {/* Mirror the video for natural feeling */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" 
      />
      {/* Canvas for Hand Tracking Overlay - also mirrored to match video */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
      />
      <div className="absolute bottom-2 left-2 text-[10px] text-white/50 font-mono z-10">
        FEED
      </div>
    </div>
  );
};

export default WebcamInput;