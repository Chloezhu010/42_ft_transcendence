import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiKeyResponse } from '@api';
import { useApiKeysPage } from '@/pages/api-keys/useApiKeysPage';

const {
  mockUseAuth,
  mockListApiKeys,
  mockCreateApiKey,
  mockRevokeApiKey,
  mockToastError,
  mockToastSuccess,
  mockT,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockListApiKeys: vi.fn(),
  mockCreateApiKey: vi.fn(),
  mockRevokeApiKey: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockT: vi.fn((key: string) => key),
}));

vi.mock('@/app/auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@api', () => ({
  listApiKeys: mockListApiKeys,
  createApiKey: mockCreateApiKey,
  revokeApiKey: mockRevokeApiKey,
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

const ACTIVE_KEY: ApiKeyResponse = {
  id: 1,
  user_id: 7,
  name: 'Production',
  key_prefix: 'wc_live_prod',
  is_active: true,
  created_at: '2026-05-08T10:00:00Z',
  last_used_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockT.mockImplementation((key: string) => key);
  mockUseAuth.mockReturnValue({ accessToken: 'test-token' });
  mockListApiKeys.mockResolvedValue([ACTIVE_KEY]);
  mockCreateApiKey.mockResolvedValue({
    ...ACTIVE_KEY,
    id: 2,
    name: 'New key',
    key_prefix: 'wc_live_new',
    key: 'wc_live_new_full_secret',
  });
  mockRevokeApiKey.mockResolvedValue(undefined);
});

async function setup() {
  const rendered = renderHook(() => useApiKeysPage());
  await waitFor(() => {
    expect(rendered.result.current.apiKeys).toContainEqual(ACTIVE_KEY);
  });
  return rendered;
}

describe('useApiKeysPage', () => {
  it('loads API keys for the current user', async () => {
    const { result } = await setup();

    expect(mockListApiKeys).toHaveBeenCalledWith('test-token');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadError).toBeNull();
  });

  it('sets a translated load error when initial loading fails', async () => {
    mockListApiKeys.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useApiKeysPage());

    await waitFor(() => {
      expect(result.current.loadError).toBe('apiKeys.errors.loadFailed');
    });
  });

  it('validates empty names before creating a key', async () => {
    const { result } = await setup();

    await act(async () => {
      result.current.setKeyName('   ');
    });
    await waitFor(() => {
      expect(result.current.keyName).toBe('   ');
    });
    await act(async () => {
      await result.current.createKey();
    });

    expect(mockCreateApiKey).not.toHaveBeenCalled();
    expect(result.current.actionError).toBe('apiKeys.errors.nameRequired');
    expect(mockToastError).toHaveBeenCalledWith('apiKeys.errors.nameRequired');
  });

  it('validates key name length before creating a key', async () => {
    const { result } = await setup();

    await act(async () => {
      result.current.setKeyName('x'.repeat(101));
    });
    await act(async () => {
      await result.current.createKey();
    });

    expect(mockCreateApiKey).not.toHaveBeenCalled();
    expect(result.current.actionError).toBe('apiKeys.errors.nameTooLong');
  });

  it('creates a key, stores the raw key once, and clears the draft name', async () => {
    const { result } = await setup();

    await act(async () => {
      result.current.setKeyName(' New key ');
    });
    await act(async () => {
      await result.current.createKey();
    });

    expect(mockCreateApiKey).toHaveBeenCalledWith('test-token', 'New key');
    expect(result.current.createdKey).toBe('wc_live_new_full_secret');
    expect(result.current.keyName).toBe('');
    expect(result.current.apiKeys[0]).toEqual(
      expect.objectContaining({ id: 2, name: 'New key', key: 'wc_live_new_full_secret' }),
    );
  });

  it('maps create 429 responses to the rate-limit message', async () => {
    const rateLimited = new Error('too many requests') as Error & { status: number };
    rateLimited.status = 429;
    mockCreateApiKey.mockRejectedValue(rateLimited);
    const { result } = await setup();

    await act(async () => {
      result.current.setKeyName('New key');
    });
    await act(async () => {
      await result.current.createKey();
    });

    expect(result.current.actionError).toBe('apiKeys.errors.rateLimited');
  });

  it('revokes a key by marking it inactive locally', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.revokeKey(ACTIVE_KEY.id);
    });

    expect(mockRevokeApiKey).toHaveBeenCalledWith('test-token', ACTIVE_KEY.id);
    expect(result.current.apiKeys[0].is_active).toBe(false);
    expect(mockToastSuccess).toHaveBeenCalledWith('apiKeys.notifications.revoked');
  });
});
