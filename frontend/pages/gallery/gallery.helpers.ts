/**
 * Small pure helpers for gallery display text.
 */
export function getStoryDisplayTitle(title: string | null): string {
  return title || 'Untitled Masterpiece';
}

export function formatStoryDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString();
}
