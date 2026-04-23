import type { StoryVisibility } from '@api';

/**
 * Small pure helpers for gallery display text.
 */
export function getStoryDisplayTitle(title: string | null, fallbackTitle: string): string {
  return title || fallbackTitle;
}

export function formatStoryDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString();
}

export function getVisibilityLabel(visibility: StoryVisibility): string {
  return visibility === 'shared_with_friends' ? 'Share with friends' : 'Private';
}
