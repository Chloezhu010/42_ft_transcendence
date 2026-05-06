/**
 * Typed client calls for story persistence endpoints.
 */
import { API_BASE, apiFetch } from './apiClient';
import { buildApiError } from './apiErrors';

export type StoryVisibility = 'private' | 'shared_with_friends';

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
  language: string | null;
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
  visibility: StoryVisibility;
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
  visibility: StoryVisibility;
  is_unlocked: boolean;
  created_at: string;
  profile: KidProfileResponse;
}

export interface StoryListResponse {
  items: StoryListItem[];
  total: number;
  page: number;
  page_size: number;
}

export type StoryListSortKey = 'recent' | 'oldest' | 'title_asc' | 'title_desc';

export interface StoryListQuery {
  search?: string;
  visibility?: StoryVisibility | 'all';
  archetype?: string;
  sort?: StoryListSortKey;
  page?: number;
  pageSize?: number;
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
    language?: string;
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
export async function saveStory(accessToken: string, params: SaveStoryParams): Promise<number> {
  const response = await apiFetch(`${API_BASE}/stories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
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
export async function updateStory(accessToken: string, storyId: number, params: UpdateStoryParams): Promise<void> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to update story');
  }
}

export async function updateStoryVisibility(
  accessToken: string,
  storyId: number,
  visibility: StoryVisibility
): Promise<StoryDetailResponse> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}/visibility`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ visibility }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to update story visibility');
  }

  return (await response.json()) as StoryDetailResponse;
}

/**
 * Update a single panel's image after editing.
 */
export async function updatePanelImage(
  accessToken: string,
  storyId: number,
  panelOrder: number,
  imageBase64: string
): Promise<void> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}/panels/${panelOrder}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update panel image: ${response.statusText}`);
  }
}

/**
 * Get list of all saved stories for the authenticated user.
 */
export async function getStories(accessToken: string, query: StoryListQuery = {}): Promise<StoryListResponse> {
  const params = new URLSearchParams();

  if (query.search) {
    params.set('search', query.search);
  }

  if (query.visibility) {
    params.set('visibility', query.visibility);
  }

  if (query.archetype) {
    params.set('archetype', query.archetype);
  }

  if (query.sort) {
    params.set('sort', query.sort);
  }

  if (query.page) {
    params.set('page', String(query.page));
  }

  if (query.pageSize) {
    params.set('page_size', String(query.pageSize));
  }

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}/stories?${queryString}` : `${API_BASE}/stories`;
  const response = await apiFetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to fetch stories');
  }

  return (await response.json()) as StoryListResponse;
}

/**
 * Get a single story with all its panels.
 */
export async function getStory(accessToken: string, storyId: number): Promise<StoryDetailResponse> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to fetch story');
  }

  return (await response.json()) as StoryDetailResponse;
}

export async function getFriendSharedStories(accessToken: string, userId: number): Promise<StoryListItem[]> {
  const response = await apiFetch(`${API_BASE}/friends/${userId}/stories`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to fetch friend library');
  }

  return (await response.json()) as StoryListItem[];
}

export async function getFriendSharedStory(
  accessToken: string,
  userId: number,
  storyId: number
): Promise<StoryDetailResponse> {
  const response = await apiFetch(`${API_BASE}/friends/${userId}/stories/${storyId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to fetch shared story');
  }

  return (await response.json()) as StoryDetailResponse;
}

/**
 * Delete a story.
 */
export async function deleteStory(accessToken: string, storyId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/stories/${storyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to delete story');
  }
}
