import { API_BASE, apiFetch } from './apiClient';
import { buildApiError } from './apiErrors';

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

export async function getMe(accessToken: string): Promise<UserResponse> {
    const response = await apiFetch(`${API_BASE}/users/me`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch user info');
    }
    return (await response.json()) as UserResponse;
}

export async function updateMe(
    accessToken: string,
    params: { username?: string; email?: string; }
): Promise<UserResponse> {
    const response = await apiFetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to update user info');
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
        throw await buildApiError(response, 'Failed to upload avatar');
    }
    return (await response.json()) as UserResponse;
}

export async function getUser(userId: number): Promise<PublicUserResponse> {
    const response = await apiFetch(`${API_BASE}/users/${userId}`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch user info');
    }
    return (await response.json()) as PublicUserResponse;
}

export async function searchUsers(accessToken: string, query: string): Promise<PublicUserResponse[]> {
    const trimmed = query.trim();
    if (!trimmed) {
        return [];
    }
    const response = await apiFetch(`${API_BASE}/users/search?q=${encodeURIComponent(trimmed)}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to search users');
    }
    return (await response.json()) as PublicUserResponse[];
}
