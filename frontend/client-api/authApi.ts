import { API_BASE, apiFetch } from './apiClient';
export interface TokenResponse {
    access_token: string;
    token_type: 'bearer';
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  created_at: string;
}

export interface PublicUserResponse {
  id: number;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  created_at: string;
}

export interface FriendResponse {
  id: number;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  friendship_status: 'pending' | 'accepted';
  is_requester: boolean;
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json() as { detail?: string };
        if (data.detail){
            return data.detail;
        }
    } catch {
        // Ignore JSON parsing errors and use fallback message
    }
    return fallback;
}

/**
 * Auth signup, login, logout
 */
export async function signup(email: string, username: string, password: string): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Signup failed'));
    }
    return (await response.json()) as TokenResponse;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Login failed'));
    }
    return (await response.json()) as TokenResponse;
}

export async function logout(accessToken: string): Promise<void> {
    const response = await apiFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Logout failed'));
    }
}

/**
 * User: getMe, updateMe, uploadAvatar, getUser
 */
export async function getMe(accessToken: string): Promise<UserResponse> {
    const response = await apiFetch(`${API_BASE}/users/me`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to fetch user info'));
    }
    return (await response.json()) as UserResponse;
}

export async function updateMe(accessToken: string, params: { username?: string; email?: string; }): Promise<UserResponse> {
    const response = await apiFetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to update user info'));
    }
    return (await response.json()) as UserResponse;
}

export async function uploadAvatar(accessToken: string, file: File): Promise<UserResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiFetch(`${API_BASE}/users/me/avatar`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to upload avatar'));
    }
    return (await response.json()) as UserResponse;
}

export async function getUser(userId: number): Promise<PublicUserResponse> {
    const response = await apiFetch(`${API_BASE}/users/${userId}`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to fetch user info'));
    }
    return (await response.json()) as PublicUserResponse;
}

/**
 * Friend: getFriends, getPendingFriends, sendFriendRequest, acceptFriendRequest, removeFriend
 */
export async function getFriends(accessToken: string): Promise<FriendResponse[]> {
    const response = await apiFetch(`${API_BASE}/friends`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to fetch friends'));
    }
    return (await response.json()) as FriendResponse[];
}

export async function getPendingFriendRequests(accessToken: string): Promise<FriendResponse[]> {
    const response = await apiFetch(`${API_BASE}/friends/pending`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to fetch pending friends'));
    }
    return (await response.json()) as FriendResponse[];
}

export async function sendFriendRequest(accessToken: string, userId: number): Promise<FriendResponse> {
    const response = await apiFetch(`${API_BASE}/friends/${userId}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to send friend request'));
    }
    return (await response.json()) as FriendResponse;
}

export async function acceptFriendRequest(accessToken: string, userId: number): Promise<FriendResponse> {
    const response = await apiFetch(`${API_BASE}/friends/${userId}/accept`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to accept friend request'));
    }
    return (await response.json()) as FriendResponse;
}

export async function removeFriend(accessToken: string, friendId: number): Promise<void> {
    const response = await apiFetch(`${API_BASE}/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to remove friend'));
    }
}
