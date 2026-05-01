import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FriendsPage } from '@/pages/friends';

const translations: Record<string, string> = {
  'friends.tabs.friends': 'Friends',
  'friends.tabs.pending': 'Pending',
  'friends.tabs.discover': 'Discover',
  'friends.panels.discover.searchLabel': 'Search users',
  'friends.buttons.viewLibrary': 'View Library',
  'friends.buttons.addFriend': 'Add Friend',
  'friends.buttons.requestSent': 'Request Sent',
  'friends.badges.respondPending': 'Respond in Pending',
};

const {
  mockUseAuth,
  mockGetFriends,
  mockGetPendingFriendRequests,
  mockGetOutgoingFriendRequests,
  mockSearchUsers,
  mockSendFriendRequest,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGetFriends: vi.fn(),
  mockGetPendingFriendRequests: vi.fn(),
  mockGetOutgoingFriendRequests: vi.fn(),
  mockSearchUsers: vi.fn(),
  mockSendFriendRequest: vi.fn(),
}));

vi.mock('@/app/auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock('@api', () => ({
  getFriends: mockGetFriends,
  getPendingFriendRequests: mockGetPendingFriendRequests,
  getOutgoingFriendRequests: mockGetOutgoingFriendRequests,
  searchUsers: mockSearchUsers,
  sendFriendRequest: mockSendFriendRequest,
}));

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderFriendsPage(initialEntry = '/friends'): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/friends"
          element={(
            <>
              <FriendsPage />
              <LocationProbe />
            </>
          )}
        />
        <Route path="/friends/:userId/library" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FriendsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      accessToken: 'friends-token',
    });

    mockGetFriends.mockResolvedValue([]);
    mockGetPendingFriendRequests.mockResolvedValue([
      {
        id: 2,
        username: 'bob',
        avatar_url: null,
        is_online: true,
        friendship_status: 'pending',
        is_requester: false,
      },
    ]);
    mockGetOutgoingFriendRequests.mockResolvedValue([]);
    mockSearchUsers.mockResolvedValue([
      {
        id: 1,
        username: 'alice',
        avatar_url: null,
        is_online: true,
        created_at: '2026-04-21T00:00:00Z',
      },
      {
        id: 2,
        username: 'bob',
        avatar_url: null,
        is_online: true,
        created_at: '2026-04-21T00:00:00Z',
      },
    ]);
    mockSendFriendRequest.mockResolvedValue({
      id: 1,
      username: 'alice',
      avatar_url: null,
      is_online: true,
      friendship_status: 'pending',
      is_requester: true,
    });
  });

  it('opens on the friends tab by default and falls back when tab is invalid', async () => {
    mockGetFriends.mockResolvedValue([
      {
        id: 7,
        username: 'dora',
        avatar_url: null,
        is_online: true,
        friendship_status: 'accepted',
        is_requester: true,
      },
    ]);

    renderFriendsPage('/friends?tab=invalid');

    await waitFor(() => {
      expect(mockGetFriends).toHaveBeenCalledWith('friends-token');
    });

    expect(screen.getByRole('tab', { name: /friends/i })).toHaveAttribute('aria-selected', 'true');
    const activePanel = within(screen.getByRole('tabpanel'));
    expect(activePanel.getByRole('heading', { level: 2, name: 'Friends' })).toBeInTheDocument();
    expect(activePanel.queryByRole('heading', { level: 2, name: 'Pending' })).not.toBeInTheDocument();
    expect(activePanel.queryByRole('heading', { level: 2, name: 'Discover' })).not.toBeInTheDocument();
  });

  it('uses the pending query tab and only shows the pending badge when count is positive', async () => {
    renderFriendsPage('/friends?tab=pending');

    await waitFor(() => {
      expect(mockGetPendingFriendRequests).toHaveBeenCalledWith('friends-token');
    });

    expect(screen.getByRole('tab', { name: /pending/i })).toHaveAttribute('aria-selected', 'true');
    const activePanel = within(screen.getByRole('tabpanel'));
    expect(activePanel.getByRole('heading', { level: 2, name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pending/i })).toHaveTextContent('1');
    expect(activePanel.queryByRole('heading', { level: 2, name: 'Friends' })).not.toBeInTheDocument();
  });

  it('opens the discover query tab and updates the query string when tabs change', async () => {
    mockGetPendingFriendRequests.mockResolvedValue([]);

    renderFriendsPage('/friends?tab=discover');

    await waitFor(() => {
      expect(mockGetFriends).toHaveBeenCalledWith('friends-token');
    });

    expect(screen.getByRole('tab', { name: 'Discover' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Search users')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/friends?tab=discover');
    expect(screen.queryByRole('tab', { name: /^pending 0$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /pending/i }));

    await waitFor(() => {
      expect(
        within(screen.getByRole('tabpanel')).getByRole('heading', { level: 2, name: 'Pending' }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/friends?tab=pending');

    fireEvent.click(screen.getByRole('tab', { name: /friends/i }));

    await waitFor(() => {
      expect(
        within(screen.getByRole('tabpanel')).getByRole('heading', { level: 2, name: 'Friends' }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/friends');
  });

  it('keeps sent requests out of the incoming pending section', async () => {
    renderFriendsPage('/friends?tab=discover');

    await waitFor(() => {
      expect(mockGetPendingFriendRequests).toHaveBeenCalledWith('friends-token');
    });

    fireEvent.change(screen.getByLabelText('Search users'), {
      target: { value: 'a' },
    });

    await waitFor(() => {
      expect(mockSearchUsers).toHaveBeenCalledWith('friends-token', 'a');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => {
      expect(mockSendFriendRequest).toHaveBeenCalledWith('friends-token', 1);
    });

    const discoverPanel = screen.getByRole('tabpanel');
    const discoverQueries = within(discoverPanel);
    expect(discoverQueries.getByText('Request Sent')).toBeInTheDocument();
    expect(discoverQueries.getByText('Respond in Pending')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /pending/i }));

    await waitFor(() => {
      expect(
        within(screen.getByRole('tabpanel')).getByRole('heading', { level: 2, name: 'Pending' }),
      ).toBeInTheDocument();
    });

    const pendingPanel = screen.getByRole('tabpanel');
    const pendingQueries = within(pendingPanel);
    expect(pendingQueries.getByText('bob')).toBeInTheDocument();
    expect(pendingQueries.queryByText('alice')).not.toBeInTheDocument();
  });

  it('navigates to a friend library when clicking an accepted friend row action', async () => {
    mockGetFriends.mockResolvedValue([
      {
        id: 7,
        username: 'dora',
        avatar_url: null,
        is_online: true,
        friendship_status: 'accepted',
        is_requester: true,
      },
    ]);

    renderFriendsPage('/friends');

    await waitFor(() => {
      expect(mockGetFriends).toHaveBeenCalledWith('friends-token');
    });

    fireEvent.click(screen.getByRole('button', { name: 'View Library' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/friends/7/library');
    });
  });
});
