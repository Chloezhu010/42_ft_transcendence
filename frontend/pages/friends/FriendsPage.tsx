/**
 * Friends page.
 * Step 2a scaffold only: renders static sections with empty-state placeholders.
 * Data flows through useFriendsPage; no API work happens here yet.
 */
import { useFriendsPage } from './useFriendsPage';

export function FriendsPage(): JSX.Element {
  const { friends, pending, searchResults, isLoading } = useFriendsPage();

  if (isLoading) {
    return (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-rounded text-xl text-brand-muted">Loading…</p>
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
          ) : null}
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
          ) : null}
        </section>
        </div>
    </div>
  );
}
