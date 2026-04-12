/**
 * Role: Hold image-related helper functions with no React dependency.
 * Input: Storage filenames, URLs, data URLs, or raw base64 strings.
 * Flow: Resolve the image source once, then normalize it into the format the caller needs.
 */
import { BACKEND_BASE_URL } from '@/utils/runtimeConfig';

/**
 * Get full image URL from a storage filename.
 * Images are served as static files from the backend /images/ path.
 */
export function getImageUrl(filename: string | null | undefined): string | undefined {
  if (!filename) return undefined;
  if (filename.startsWith('data:') || filename.startsWith('http')) return filename;
  return `${BACKEND_BASE_URL}/images/${filename}`;
}

/**
 * Convert an image URL to base64.
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to convert image to base64'));
        return;
      }
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Normalize image source (data URL / absolute URL / stored filename / raw base64)
 * into pure base64 content expected by backend image update endpoints.
 */
export async function imageSourceToPureBase64(imageSource: string): Promise<string> {
  if (!imageSource) {
    throw new Error('Image source is empty');
  }

  if (imageSource.startsWith('data:')) {
    return imageSource.split(',')[1];
  }

  if (imageSource.startsWith('http')) {
    return urlToBase64(imageSource);
  }

  const resolvedUrl = getImageUrl(imageSource);
  if (resolvedUrl) {
    return urlToBase64(resolvedUrl);
  }

  // Fallback for callers that already pass pure base64.
  return imageSource;
}
