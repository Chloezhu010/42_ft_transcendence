import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  acceptFriendRequest,
  getFriends,
  getMe,
  getPendingFriendRequests,
  getUser,
  login,
  logout,
  removeFriend,
  sendFriendRequest,
  signup,
  updateMe,
  uploadAvatar,
} from '@api';

afterEach(() => {
  vi.restoreAllMocks();
});

const USER_RESPONSE = {
  id: 1,
  email: 'alice@example.com',
  username: 'alice',
  avatar_url: 'avatars/alice.png',
  is_online: true,
  created_at: '2026-04-15T12:00:00Z',
};

const PUBLIC_USER_RESPONSE = {
  id: 1,
  username: 'alice',
  avatar_url: 'avatars/alice.png',
  is_online: true,
  created_at: '2026-04-15T12:00:00Z',
};

const FRIEND_RESPONSE = {
  id: 2,
  username: 'bob',
  avatar_url: 'avatars/bob.png',
  is_online: false,
  friendship_status: 'pending' as const,
  is_requester: true,
};

describe('authApi', () => {
  it('signup sends the expected payload and returns the auth token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'signup-token', token_type: 'bearer' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await signup('alice@example.com', 'alice', 'password123');

    expect(result).toEqual({
      access_token: 'signup-token',
      token_type: 'bearer',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/signup'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'alice@example.com',
          username: 'alice',
          password: 'password123',
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('signup surfaces backend detail for duplicate email errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Email already taken' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Bad Request',
      })
    );

    await expect(signup('alice@example.com', 'alice', 'password123')).rejects.toThrow(
      'Email already taken'
    );
  });

  it('signup formats structured validation errors from FastAPI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [
            {
              loc: ['body', 'email'],
              msg: 'value is not a valid email address',
              type: 'value_error',
            },
          ],
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
          statusText: 'Unprocessable Entity',
        }
      )
    );

    await expect(signup('not-an-email', 'alice', 'password123')).rejects.toThrow(
      'body.email: value is not a valid email address'
    );
  });

  it('login sends credentials and returns the auth token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'login-token', token_type: 'bearer' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await login('alice@example.com', 'password123');

    expect(result).toEqual({
      access_token: 'login-token',
      token_type: 'bearer',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'alice@example.com',
          password: 'password123',
        }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('login surfaces backend detail for invalid credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Unauthorized',
      })
    );

    await expect(login('alice@example.com', 'wrong-password')).rejects.toThrow(
      'Invalid email or password'
    );
  });

  it('logout sends the bearer token in Authorization', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Logged out successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(logout('logout-token')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer logout-token',
        }),
      })
    );
  });

  it('logout surfaces backend detail for unauthorized requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Unauthorized',
      })
    );

    await expect(logout('invalid-token')).rejects.toThrow('Could not validate credentials');
  });

  it('getMe sends the bearer token and returns the current user', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(USER_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await getMe('me-token');

    expect(result).toEqual(USER_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/me'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer me-token',
        }),
      })
    );
  });

  it('getMe surfaces backend detail when the token is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(getMe('invalid-token')).rejects.toThrow('Could not validate credentials');
  });

  it('updateMe sends a PATCH payload and returns the updated user', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ...USER_RESPONSE,
          username: 'alice-updated',
          email: 'updated@example.com',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await updateMe('update-token', {
      username: 'alice-updated',
      email: 'updated@example.com',
    });

    expect(result).toEqual({
      ...USER_RESPONSE,
      username: 'alice-updated',
      email: 'updated@example.com',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/me'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          username: 'alice-updated',
          email: 'updated@example.com',
        }),
        headers: expect.objectContaining({
          Authorization: 'Bearer update-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('updateMe surfaces backend detail for conflicting profile updates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Username already taken' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(updateMe('update-token', { username: 'bob' })).rejects.toThrow(
      'Username already taken'
    );
  });

  it('uploadAvatar sends multipart form data with the avatar file', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(USER_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' });

    const result = await uploadAvatar('avatar-token', file);

    expect(result).toEqual(USER_RESPONSE);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/users/me/avatar');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer avatar-token',
      })
    );
    expect(options.body).toBeInstanceOf(FormData);

    const formData = options.body as FormData;
    const uploadedFile = formData.get('file');
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe('avatar.png');
  });

  it('uploadAvatar surfaces backend detail for unsupported file types', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Unsupported file type' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const file = new File(['not-an-image'], 'avatar.txt', { type: 'text/plain' });

    await expect(uploadAvatar('avatar-token', file)).rejects.toThrow('Unsupported file type');
  });

  it('getUser fetches a public profile by user id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(PUBLIC_USER_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await getUser(42);

    expect(result).toEqual(PUBLIC_USER_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/42'),
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('getUser surfaces backend detail when the profile does not exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(getUser(9999)).rejects.toThrow('User not found');
  });

  it('getFriends sends the bearer token and returns the friend list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([FRIEND_RESPONSE]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await getFriends('friends-token');

    expect(result).toEqual([FRIEND_RESPONSE]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer friends-token',
        }),
      })
    );
  });

  it('getFriends surfaces backend detail when authorization fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(getFriends('invalid-token')).rejects.toThrow('Could not validate credentials');
  });

  it('getPendingFriendRequests returns incoming pending requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([FRIEND_RESPONSE]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await getPendingFriendRequests('pending-token');

    expect(result).toEqual([FRIEND_RESPONSE]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/pending'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer pending-token',
        }),
      })
    );
  });

  it('getPendingFriendRequests surfaces backend detail on auth failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Could not validate credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(getPendingFriendRequests('invalid-token')).rejects.toThrow(
      'Could not validate credentials'
    );
  });

  it('sendFriendRequest posts to the user friend endpoint and returns the friendship', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(FRIEND_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await sendFriendRequest('friend-token', 2);

    expect(result).toEqual(FRIEND_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/2'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer friend-token',
        }),
      })
    );
  });

  it('sendFriendRequest surfaces backend detail for duplicate requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'A friend request already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(sendFriendRequest('friend-token', 2)).rejects.toThrow(
      'A friend request already exists'
    );
  });

  it('acceptFriendRequest posts to the accept endpoint and returns the updated friendship', async () => {
    const acceptedFriend = {
      ...FRIEND_RESPONSE,
      friendship_status: 'accepted' as const,
      is_requester: false,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(acceptedFriend), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await acceptFriendRequest('friend-token', 2);

    expect(result).toEqual(acceptedFriend);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/2/accept'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer friend-token',
        }),
      })
    );
  });

  it('acceptFriendRequest surfaces backend detail for missing requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Friend request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(acceptFriendRequest('friend-token', 2)).rejects.toThrow(
      'Friend request not found'
    );
  });

  it('removeFriend sends DELETE to the friend endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Friend removed successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(removeFriend('friend-token', 2)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/2'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer friend-token',
        }),
      })
    );
  });

  it('removeFriend surfaces backend detail when the friendship is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Friendship not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(removeFriend('friend-token', 999)).rejects.toThrow('Friendship not found');
  });
});
