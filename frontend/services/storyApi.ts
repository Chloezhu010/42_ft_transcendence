import { apiFetch, API_BASE } from './apiClient';

export interface KidProfileResponse {
  id: number;
  name: string;
  gender: 'boy' | 'girl' | 'neutral';
  skin_tone: string;
  hair_color: string;
  eye_color: string;
  favorite_color: string;
  dream: string | null;
  archetype: string | null;
  art_style: string | null;
  created_at: string;
}

export interface PanelResponse {
  id: number;
  panel_order: number;
  text: string;
  image_prompt: string | null;
  image_url: string | null;
}

export interface StoryDetailResponse {
  id: number;
  title: string | null;
  foreword: string | null;
  character_description: string | null;
  cover_image_prompt: string | null;
  cover_image_url: string | null;
  is_unlocked: boolean;
  created_at: string;
  updated_at: string;
  profile: KidProfileResponse;
  panels: PanelResponse[];
}

export interface StoryListItem {
  id: number;
  title: string | null;
  cover_image_url: string | null;
  is_unlocked: boolean;
  created_at: string;
  profile: KidProfileResponse;
}

export interface SaveStoryParams {
  profile: {
    name: string;
    gender: 'boy' | 'girl' | 'neutral';
    skin_tone: string;
    hair_color: string;
    eye_color: string;
    favorite_color: string;
    dream?: string;
    archetype?: string;
  };
  title?: string;
  foreword?: string;
  character_description?: string;
  cover_image_prompt?: string;
  cover_image_base64?: string;
  panels: Array<{
    panel_order: number;
    text: string;
    image_prompt?: string;
    image_base64?: string;
  }>;
}

/**
 * Save a complete story to the backend.
 */
export async function saveStory(params: SaveStoryParams): Promise<number> {
  const response = await apiFetch(`${API_BASE}/stories`, {
    method: 'POST',
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to save story: ${response.statusText}`);
  }

  const data = (await response.json()) as { id: number };
  return data.id;
}

export interface UpdateStoryParams {
  is_unlocked: boolean;
  cover_image_base64?: string;
  panels: Array<{
    panel_order: number;
    text: string;
    image_prompt?: string;
    image_base64?: string;
  }>;
}

/**
 * Update story panels.
 */
export async function updateStory(storyId: number, params: UpdateStoryParams): Promise<void> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to update story: ${response.statusText}`);
  }
}

/**
 * Update a single panel's image after editing.
 */
export async function updatePanelImage(
  storyId: number,
  panelOrder: number,
  imageBase64: string
): Promise<void> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}/panels/${panelOrder}`, {
    method: 'PATCH',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update panel image: ${response.statusText}`);
  }
}

/**
 * Get list of all saved stories.
 */
export async function getStories(): Promise<StoryListItem[]> {
  const response = await apiFetch(`${API_BASE}/stories`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stories: ${response.statusText}`);
  }

  return (await response.json()) as StoryListItem[];
}

/**
 * Get a single story with all its panels.
 */
export async function getStory(storyId: number): Promise<StoryDetailResponse> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch story: ${response.statusText}`);
  }

  return (await response.json()) as StoryDetailResponse;
}

/**
 * Delete a story.
 */
export async function deleteStory(storyId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete story: ${response.statusText}`);
  }
}
