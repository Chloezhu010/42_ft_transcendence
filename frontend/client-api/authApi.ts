import { API_BASE, apiFetch } from "./apiClient";

export interface UserResponse {
    id: number;
    email: string;
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

// Auth
export async function signup(email: string, username: string, password: string): Promise<void> {
    const response = await apiFetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
    });
    if (!response.ok) {
        const err = await response.json() as { detail: string };
        throw new Error(err.detail);
    }
}

export async function login(email: string, password: string): Promise<{ access_token: string }> {
    const response = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const err = await response.json() as { detail: string };
        throw new Error(err.detail);
    }
    return response.json() as Promise<{ access_token: string }>;
}

export async function logout(): Promise<void> {
    const response = await apiFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
    });
    if (!response.ok) {
        const err = await response.json() as { detail: string };
        throw new Error(err.detail);
    }
}

// User

// Friend