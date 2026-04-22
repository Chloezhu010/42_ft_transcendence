import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FriendsPage } from '@/pages/friends';

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

vi.mock('@api', () => ({
  getFriends: mockGetFriends,
  getPendingFriendRequests: mockGetPendingFriendRequests,
  getOutgoingFriendRequests: mockGetOutgoingFriendRequests,
  searchUsers: mockSearchUsers,
  sendFriendRequest: mockSendFriendRequest,
}));

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

  it('keeps sent requests out of the incoming pending section', async () => {
    render(<FriendsPage />);

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

    const discoverSection = screen.getByRole('heading', { name: 'Discover' }).closest('section');
    expect(discoverSection).not.toBeNull();

    const discoverQueries = within(discoverSection as HTMLElement);
    expect(discoverQueries.getByText('Request Sent')).toBeInTheDocument();
    expect(discoverQueries.getByText('Respond in Pending')).toBeInTheDocument();

    const pendingSection = screen.getByRole('heading', { name: 'Pending' }).closest('section');
    expect(pendingSection).not.toBeNull();

    const pendingQueries = within(pendingSection as HTMLElement);
    expect(pendingQueries.getByText('bob')).toBeInTheDocument();
    expect(pendingQueries.queryByText('alice')).not.toBeInTheDocument();
  });
});
