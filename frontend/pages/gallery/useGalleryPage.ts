/**
 * Gallery page controller.
 * Owns loading, deletion, and the small amount of page state behind the gallery UI.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { deleteStory, getStories, type StoryListItem, type StoryVisibility, updateStoryVisibility } from '@api';
import { useAuth } from '@/app/auth';

interface UseGalleryPageResult {
  isLoading: boolean;
  stories: StoryListItem[];
  onDeleteStory: (storyId: number) => Promise<void>;
  onUpdateVisibility: (storyId: number, visibility: StoryVisibility) => Promise<void>;
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
      const message = error instanceof Error ? error.message : t('galleryPage.errors.unknown');
      toast.error(t('galleryPage.notifications.loadFailed', { message }));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, t]);

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
    onDeleteStory: handleDeleteStory,
    onUpdateVisibility: handleUpdateVisibility,
  };
}
