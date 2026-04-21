/**
 * Render a single search result user with relationship-aware action.
 */
import StorageImage from '@/components/StorageImage';
import type { SearchUserResult } from '@/pages/friends/friends.types';

interface SearchUserRowProps {
    user: SearchUserResult;
    onSendRequest?: (userId: number) => void;
}

export function SearchUserRow({ user, onSendRequest }: SearchUserRowProps): JSX.Element {
    const avatarFallback = user.username.charAt(0).toUpperCase();
    const onlineLabel = user.is_online ? 'Online' : 'Offline';

    return (
        <div className="flex items-center gap-4 rounded-xl border border-brand-primary/10 bg-brand-light/30 p-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-brand-primary/15 bg-white">
                {user.avatar_url ? (
                <StorageImage
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-full w-full object-cover"
                />
                ) : (
                  <span className="text-sm font-bold text-brand-primary">{avatarFallback}</span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-brand-dark">{user.username}</p>
                <p className="text-sm text-brand-muted">{onlineLabel}</p>
            </div>

            <div className="shrink-0">
                {user.relationship === 'friend' && (
                    <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-semibold text-brand-primary">
                        Friends
                    </span>
                )}

                {user.relationship === 'pending' && (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
                        {user.isIncomingRequest ? 'Respond in Pending' : 'Pending'}
                    </span>
                )}

                {user.relationship === 'none' && (
                    <button
                        type="button"
                        disabled={!onSendRequest}
                        onClick={() => onSendRequest?.(user.id)}
                        className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        Add Friend
                    </button>
                )}
            </div>
        </div>
    );
}
