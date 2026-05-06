import type { StoryListItem, StoryVisibility } from '@api';

export type GallerySortKey = 'recent' | 'oldest' | 'title_asc' | 'title_desc';

export interface GalleryFilterState {
  searchQuery: string;
  visibility: 'all' | StoryVisibility;
  archetype: string;
}

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

function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.trim().toLowerCase();
}

function matchesSearchQuery(story: StoryListItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const searchable = [story.title, story.profile.name]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(' ');

  return searchable.includes(query);
}

export function filterStories(stories: StoryListItem[], filters: GalleryFilterState): StoryListItem[] {
  const normalizedQuery = normalizeText(filters.searchQuery);
  const normalizedArchetype = normalizeText(filters.archetype);

  return stories.filter((story) => {
    if (filters.visibility !== 'all' && story.visibility !== filters.visibility) {
      return false;
    }

    if (filters.archetype !== 'all') {
      const storyArchetype = normalizeText(story.profile.archetype);
      if (!storyArchetype || storyArchetype !== normalizedArchetype) {
        return false;
      }
    }

    return matchesSearchQuery(story, normalizedQuery);
  });
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function getSortableTitle(story: StoryListItem): string {
  return normalizeText(story.title ?? '');
}

function getSortableDate(story: StoryListItem): number {
  const timestamp = Date.parse(story.created_at);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortStories(stories: StoryListItem[], sortKey: GallerySortKey): StoryListItem[] {
  const withIndex = stories.map((story, index) => ({ story, index }));

  withIndex.sort((left, right) => {
    let comparison = 0;

    if (sortKey === 'recent' || sortKey === 'oldest') {
      const leftDate = getSortableDate(left.story);
      const rightDate = getSortableDate(right.story);
      comparison = rightDate - leftDate;
      if (sortKey === 'oldest') {
        comparison = -comparison;
      }
    } else if (sortKey === 'title_asc' || sortKey === 'title_desc') {
      const leftTitle = getSortableTitle(left.story);
      const rightTitle = getSortableTitle(right.story);
      comparison = compareStrings(leftTitle, rightTitle);
      if (sortKey === 'title_desc') {
        comparison = -comparison;
      }
    }

    if (comparison !== 0) {
      return comparison;
    }

    return left.index - right.index;
  });

  return withIndex.map((item) => item.story);
}

export function paginateStories(stories: StoryListItem[], page: number, pageSize: number): StoryListItem[] {
  const safePage = Math.max(1, page);
  const startIndex = (safePage - 1) * pageSize;
  return stories.slice(startIndex, startIndex + pageSize);
}
