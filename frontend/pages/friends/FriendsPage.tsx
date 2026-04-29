/**
 * Friends page.
 * Displays pending requests, read-only user discovery, and current friends.
 * Data flows through useFriendsPage; this file stays focused on layout.
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFriendsPage } from './useFriendsPage';
import { DiscoverPanel, FriendsPanel, PendingPanel } from './FriendsPanels';

type FriendsTabKey = 'friends' | 'pending' | 'discover';

interface FriendsTabDefinition {
  key: FriendsTabKey;
  label: string;
  count?: number;
}

const DEFAULT_TAB: FriendsTabKey = 'friends';

function parseFriendsTab(tabValue: string | null): FriendsTabKey {
  if (tabValue === 'pending' || tabValue === 'discover' || tabValue === 'friends') {
    return tabValue;
  }

  return DEFAULT_TAB;
}

export function FriendsPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    friends,
    pendingIncoming,
    searchResults,
    searchQuery,
    setSearchQuery,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    pendingActionIds,
    isLoading,
    isSearching,
    loadError,
    actionError,
    clearActionError,
  } = useFriendsPage();

  const activeTab = parseFriendsTab(searchParams.get('tab'));
  const tabs = useMemo<FriendsTabDefinition[]>(
    () => [
      { key: 'friends', label: 'Friends', count: friends.length },
      { key: 'pending', label: 'Pending', count: pendingIncoming.length },
      { key: 'discover', label: 'Discover' },
    ],
    [friends.length, pendingIncoming.length],
  );

  function handleAccept(userId: number): void {
    void acceptRequest(userId);
  }

  function handleDecline(userId: number): void {
    void declineRequest(userId);
  }

  function handleRemove(friendId: number): void {
    void removeFriend(friendId);
  }

  function handleOpenLibrary(friendId: number): void {
    navigate(`/friends/${friendId}/library`);
  }

  function handleTabChange(nextTab: FriendsTabKey): void {
    const nextParams = new URLSearchParams(searchParams);

    if (nextTab === DEFAULT_TAB) {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }

    setSearchParams(nextParams);
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-rounded text-xl text-brand-muted">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-2xl rounded-2xl border-4 border-red-200 bg-white p-8 shadow-soft">
          <h1 className="text-center text-2xl font-bold text-brand-dark">Friends</h1>
          <p className="mt-4 text-center text-base font-medium text-red-600">{loadError}</p>
          <p className="mt-2 text-center text-sm text-brand-muted">
            Check your session and network requests, then try reloading the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center py-12">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl border-4 border-brand-primary/20 bg-white p-10 shadow-soft">
        <div className="space-y-2 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-brand-primary">Community</p>
          <h1 className="text-3xl font-bold text-brand-dark">Friends</h1>
          <p className="text-sm text-brand-muted">
            Switch between your current circle, pending requests, and discovery.
          </p>
        </div>

        {actionError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-red-700">{actionError}</p>
              <button
                type="button"
                onClick={clearActionError}
                className="shrink-0 text-sm font-semibold text-red-600 transition-colors hover:text-red-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-brand-primary/15 bg-brand-light/30 p-2">
          <div
            role="tablist"
            aria-label="Friends sections"
            className="grid grid-cols-1 gap-2 md:grid-cols-3"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const shouldShowCount = tab.key !== 'discover' && (tab.key !== 'pending' || (tab.count ?? 0) > 0);

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.key}-panel`}
                  id={`${tab.key}-tab`}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white text-brand-dark shadow-soft'
                      : 'text-brand-muted hover:bg-white/70 hover:text-brand-dark'
                  }`}
                >
                  <span>{tab.label}</span>
                  {shouldShowCount ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isActive ? 'bg-brand-primary text-white' : 'bg-white text-brand-primary'
                      }`}
                    >
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id={`${activeTab}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab}-tab`}
          className="rounded-2xl border border-brand-primary/10 bg-white p-6 shadow-soft"
        >
          {activeTab === 'friends' ? (
            <FriendsPanel
              friends={friends}
              pendingActionIds={pendingActionIds}
              onOpenLibrary={handleOpenLibrary}
              onRemove={handleRemove}
            />
          ) : null}

          {activeTab === 'pending' ? (
            <PendingPanel
              pendingIncoming={pendingIncoming}
              pendingActionIds={pendingActionIds}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ) : null}

          {activeTab === 'discover' ? (
            <DiscoverPanel
              searchQuery={searchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSearchQueryChange={setSearchQuery}
              onSendRequest={sendRequest}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
