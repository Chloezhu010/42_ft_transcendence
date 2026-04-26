import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusPage } from '@/pages/status';

const {
  mockGetHealthStatus,
  mockGetBackupStatus,
  mockTriggerBackup,
} = vi.hoisted(() => ({
  mockGetHealthStatus: vi.fn(),
  mockGetBackupStatus: vi.fn(),
  mockTriggerBackup: vi.fn(),
}));

vi.mock('@api', () => ({
  getHealthStatus: mockGetHealthStatus,
  getBackupStatus: mockGetBackupStatus,
  triggerBackup: mockTriggerBackup,
}));

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
  mockTriggerBackup.mockResolvedValue(undefined);
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

    it('refreshes backup status after a successful backup trigger', async () => {
      renderStatusPage();
      await waitFor(() => screen.getByRole('button', { name: /back up now/i }));

      mockGetBackupStatus.mockResolvedValue({
        ...BACKUP_STATUS_WITH_ENTRIES,
        total_backups: 3,
      });

      fireEvent.click(screen.getByRole('button', { name: /back up now/i }));

      await waitFor(() => {
        expect(mockGetBackupStatus).toHaveBeenCalledTimes(2);
      });
    });

    it('disables the button while a backup is in progress', async () => {
      let resolveBackup: () => void;
      mockTriggerBackup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveBackup = resolve;
        }),
      );

      renderStatusPage();
      await waitFor(() => screen.getByRole('button', { name: /back up now/i }));

      fireEvent.click(screen.getByRole('button', { name: /back up now/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /backing up/i })).toBeDisabled();
      });

      resolveBackup!();
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
