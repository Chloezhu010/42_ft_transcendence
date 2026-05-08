import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiKey, listApiKeys, revokeApiKey } from '@api';

const API_KEY = {
  id: 1,
  user_id: 7,
  name: 'Production integration',
  key_prefix: 'wc_live_abcd1234',
  is_active: true,
  created_at: '2026-05-08T10:00:00Z',
  last_used_at: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

function mockJsonFetch(body: unknown, status = 200): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function getAuthHeader(init: RequestInit | undefined): string | undefined {
  const headers = init?.headers;
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get('Authorization') ?? undefined;
  return (headers as Record<string, string>)['Authorization'];
}

describe('apiKeyApi', () => {
  it('lists API keys with the bearer token', async () => {
    const fetchSpy = mockJsonFetch([API_KEY]);

    const result = await listApiKeys('access-token');

    expect(result).toEqual([API_KEY]);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/api-keys$/);
    expect(init?.method).toBe('GET');
    expect(getAuthHeader(init)).toBe('Bearer access-token');
  });

  it('creates an API key with the expected payload and returns the raw key once', async () => {
    const fetchSpy = mockJsonFetch({ ...API_KEY, key: 'wc_live_full_secret' });

    const result = await createApiKey('access-token', 'Production integration');

    expect(result.key).toBe('wc_live_full_secret');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/api-keys$/);
    expect(init?.method).toBe('POST');
    expect(getAuthHeader(init)).toBe('Bearer access-token');
    expect(init?.body).toBe(JSON.stringify({ name: 'Production integration' }));
  });

  it('revokes an API key with DELETE and the bearer token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(revokeApiKey('access-token', 12)).resolves.toBeUndefined();

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/api-keys\/12$/);
    expect(init?.method).toBe('DELETE');
    expect(getAuthHeader(init)).toBe('Bearer access-token');
  });

  it('surfaces backend error detail on create failures', async () => {
    mockJsonFetch({ detail: 'API key management rate limit exceeded. Please try again later.' }, 429);

    await expect(createApiKey('access-token', 'Too fast')).rejects.toThrow(
      'API key management rate limit exceeded. Please try again later.',
    );
  });
});
