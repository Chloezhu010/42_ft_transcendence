import type { FriendResponse } from '@api';
import { useTranslation } from 'react-i18next';
import { FriendRow } from '@/components/friends/FriendRow';
import { PendingRequestRow } from '@/components/friends/PendingRequestRow';
import { SearchUserRow } from '@/components/friends/SearchUserRow';
import type { SearchUserResult } from './friends.types';

interface FriendsPanelProps {
  friends: FriendResponse[];
  pendingActionIds: Set<number>;
  onOpenLibrary: (friendId: number) => void;
  onRemove: (friendId: number) => void;
}

export function FriendsPanel({
  friends,
  pendingActionIds,
  onOpenLibrary,
  onRemove,
}: FriendsPanelProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="friends-panel-heading" className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand-primary">
          {t('friends.panels.friends.eyebrow')}
        </p>
        <h2 id="friends-panel-heading" className="text-2xl font-semibold text-brand-dark">
          {t('friends.tabs.friends')}
        </h2>
      </div>

      {friends.length === 0 ? (
        <p className="text-brand-muted">{t('friends.panels.friends.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {friends.map((friend) => (
            <li key={friend.id}>
              <FriendRow
                friend={friend}
                onOpenLibrary={onOpenLibrary}
                onRemove={onRemove}
                isRemoving={pendingActionIds.has(friend.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface PendingPanelProps {
  pendingIncoming: FriendResponse[];
  pendingActionIds: Set<number>;
  onAccept: (userId: number) => void;
  onDecline: (userId: number) => void;
}

export function PendingPanel({
  pendingIncoming,
  pendingActionIds,
  onAccept,
  onDecline,
}: PendingPanelProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="pending-panel-heading" className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand-primary">
          {t('friends.panels.pending.eyebrow')}
        </p>
        <h2 id="pending-panel-heading" className="text-2xl font-semibold text-brand-dark">
          {t('friends.tabs.pending')}
        </h2>
      </div>

      {pendingIncoming.length === 0 ? (
        <p className="text-brand-muted">{t('friends.panels.pending.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {pendingIncoming.map((request) => (
            <li key={request.id}>
              <PendingRequestRow
                request={request}
                onAccept={onAccept}
                onDecline={onDecline}
                isActing={pendingActionIds.has(request.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface DiscoverPanelProps {
  searchQuery: string;
  searchResults: SearchUserResult[];
  isSearching: boolean;
  onSearchQueryChange: (value: string) => void;
  onSendRequest: (userId: number) => void;
}

export function DiscoverPanel({
  searchQuery,
  searchResults,
  isSearching,
  onSearchQueryChange,
  onSendRequest,
}: DiscoverPanelProps): JSX.Element {
  const { t } = useTranslation();
  const trimmedSearchQuery = searchQuery.trim();

  return (
    <section aria-labelledby="discover-panel-heading" className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand-primary">
          {t('friends.panels.discover.eyebrow')}
        </p>
        <h2 id="discover-panel-heading" className="text-2xl font-semibold text-brand-dark">
          {t('friends.tabs.discover')}
        </h2>
      </div>

      <div className="space-y-2">
        <label htmlFor="friend-search" className="block text-sm font-bold text-brand-muted">
          {t('friends.panels.discover.searchLabel')}
        </label>
        <input
          id="friend-search"
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={t('friends.panels.discover.searchPlaceholder')}
          className="w-full rounded-xl border border-brand-primary/20 bg-white px-4 py-3 text-brand-dark outline-none transition-colors focus:border-brand-primary"
        />
      </div>

      {trimmedSearchQuery === '' ? (
        <p className="text-brand-muted">{t('friends.panels.discover.emptyPrompt')}</p>
      ) : null}

      {isSearching ? (
        <p className="text-brand-muted">{t('friends.panels.discover.searching')}</p>
      ) : null}

      {!isSearching && trimmedSearchQuery !== '' && searchResults.length === 0 ? (
        <p className="text-brand-muted">{t('friends.panels.discover.noResults')}</p>
      ) : null}

      {!isSearching && searchResults.length > 0 ? (
        <ul className="space-y-2">
          {searchResults.map((user) => (
            <li key={user.id}>
              <SearchUserRow user={user} onSendRequest={onSendRequest} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
