import { API_BASE, apiFetch } from './apiClient';
import { buildApiError } from './apiErrors';

export interface FriendResponse {
  id: number;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  friendship_status: 'pending' | 'accepted';
  is_requester: boolean;
}

export async function getFriends(accessToken: string): Promise<FriendResponse[]> {
    const response = await apiFetch(`${API_BASE}/friends/`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) {
        throw await buildApiError(response, 'Failed to fetch friends');
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
        throw await buildApiError(response, 'Failed to fetch pending friends');
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
        throw await buildApiError(response, 'Failed to send friend request');
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
        throw await buildApiError(response, 'Failed to accept friend request');
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
        throw await buildApiError(response, 'Failed to remove friend');
    }
}
