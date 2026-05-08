import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiKeyResponse } from '@api';
import { ApiKeysPage } from '@/pages/api-keys';

const { mockUseApiKeysPage, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockUseApiKeysPage: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock('@/pages/api-keys/useApiKeysPage', () => ({
  useApiKeysPage: mockUseApiKeysPage,
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      const translations: Record<string, string> = {
        'apiKeys.actions.confirmRevoke': 'Revoke this API key?',
        'apiKeys.actions.revoke': 'Revoke',
        'apiKeys.actions.revoking': 'Revoking...',
        'apiKeys.create.creating': 'Creating...',
        'apiKeys.create.label': 'Key name',
        'apiKeys.create.placeholder': 'Production integration',
        'apiKeys.create.submit': 'Create key',
        'apiKeys.created.copy': 'Copy key',
        'apiKeys.created.copied': 'API key copied',
        'apiKeys.created.copyFailed': 'Could not copy API key',
        'apiKeys.created.description': 'For security, this full key will only be shown once.',
        'apiKeys.created.dismiss': 'Dismiss',
        'apiKeys.created.title': 'Copy this key now',
        'apiKeys.description': 'Create and revoke keys for the public API.',
        'apiKeys.header.eyebrow': 'Public API',
        'apiKeys.list.count': `${options?.count ?? 0} keys`,
        'apiKeys.list.createdAt': 'Created',
        'apiKeys.list.empty': 'No API keys yet.',
        'apiKeys.list.lastUsedAt': 'Last used',
        'apiKeys.list.loading': 'Loading...',
        'apiKeys.list.neverUsed': 'Never used',
        'apiKeys.list.title': 'Existing keys',
        'apiKeys.status.active': 'Active',
        'apiKeys.status.revoked': 'Revoked',
        'apiKeys.title': 'API keys',
      };

      return translations[key] ?? key;
    },
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

function defaultHookValue(overrides = {}) {
  return {
    apiKeys: [ACTIVE_KEY],
    createdKey: null,
    keyName: '',
    setKeyName: vi.fn(),
    clearCreatedKey: vi.fn(),
    createKey: vi.fn(),
    revokeKey: vi.fn(),
    isLoading: false,
    isCreating: false,
    revokingIds: new Set<number>(),
    loadError: null,
    actionError: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseApiKeysPage.mockReturnValue(defaultHookValue());
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
  Object.defineProperty(window, 'confirm', {
    configurable: true,
    value: vi.fn(() => true),
  });
});

describe('ApiKeysPage', () => {
  it('renders the loading state', () => {
    mockUseApiKeysPage.mockReturnValue(defaultHookValue({ isLoading: true }));

    render(<ApiKeysPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the empty state', () => {
    mockUseApiKeysPage.mockReturnValue(defaultHookValue({ apiKeys: [] }));

    render(<ApiKeysPage />);

    expect(screen.getByRole('heading', { name: 'API keys' })).toBeInTheDocument();
    expect(screen.getByText('No API keys yet.')).toBeInTheDocument();
  });

  it('renders existing API key metadata without a raw key', () => {
    render(<ApiKeysPage />);

    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('wc_live_prod')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('wc_live_full_secret')).not.toBeInTheDocument();
  });

  it('submits the create form through the hook', () => {
    const setKeyName = vi.fn();
    const createKey = vi.fn();
    mockUseApiKeysPage.mockReturnValue(defaultHookValue({ keyName: 'New key', setKeyName, createKey }));

    render(<ApiKeysPage />);

    fireEvent.change(screen.getByLabelText('Key name'), { target: { value: 'Updated key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }));

    expect(setKeyName).toHaveBeenCalledWith('Updated key');
    expect(createKey).toHaveBeenCalledOnce();
  });

  it('renders and copies the one-time raw key with LTR direction', async () => {
    mockUseApiKeysPage.mockReturnValue(defaultHookValue({ createdKey: 'wc_live_full_secret' }));

    render(<ApiKeysPage />);

    expect(screen.getByText('wc_live_full_secret')).toHaveAttribute('dir', 'ltr');
    fireEvent.click(screen.getByRole('button', { name: 'Copy key' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('wc_live_full_secret');
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('API key copied');
  });

  it('confirms before revoking an active key', () => {
    const revokeKey = vi.fn();
    mockUseApiKeysPage.mockReturnValue(defaultHookValue({ revokeKey }));

    render(<ApiKeysPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));

    expect(window.confirm).toHaveBeenCalledWith('Revoke this API key?');
    expect(revokeKey).toHaveBeenCalledWith(ACTIVE_KEY.id);
  });
});
