/**
 * Friend library page controller.
 * Loads one friend's public profile plus the list of comics they shared with accepted friends.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFriendSharedStories, getUser, type PublicUserResponse, type StoryListItem } from '@api';
import { useAuth } from '@/app/auth';

interface UseFriendLibraryPageResult {
  friend: PublicUserResponse | null;
  friendUserId: number | null;
  isLoading: boolean;
  stories: StoryListItem[];
  errorMessage: string | null;
}

function parseUserId(rawUserId: string | undefined): number | null {
  if (!rawUserId) {
    return null;
  }

  const parsed = Number(rawUserId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function useFriendLibraryPage(): UseFriendLibraryPageResult {
  const { userId: rawUserId } = useParams<{ userId?: string }>();
  const { accessToken } = useAuth();
  const [friend, setFriend] = useState<PublicUserResponse | null>(null);
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const friendUserId = parseUserId(rawUserId);

  const loadLibrary = useCallback(async () => {
    if (!accessToken || !friendUserId) {
      setIsLoading(false);
      setErrorMessage('This friend library link is invalid.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [friendProfile, sharedStories] = await Promise.all([
        getUser(friendUserId),
        getFriendSharedStories(accessToken, friendUserId),
      ]);
      setFriend(friendProfile);
      setStories(sharedStories);
    } catch (error) {
      console.error('Failed to load friend library:', error);
      setFriend(null);
      setStories([]);
      setErrorMessage('This shared library is unavailable. You may no longer have access.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, friendUserId]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  return {
    friend,
    friendUserId,
    isLoading,
    stories,
    errorMessage,
  };
}
