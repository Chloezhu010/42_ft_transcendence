/**
 * Friends page.
 * Step 2a scaffold only: renders static sections with empty-state placeholders.
 * Data flows through useFriendsPage; no API work happens here yet.
 */
import { useFriendsPage } from './useFriendsPage';
import { FriendRow } from '@/components/friends/FriendRow';
import { PendingRequestRow } from '@/components/friends/PendingRequestRow';

export function FriendsPage(): JSX.Element {
  const { friends, pending, searchResults, isLoading, error } = useFriendsPage();

  function handleAccept(userId: number): void {
    console.log('accept request', userId);
  }

  function handleDecline(userId: number): void {
    console.log('decline request', userId);
  }

  function handleRemove(friendId: number): void {
    console.log('remove friend', friendId);
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
          {searchResults.length === 0 ? (
            <p className="text-brand-muted">Search results will appear here.</p>
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
