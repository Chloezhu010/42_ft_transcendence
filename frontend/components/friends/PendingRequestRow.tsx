/**
 * Render a single incoming pending friend request
 */
import type { FriendUser } from '@/components/friends/friends.types';
import { useTranslation } from 'react-i18next';
import StorageImage from '@/components/StorageImage';

interface PendingRequestRowProps {
  request: FriendUser;
  onAccept?: (userId: number) => void;
  onDecline?: (userId: number) => void;
  isActing?: boolean;
}

export function PendingRequestRow({
  request,
  onAccept,
  onDecline,
  isActing = false,
}: PendingRequestRowProps): JSX.Element {
  const { t } = useTranslation();
  const avatarFallback = request.username.charAt(0).toUpperCase();
  const onlineLabel = request.is_online ? t('friends.status.online') : t('friends.status.offline');

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
        <div className="ms-auto flex items-center gap-2">
          {onDecline ? (
            <button
              type="button"
              disabled={isActing}
              onClick={() => onDecline(request.id)}
              className="rounded-full border border-brand-primary/15 px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:border-brand-primary/25 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('friends.buttons.decline')}
            </button>
          ) : null}
          {onAccept ? (
            <button
              type="button"
              disabled={isActing}
              onClick={() => onAccept(request.id)}
              className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isActing ? t('friends.buttons.working') : t('friends.buttons.accept')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
