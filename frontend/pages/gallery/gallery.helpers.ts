/**
 * Small pure helpers for gallery display text.
 */
export function getStoryDisplayTitle(title: string | null, fallbackTitle: string): string {
  return title || fallbackTitle;
}

export function formatStoryDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString();
}
