/**
 * Client-side square avatar cropper.
 * Lets the user pick a file, zoom, and emit a 512x512 JPEG File ready for upload.
 * Uses only <canvas> + pointer events — no external crop library.
 */
import { useEffect, useRef, useState } from 'react';
import { SketchyButton } from '@/components/design-system/Primitives';

const OUTPUT_SIZE = 512; // final square size sent to backend
const OUTPUT_TYPE = 'image/jpeg';
const OUTPUT_QUALITY = 0.9;
const VIEW_SIZE = 280; // on-screen preview box

interface AvatarCropperProps {
  file: File;
  onCancel: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export function AvatarCropper({ file, onCancel, onCropComplete }: AvatarCropperProps): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load file into an object URL on mount; revoke on unmount to avoid leaks.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Render the center-cropped square at OUTPUT_SIZE and emit as a File.
  function handleConfirm(): void {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Compute source square (center crop of the original image), scaled by zoom.
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const srcSize = minDim / zoom;
    const sx = (img.naturalWidth - srcSize) / 2;
    const sy = (img.naturalHeight - srcSize) / 2;
    ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      blob => {
        if (!blob) return;
        const cropped = new File([blob], `avatar-${Date.now()}.jpg`, { type: OUTPUT_TYPE });
        onCropComplete(cropped);
      },
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative overflow-hidden rounded-full border-4 border-brand-primary/20 bg-brand-light"
        style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
      >
        {imageUrl && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Avatar preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
            }}
          />
        )}
      </div>
      <label className="flex items-center gap-3 text-sm text-brand-muted">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
        />
      </label>
      <div className="flex gap-3">
        <SketchyButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </SketchyButton>
        <SketchyButton type="button" onClick={handleConfirm}>
          Use photo
        </SketchyButton>
      </div>
    </div>
  );
}
