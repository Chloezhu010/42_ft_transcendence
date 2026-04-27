import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBackupStatus, getHealthStatus, triggerBackup } from '@api';

afterEach(() => {
  vi.restoreAllMocks();
});

const HEALTH_RESPONSE = {
  status: 'healthy' as const,
  version: '1.0.0',
  checks: { database: 'ok' },
};

const BACKUP_STATUS_RESPONSE = {
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

describe('getHealthStatus', () => {
  it('sends GET to /health and returns health data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(HEALTH_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getHealthStatus();

    expect(result).toEqual(HEALTH_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns unhealthy status when backend reports db failure', async () => {
    const unhealthyResponse = {
      status: 'unhealthy' as const,
      version: '1.0.0',
      checks: { database: 'unavailable' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(unhealthyResponse), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(getHealthStatus()).resolves.toEqual(unhealthyResponse);
  });

  it('surfaces backend error message on unexpected error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Internal Server Error',
      }),
    );

    await expect(getHealthStatus()).rejects.toThrow('Internal server error');
  });

  it('throws a network error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(getHealthStatus()).rejects.toThrow('Network error');
  });
});

describe('getBackupStatus', () => {
  it('sends GET to /backup/status and returns backup data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(BACKUP_STATUS_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getBackupStatus();

    expect(result).toEqual(BACKUP_STATUS_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/backup/status'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns empty backup list when no backups exist', async () => {
    const emptyStatus = { last_backup: null, total_backups: 0, backups: [] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(emptyStatus), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getBackupStatus();

    expect(result.backups).toEqual([]);
    expect(result.last_backup).toBeNull();
    expect(result.total_backups).toBe(0);
  });

  it('surfaces backend detail on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Internal Server Error',
      }),
    );

    await expect(getBackupStatus()).rejects.toThrow('Internal server error');
  });

  it('throws a network error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(getBackupStatus()).rejects.toThrow('Network error');
  });
});

describe('triggerBackup', () => {
  it('sends POST to /backup/trigger', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Backup started' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await triggerBackup('test-token');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/backup/trigger'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends Authorization header with the access token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Backup started' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await triggerBackup('my-secret-token');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-secret-token' }),
      }),
    );
  });

  it('resolves without a return value on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Backup started' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(triggerBackup('test-token')).resolves.toBeUndefined();
  });

  it('surfaces backend detail on non-202 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Backup already in progress' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Conflict',
      }),
    );

    await expect(triggerBackup('test-token')).rejects.toThrow('Backup already in progress');
  });

  it('throws a network error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await expect(triggerBackup('test-token')).rejects.toThrow('Network error');
  });
});
