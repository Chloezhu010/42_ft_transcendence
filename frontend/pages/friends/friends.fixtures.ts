import type { FriendResponse, PublicUserResponse } from '@api';

export const USE_FRIENDS_MOCK_DATA = false;

export const MOCK_FRIENDS: FriendResponse[] = [
  {
    id: 101,
    username: 'Alice',
    avatar_url: null,
    is_online: true,
    friendship_status: 'accepted',
    is_requester: false,
  },
  {
    id: 102,
    username: 'Bob',
    avatar_url: null,
    is_online: false,
    friendship_status: 'accepted',
    is_requester: true,
  },
];

export const MOCK_PENDING_FRIENDS: FriendResponse[] = [
  {
    id: 201,
    username: 'Charlie',
    avatar_url: null,
    is_online: true,
    friendship_status: 'pending',
    is_requester: false,
  },
];

export const MOCK_DISCOVERABLE_USERS: PublicUserResponse[] = [
  { id: 101, username: 'Alice', avatar_url: null, is_online: true, created_at: '2026-04-21T00:00:00Z' },
  { id: 102, username: 'Bob', avatar_url: null, is_online: false, created_at: '2026-04-21T00:00:00Z' },
  { id: 201, username: 'Charlie', avatar_url: null, is_online: true, created_at: '2026-04-21T00:00:00Z' },
  { id: 301, username: 'Dana', avatar_url: null, is_online: true, created_at: '2026-04-21T00:00:00Z' },
  { id: 302, username: 'Eli', avatar_url: null, is_online: false, created_at: '2026-04-21T00:00:00Z' },
  { id: 303, username: 'Fatima', avatar_url: null, is_online: true, created_at: '2026-04-21T00:00:00Z' },
];
