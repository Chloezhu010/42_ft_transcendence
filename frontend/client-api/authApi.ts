import { API_BASE, apiFetch } from './apiClient';
import { buildApiError } from './apiErrors';

export interface TokenResponse {
    access_token: string;
    token_type: 'bearer';
}

export async function signup(email: string, username: string, password: string): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
    });
    if (!response.ok) {
        throw await buildApiError(response, 'Signup failed');
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
        throw await buildApiError(response, 'Login failed');
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
        throw await buildApiError(response, 'Logout failed');
    }
}
