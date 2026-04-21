/**
 * Render a single incoming pending friend request
 */
import type { FriendResponse } from '@api';
import StorageImage from '@/components/StorageImage';

interface PendingRequestRowProps {
  request: FriendResponse;
  onAccept?: (userId: number) => void;
  onDecline?: (userId: number) => void;
}

export function PendingRequestRow({ request, onAccept, onDecline }: PendingRequestRowProps): JSX.Element {
  const avatarFallback = request.username.charAt(0).toUpperCase();
  const onlineLabel = request.is_online ? 'Online' : 'Offline';

  return (
    <div className="flex items-center gap-4 rounded-xl border border-brand-primary/10 bg-brand-light/30 p-4">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-brand-primary/15 bg-white">
        {request.avatar_url ? (
          <StorageImage
            src={request.avatar_url}
            alt={request.username}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-brand-primary">{avatarFallback}</span>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-brand-dark">{request.username}</p>
        <p className="text-sm text-brand-muted">{onlineLabel}</p>
      </div>

      {(onAccept || onDecline) ? (
        <div className="ml-auto flex items-center gap-2">
          {onDecline ? (
            <button
              type="button"
              onClick={() => onDecline(request.id)}
              className="rounded-full border border-brand-primary/15 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:border-brand-primary/25 hover:text-brand-dark"
            >
              Decline
            </button>
          ) : null}
          {onAccept ? (
            <button
              type="button"
              onClick={() => onAccept(request.id)}
              className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Accept
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
