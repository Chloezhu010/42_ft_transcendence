/**
 * Gallery page controller.
 * Owns loading, deletion, and the small amount of page state behind the gallery UI.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { deleteStory, getStories, type StoryListItem, type StoryVisibility, updateStoryVisibility } from '@api';
import { useAuth } from '@/app/auth';

interface UseGalleryPageResult {
  isLoading: boolean;
  stories: StoryListItem[];
  filteredStories: StoryListItem[];
  pagedStories: StoryListItem[];
  page: number;
  totalPages: number;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  sortKey: 'created_at' | 'title';
  sortDir: 'asc' | 'desc';
  setSearchQuery: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setSortKey: (value: 'created_at' | 'title') => void;
  setSortDir: (value: 'asc' | 'desc') => void;
  setPage: (value: number) => void;
  onDeleteStory: (storyId: number) => Promise<void>;
  onUpdateVisibility: (storyId: number, visibility: StoryVisibility) => Promise<void>;
}

const PAGE_SIZE = 12;

function parseDateInput(value: string): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function useGalleryPage(): UseGalleryPageResult {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<'created_at' | 'title'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const loadStories = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const nextStories = await getStories(accessToken);
      setStories(nextStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
      const message = error instanceof Error ? error.message : t('galleryPage.errors.unknown');
      toast.error(t('galleryPage.notifications.loadFailed', { message }));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, t]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFrom, dateTo, sortKey, sortDir]);

  const filteredStories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const fromDate = parseDateInput(dateFrom);
    const toDate = parseDateInput(dateTo);

    return stories.filter((story) => {
      const title = story.title ?? '';
      const matchesTitle = !query || title.toLowerCase().includes(query);

      if (!matchesTitle) {
        return false;
      }

      if (!fromDate && !toDate) {
        return true;
      }

      const storyDate = new Date(story.created_at);
      if (Number.isNaN(storyDate.getTime())) {
        return false;
      }

      const storyDay = new Date(
        storyDate.getFullYear(),
        storyDate.getMonth(),
        storyDate.getDate(),
      ).getTime();

      if (fromDate && storyDay < fromDate) {
        return false;
      }

      if (toDate && storyDay > toDate) {
        return false;
      }

      return true;
    });
  }, [stories, searchQuery, dateFrom, dateTo]);

  const sortedStories = useMemo(() => {
    const sorted = [...filteredStories];
    sorted.sort((a, b) => {
      if (sortKey === 'title') {
        const titleA = a.title ?? '';
        const titleB = b.title ?? '';
        const comparison = titleA.localeCompare(titleB);
        return sortDir === 'asc' ? comparison : -comparison;
      }

      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      const comparison = dateA - dateB;
      return sortDir === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredStories, sortKey, sortDir]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedStories.length / PAGE_SIZE));
  }, [sortedStories.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedStories = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return sortedStories.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedStories, page]);

  const handleDeleteStory = useCallback(async (storyId: number) => {
    if (!accessToken) return;
    const shouldDelete = window.confirm(t('galleryPage.deleteStory'));
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteStory(accessToken, storyId);
      setStories((previousStories) => previousStories.filter((story) => story.id !== storyId));
      toast.success(t('galleryPage.notifications.storyDeleted'));
    } catch (error) {
      console.error('Failed to delete story:', error);
      toast.error(t('galleryPage.notifications.deleteFailed'));
    }
  }, [accessToken, t]);

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

  return {
    isLoading,
    stories,
    filteredStories,
    pagedStories,
    page,
    totalPages,
    searchQuery,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    setSearchQuery,
    setDateFrom,
    setDateTo,
    setSortKey,
    setSortDir,
    setPage,
    onDeleteStory: handleDeleteStory,
    onUpdateVisibility: handleUpdateVisibility,
  };
}
