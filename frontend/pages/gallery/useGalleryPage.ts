/**
 * Gallery page controller.
 * Owns loading, deletion, and the small amount of page state behind the gallery UI.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  deleteStory,
  getStories,
  type StoryListItem,
  type StoryListSortKey,
  type StoryVisibility,
  updateStoryVisibility,
} from '@api';
import { useAuth } from '@/app/auth';
import type { GallerySortKey } from './gallery.helpers';

interface UseGalleryPageResult {
  isLoading: boolean;
  stories: StoryListItem[];
  visibleStories: StoryListItem[];
  filteredCount: number;
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  searchQuery: string;
  visibilityFilter: 'all' | StoryVisibility;
  archetypeFilter: string;
  sortKey: GallerySortKey;
  onDeleteStory: (storyId: number) => Promise<void>;
  onUpdateVisibility: (storyId: number, visibility: StoryVisibility) => Promise<void>;
  onSearchChange: (nextValue: string) => void;
  onVisibilityFilterChange: (nextValue: 'all' | StoryVisibility) => void;
  onArchetypeFilterChange: (nextValue: string) => void;
  onSortChange: (nextValue: GallerySortKey) => void;
  onPageChange: (nextPage: number) => void;
  onResetFilters: () => void;
}

const DEFAULT_PAGE_SIZE = 8;
const DEFAULT_SORT: GallerySortKey = 'recent';

export function useGalleryPage(): UseGalleryPageResult {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | StoryVisibility>('all');
  const [archetypeFilter, setArchetypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState<GallerySortKey>(DEFAULT_SORT);
  const [page, setPage] = useState(1);

  const loadStories = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const response = await getStories(accessToken, {
        search: searchQuery || undefined,
        visibility: visibilityFilter,
        archetype: archetypeFilter === 'all' ? undefined : archetypeFilter,
        sort: sortKey as StoryListSortKey,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      setStories(response.items);
      setTotalCount(response.total);
    } catch (error) {
      console.error('Failed to load stories:', error);
      const message = error instanceof Error ? error.message : t('galleryPage.errors.unknown');
      toast.error(t('galleryPage.notifications.loadFailed', { message }));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, archetypeFilter, page, searchQuery, sortKey, t, visibilityFilter]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleStories = useMemo(() => stories, [stories]);

  const handleDeleteStory = useCallback(async (storyId: number) => {
    if (!accessToken) return;
    const shouldDelete = window.confirm(t('galleryPage.deleteStory'));
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteStory(accessToken, storyId);
      void loadStories();
      toast.success(t('galleryPage.notifications.storyDeleted'));
    } catch (error) {
      console.error('Failed to delete story:', error);
      toast.error(t('galleryPage.notifications.deleteFailed'));
    }
  }, [accessToken, loadStories, t]);

  const handleUpdateVisibility = useCallback(async (storyId: number, visibility: StoryVisibility) => {
    if (!accessToken) return;

    const previousStory = stories.find((story) => story.id === storyId);
    if (!previousStory) {
      return;
    }

    setStories((currentStories) => currentStories.map((story) => (
      story.id === storyId ? { ...story, visibility } : story
    )));

    try {
      const updatedStory = await updateStoryVisibility(accessToken, storyId, visibility);
      setStories((currentStories) => currentStories.map((story) => (
        story.id === storyId ? { ...story, visibility: updatedStory.visibility } : story
      )));
      const successMessage = visibility === 'shared_with_friends'
        ? t('galleryPage.notifications.sharedWithFriends')
        : t('galleryPage.notifications.setPrivate');
      toast.success(successMessage);
    } catch (error) {
      console.error('Failed to update story visibility:', error);
      setStories((currentStories) => currentStories.map((story) => (
        story.id === storyId ? { ...story, visibility: previousStory.visibility } : story
      )));
      toast.error(t('galleryPage.notifications.shareFailed'));
    }
  }, [accessToken, stories, t]);

  const handleSearchChange = useCallback((nextValue: string) => {
    setSearchQuery(nextValue);
    setPage(1);
  }, []);

  const handleVisibilityFilterChange = useCallback((nextValue: 'all' | StoryVisibility) => {
    setVisibilityFilter(nextValue);
    setPage(1);
  }, []);

  const handleArchetypeFilterChange = useCallback((nextValue: string) => {
    setArchetypeFilter(nextValue);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((nextValue: GallerySortKey) => {
    setSortKey(nextValue);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setVisibilityFilter('all');
    setArchetypeFilter('all');
    setSortKey(DEFAULT_SORT);
    setPage(1);
  }, []);

  return {
    isLoading,
    stories,
    visibleStories,
    filteredCount: stories.length,
    totalCount,
    page,
    totalPages,
    pageSize: DEFAULT_PAGE_SIZE,
    searchQuery,
    visibilityFilter,
    archetypeFilter,
    sortKey,
    onDeleteStory: handleDeleteStory,
    onUpdateVisibility: handleUpdateVisibility,
    onSearchChange: handleSearchChange,
    onVisibilityFilterChange: handleVisibilityFilterChange,
    onArchetypeFilterChange: handleArchetypeFilterChange,
    onSortChange: handleSortChange,
    onPageChange: handlePageChange,
    onResetFilters: handleResetFilters,
  };
}
