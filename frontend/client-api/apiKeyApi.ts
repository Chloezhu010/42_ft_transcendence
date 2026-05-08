import { API_BASE, apiFetch } from './apiClient';
import { buildApiError } from './apiErrors';

export interface ApiKeyResponse {
  id: number;
  user_id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreateResponse extends ApiKeyResponse {
  key: string;
}

export async function listApiKeys(accessToken: string): Promise<ApiKeyResponse[]> {
  const response = await apiFetch(`${API_BASE}/api-keys`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to load API keys');
  }

  return (await response.json()) as ApiKeyResponse[];
}

export async function createApiKey(
  accessToken: string,
  name: string,
): Promise<ApiKeyCreateResponse> {
  const response = await apiFetch(`${API_BASE}/api-keys`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to create API key');
  }

  return (await response.json()) as ApiKeyCreateResponse;
}

export async function revokeApiKey(accessToken: string, keyId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Failed to revoke API key');
  }
}
