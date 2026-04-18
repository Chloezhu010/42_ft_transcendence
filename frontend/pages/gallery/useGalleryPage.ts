/**
 * Gallery page controller.
 * Owns loading, deletion, and the small amount of page state behind the gallery UI.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { deleteStory, getStories, type StoryListItem } from '@api';

interface UseGalleryPageResult {
  isLoading: boolean;
  stories: StoryListItem[];
  onDeleteStory: (storyId: number) => Promise<void>;
}

export function useGalleryPage(): UseGalleryPageResult {
  const { t } = useTranslation();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStories = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextStories = await getStories();
      setStories(nextStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
      const message = error instanceof Error ? error.message : 'Unknown error.';
      toast.error(`Failed to load stories: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const handleDeleteStory = useCallback(async (storyId: number) => {
    const shouldDelete = window.confirm(t('galleryPage.deleteStory'));
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteStory(storyId);
      setStories((previousStories) => previousStories.filter((story) => story.id !== storyId));
    } catch (error) {
      console.error('Failed to delete story:', error);
      toast.error('Failed to delete story.');
    }
  }, []);

  return {
    isLoading,
    stories,
    onDeleteStory: handleDeleteStory,
  };
}
