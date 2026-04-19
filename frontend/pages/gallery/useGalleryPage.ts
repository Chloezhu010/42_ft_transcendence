/**
 * Gallery page controller.
 * Owns loading, deletion, and the small amount of page state behind the gallery UI.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { deleteStory, getStories, type StoryListItem } from '@api';
import { useAuth } from '@/app/auth';

interface UseGalleryPageResult {
  isLoading: boolean;
  stories: StoryListItem[];
  onDeleteStory: (storyId: number) => Promise<void>;
}

export function useGalleryPage(): UseGalleryPageResult {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStories = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const nextStories = await getStories(accessToken);
      setStories(nextStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
      const message = error instanceof Error ? error.message : 'Unknown error.';
      toast.error(`Failed to load stories: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const handleDeleteStory = useCallback(async (storyId: number) => {
    if (!accessToken) return;
    const shouldDelete = window.confirm(t('galleryPage.deleteStory'));
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteStory(accessToken, storyId);
      setStories((previousStories) => previousStories.filter((story) => story.id !== storyId));
    } catch (error) {
      console.error('Failed to delete story:', error);
      toast.error('Failed to delete story.');
    }
  }, [accessToken, t]);

  return {
    isLoading,
    stories,
    onDeleteStory: handleDeleteStory,
  };
}
