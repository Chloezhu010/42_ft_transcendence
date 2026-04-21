/**
 * Friends page.
 * Displays pending requests, read-only user discovery, and current friends.
 * Data flows through useFriendsPage; this file stays focused on layout.
 */
import StorageImage from '@/components/StorageImage';
import { useFriendsPage } from './useFriendsPage';
import { FriendRow } from '@/components/friends/FriendRow';
import { PendingRequestRow } from '@/components/friends/PendingRequestRow';
import { SearchUserRow } from '@/components/friends/SearchUserRow';

export function FriendsPage(): JSX.Element {
  const {
    friends,
    pending,
    searchResults,
    searchQuery,
    setSearchQuery,
    isLoading,
    isSearching,
    error,
  } = useFriendsPage();

  const trimmedSearchQuery = searchQuery.trim();

  function handleAccept(userId: number): void {
    console.log('accept request', userId);
  }

  function handleDecline(userId: number): void {
    console.log('decline request', userId);
  }

  function handleRemove(friendId: number): void {
    console.log('remove friend', friendId);
  }

  function handleSendRequest(userId: number): void {
    console.log('send friend request', userId);
  }

  if (isLoading) {
    return (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-rounded text-xl text-brand-muted">Loading…</p>
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-2xl rounded-2xl border-4 border-red-200 bg-white p-8 shadow-soft">
          <h1 className="text-center text-2xl font-bold text-brand-dark">Friends</h1>
          <p className="mt-4 text-center text-base font-medium text-red-600">{error}</p>
          <p className="mt-2 text-center text-sm text-brand-muted">
            Check your session and network requests, then try reloading the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center py-12">
      <div className="w-full max-w-5xl rounded-2xl border-4 border-brand-primary/20 bg-white p-10 shadow-soft space-y-8">
        <h1 className="text-center text-3xl font-bold text-brand-dark">Friends</h1>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-brand-dark">Pending</h2>
          {pending.length === 0 ? (
            <p className="text-brand-muted">No pending friend requests yet.</p>
          ) : (
            <ul className="space-y-2">
                {pending.map((req) => (
                    <li key={req.id}>
                        <PendingRequestRow
                            request={req}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                        />
                    </li>
                ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-brand-dark">Discover</h2>
          <div className="space-y-2">
            <label htmlFor="friend-search" className="block text-sm font-bold text-brand-muted">
              Search users
            </label>
            <input
              id="friend-search"
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search by username"
              className="w-full rounded-xl border border-brand-primary/20 bg-white px-4 py-3 text-brand-dark outline-none transition-colors focus:border-brand-primary"
            />
          </div>

          {trimmedSearchQuery === '' ? (
            <p className="text-brand-muted">Type a username to discover other users.</p>
          ) : null}

          {isSearching ? (
            <p className="text-brand-muted">Searching…</p>
          ) : null}

          {!isSearching && trimmedSearchQuery !== '' && searchResults.length === 0 ? (
            <p className="text-brand-muted">No users found.</p>
          ) : null}

          {!isSearching && searchResults.length > 0 ? (
            <ul className="space-y-2">
                {searchResults.map((user) => (
                    <li key={user.id}>
                        <SearchUserRow user={user} onSendRequest={handleSendRequest} />
                    </li>
                ))}
            </ul>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-brand-dark">Friends</h2>
          {friends.length === 0 ? (
            <p className="text-brand-muted">You have no friends added yet.</p>
          ) : (
            <ul className="space-y-2">
                {friends.map((friend) => (
                    <li key={friend.id}>
                        <FriendRow friend={friend} onRemove={handleRemove} />
                    </li>
                ))}
            </ul>
          )}
        </section>
        </div>
    </div>
  );
}
