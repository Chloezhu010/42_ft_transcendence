/**
 * Render a single accepted friend
 */
import type { FriendUser } from '@/components/friends/friends.types';
import StorageImage from '@/components/StorageImage';

interface FriendRowProps {
  friend: FriendUser;
  onOpenLibrary?: (friendId: number) => void;
  onRemove?: (friendId: number) => void;
  isRemoving?: boolean;
}

export function FriendRow({ friend, onOpenLibrary, onRemove, isRemoving = false }: FriendRowProps): JSX.Element {
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

      <button
        type="button"
        onClick={() => onOpenLibrary?.(friend.id)}
        className="min-w-0 text-left transition-colors hover:text-brand-primary"
      >
        <p className="truncate text-lg font-semibold text-brand-dark">{friend.username}</p>
        <p className="text-sm text-brand-muted">{onlineLabel}</p>
      </button>

      {onOpenLibrary ? (
        <button
          type="button"
          onClick={() => onOpenLibrary(friend.id)}
          className="rounded-full border border-brand-primary/20 px-4 py-2 text-sm font-semibold text-brand-primary transition-colors hover:border-brand-primary hover:bg-white"
        >
          View Library
        </button>
      ) : null}

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
