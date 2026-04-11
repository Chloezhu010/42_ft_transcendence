import { apiFetch, API_BASE } from './apiClient';
import { imageSourceToPureBase64 } from './imageUtils';
import { StoryDetailResponse } from './storyApi';

export interface KidProfileForGeneration {
  name: string;
  gender: 'boy' | 'girl' | 'neutral';
  skin_tone: string;
  hair_color: string;
  eye_color: string;
  favorite_color: string;
  dream?: string;
  archetype?: string;
  art_style?: string;
  photo_base64?: string; // Pure base64, no data URL prefix
}

export interface GeneratedPanel {
  id: string;
  text: string;
  imagePrompt: string;
}

export interface GeneratedStoryScript {
  title: string;
  foreword: string;
  characterDescription: string;
  coverImagePrompt: string;
  panels: GeneratedPanel[];
}

export interface GenerateAndSaveStoryResponse {
  story: StoryDetailResponse;
}

/**
 * Generate story script + images and save to DB.
 */
export async function generateAndSaveStory(
  profile: KidProfileForGeneration
): Promise<GenerateAndSaveStoryResponse> {
  const response = await apiFetch(`${API_BASE}/stories/generate`, {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to generate story: ${response.statusText}`);
  }

  return (await response.json()) as GenerateAndSaveStoryResponse;
}

/**
 * Generate a story script using Gemini AI.
 */
export async function generateStoryScript(
  profile: KidProfileForGeneration
): Promise<GeneratedStoryScript> {
  const response = await apiFetch(`${API_BASE}/generate/story-script`, {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to generate story: ${response.statusText}`);
  }

  return (await response.json()) as GeneratedStoryScript;
}

/**
 * Generate a comic panel image using Gemini AI.
 */
export async function generatePanelImage(
  prompt: string,
  castGuide: string,
  artStyle?: string
): Promise<string> {
  const response = await apiFetch(`${API_BASE}/generate/panel-image`, {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      cast_guide: castGuide,
      style: artStyle,
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to generate image: ${response.statusText}`);
  }

  const data = (await response.json()) as { image_base64: string };
  return `data:image/png;base64,${data.image_base64}`;
}

/**
 * Edit an existing comic panel image using Gemini AI.
 */
export async function editPanelImage(
  imageSource: string,
  editPrompt: string,
  originalPrompt: string,
  castGuide: string,
  style?: string
): Promise<string> {
  const pureBase64 = await imageSourceToPureBase64(imageSource);

  const response = await apiFetch(`${API_BASE}/generate/edit-image`, {
    method: 'POST',
    body: JSON.stringify({
      image_base64: pureBase64,
      original_prompt: originalPrompt,
      edit_prompt: editPrompt,
      cast_guide: castGuide,
      style,
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to edit image: ${response.statusText}`);
  }

  const data = (await response.json()) as { image_base64: string };
  return `data:image/png;base64,${data.image_base64}`;
}
