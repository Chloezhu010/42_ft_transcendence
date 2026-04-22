/**
 * Render a single accepted friend
 */
import type { FriendResponse } from '@api';
import StorageImage from '@/components/StorageImage';

interface FriendRowProps {
  friend: FriendResponse;
  onRemove?: (friendId: number) => void;
  isRemoving?: boolean;
}

export function FriendRow({ friend, onRemove, isRemoving = false }: FriendRowProps): JSX.Element {
  const avatarFallback = friend.username.charAt(0).toUpperCase();
  const onlineLabel = friend.is_online ? 'Online' : 'Offline';

  return (
    <div className="flex items-center gap-4 rounded-xl border border-brand-primary/10 bg-brand-light/30 p-4">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-brand-primary/15 bg-white">
        {friend.avatar_url ? (
          <StorageImage
            src={friend.avatar_url}
            alt={friend.username}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-brand-primary">{avatarFallback}</span>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-brand-dark">{friend.username}</p>
        <p className="text-sm text-brand-muted">{onlineLabel}</p>
      </div>

      {onRemove ? (
        <button
          type="button"
          disabled={isRemoving}
          onClick={() => onRemove(friend.id)}
          className="ml-auto rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRemoving ? 'Removing...' : 'Remove'}
        </button>
      ) : null}
    </div>
  );
}
