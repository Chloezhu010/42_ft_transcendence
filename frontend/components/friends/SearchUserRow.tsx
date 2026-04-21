/**
 * Render a single search result user
 */
import type { PublicUserResponse } from '@api';
import StorageImage from '@/components/StorageImage';

interface SearchUserRowProps {
    user: PublicUserResponse;
}

export function SearchUserRow({ user }: SearchUserRowProps): JSX.Element {
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

            <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-brand-dark">{user.username}</p>
                <p className="text-sm text-brand-muted">{onlineLabel}</p>
            </div>
        </div>
    );
}