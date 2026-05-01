import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusPage } from '@/pages/status';

const {
  mockGetHealthStatus,
  mockGetBackupStatus,
  mockTriggerBackup,
  mockUseAuth,
} = vi.hoisted(() => ({
  mockGetHealthStatus: vi.fn(),
  mockGetBackupStatus: vi.fn(),
  mockTriggerBackup: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('@api', () => ({
  getHealthStatus: mockGetHealthStatus,
  getBackupStatus: mockGetBackupStatus,
  triggerBackup: mockTriggerBackup,
}));

vi.mock('@/app/auth/useAuth', () => ({
  useAuth: mockUseAuth,
}));

interface TranslationOptions {
  count?: number;
  defaultValue?: string;
}

vi.mock('react-i18next', () => {
  const t = (key: string, options?: TranslationOptions): string => {
    const translations: Record<string, string> = {
      'statusPage.title': 'System Status',
      'statusPage.loading': 'Loading…',
      'statusPage.loadingAria': 'Loading status',
      'statusPage.health.title': 'Health',
      'statusPage.health.healthy': 'Healthy',
      'statusPage.health.unhealthy': 'Unhealthy',
      'statusPage.health.checks.database': 'Database',
      'statusPage.health.results.ok': 'ok',
      'statusPage.health.results.unavailable': 'unavailable',
      'statusPage.backups.title': 'Backups',
      'statusPage.backups.lastBackup': 'Last backup:',
      'statusPage.backups.empty': 'No backups available yet.',
      'statusPage.backups.actions.backUpNow': 'Back up now',
      'statusPage.backups.actions.backingUp': 'Backing up…',
      'statusPage.errors.loadFailed': 'Failed to load status',
      'statusPage.errors.triggerFailed': 'Failed to trigger backup',
    };

    if (key === 'statusPage.backups.snapshotCount') {
      const count = options?.count ?? 0;
      const snapshotLabel = count === 1 ? 'snapshot' : 'snapshots';
      return `${count} ${snapshotLabel} available`;
    }

    return translations[key] ?? options?.defaultValue ?? key;
  };

  return {
    useTranslation: () => ({ t }),
  };
});

const HEALTHY_STATUS = {
  status: 'healthy' as const,
  version: '1.0.0',
  checks: { database: 'ok' },
};

const UNHEALTHY_STATUS = {
  status: 'unhealthy' as const,
  version: '1.0.0',
  checks: { database: 'unavailable' },
};

const BACKUP_STATUS_WITH_ENTRIES = {
  last_backup: '2026-04-26T10:00:00+00:00',
  total_backups: 2,
  backups: [
    {
      filename: 'wondercomic_20260426_100000.db',
      size_bytes: 204800,
      created_at: '2026-04-26T10:00:00+00:00',
    },
    {
      filename: 'wondercomic_20260425_100000.db',
      size_bytes: 196608,
      created_at: '2026-04-25T10:00:00+00:00',
    },
  ],
};

const BACKUP_STATUS_EMPTY = {
  last_backup: null,
  total_backups: 0,
  backups: [],
};

const TRIGGER_BACKUP_STATUS = {
  last_backup: '2026-04-27T00:00:00+00:00',
  total_backups: 3,
  backups: [
    {
      filename: 'wondercomic_20260427_000000_000000.db',
      size_bytes: 102400,
      created_at: '2026-04-27T00:00:00+00:00',
    },
    {
      filename: 'wondercomic_20260426_100000_000000.db',
      size_bytes: 204800,
      created_at: '2026-04-26T10:00:00+00:00',
    },
    {
      filename: 'wondercomic_20260425_100000_000000.db',
      size_bytes: 196608,
      created_at: '2026-04-25T10:00:00+00:00',
    },
  ],
};

function renderStatusPage(): void {
  render(
    <MemoryRouter>
      <StatusPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetHealthStatus.mockResolvedValue(HEALTHY_STATUS);
  mockGetBackupStatus.mockResolvedValue(BACKUP_STATUS_WITH_ENTRIES);
  mockTriggerBackup.mockResolvedValue(TRIGGER_BACKUP_STATUS);
  mockUseAuth.mockReturnValue({
    accessToken: 'test-token',
    currentUser: { id: 1, username: 'admin', email: 'admin@example.com', avatar_url: null, is_online: true, is_admin: true, created_at: '2026-01-01T00:00:00+00:00' },
  });
});

describe('StatusPage', () => {
  describe('page heading', () => {
    it('renders a system status heading', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /system status/i })).toBeInTheDocument();
      });
    });
  });

  describe('health status section', () => {
    it('shows the healthy indicator when backend is healthy', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/healthy/i)).toBeInTheDocument();
      });
    });

    it('shows database check status', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/database/i)).toBeInTheDocument();
      });
    });

    it('shows unhealthy indicator when backend reports database failure', async () => {
      mockGetHealthStatus.mockResolvedValue(UNHEALTHY_STATUS);
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/unhealthy/i)).toBeInTheDocument();
      });
    });

    it('shows version information', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
      });
    });
  });

  describe('backup status section', () => {
    it('shows the last backup time when backups exist', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/last backup/i)).toBeInTheDocument();
      });
    });

    it('shows the number of available backups', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/2 snapshots available/)).toBeInTheDocument();
      });
    });

    it('renders each backup filename', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/wondercomic_20260426_100000\.db/)).toBeInTheDocument();
        expect(screen.getByText(/wondercomic_20260425_100000\.db/)).toBeInTheDocument();
      });
    });

    it('shows a message when no backups exist', async () => {
      mockGetBackupStatus.mockResolvedValue(BACKUP_STATUS_EMPTY);
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByText(/no backups/i)).toBeInTheDocument();
      });
    });
  });

  describe('Back up now button', () => {
    it('renders the trigger backup button', async () => {
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back up now/i })).toBeInTheDocument();
      });
    });

    it('calls triggerBackup when the button is clicked', async () => {
      renderStatusPage();
      await waitFor(() => screen.getByRole('button', { name: /back up now/i }));

      fireEvent.click(screen.getByRole('button', { name: /back up now/i }));

      await waitFor(() => {
        expect(mockTriggerBackup).toHaveBeenCalledTimes(1);
      });
    });

    it('replaces backup list with the full status returned by trigger', async () => {
      renderStatusPage();
      await waitFor(() => screen.getByRole('button', { name: /back up now/i }));

      fireEvent.click(screen.getByRole('button', { name: /back up now/i }));

      await waitFor(() => {
        expect(screen.getByText(/wondercomic_20260427_000000_000000\.db/)).toBeInTheDocument();
      });
      expect(mockGetBackupStatus).toHaveBeenCalledTimes(1);
    });

    it('hides the trigger button when the user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({ accessToken: null, currentUser: null });
      renderStatusPage();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /back up now/i })).not.toBeInTheDocument();
      });
    });

    it('hides the trigger button when the user is not an admin', async () => {
      mockUseAuth.mockReturnValue({
        accessToken: 'test-token',
        currentUser: { id: 2, username: 'regular', email: 'regular@example.com', avatar_url: null, is_online: true, is_admin: false, created_at: '2026-01-01T00:00:00+00:00' },
      });
      renderStatusPage();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /back up now/i })).not.toBeInTheDocument();
      });
    });

    it('disables the button while a backup is in progress', async () => {
      let resolveBackup: (status: typeof TRIGGER_BACKUP_STATUS) => void;
      mockTriggerBackup.mockReturnValue(
        new Promise<typeof TRIGGER_BACKUP_STATUS>((resolve) => {
          resolveBackup = resolve;
        }),
      );

      renderStatusPage();
      await waitFor(() => screen.getByRole('button', { name: /back up now/i }));

      fireEvent.click(screen.getByRole('button', { name: /back up now/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /backing up/i })).toBeDisabled();
      });

      await act(async () => {
        resolveBackup!(TRIGGER_BACKUP_STATUS);
      });
    });
  });

  describe('loading state', () => {
    it('shows a loading indicator while fetching data', () => {
      mockGetHealthStatus.mockReturnValue(new Promise(() => {}));
      mockGetBackupStatus.mockReturnValue(new Promise(() => {}));

      renderStatusPage();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows an error message when health status fetch fails', async () => {
      mockGetHealthStatus.mockRejectedValue(new Error('Service unavailable'));
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('shows an error message when backup status fetch fails', async () => {
      mockGetBackupStatus.mockRejectedValue(new Error('Failed to fetch backup status'));
      renderStatusPage();
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
