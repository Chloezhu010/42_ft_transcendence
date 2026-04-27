import { API_BASE_URL, apiFetch } from './apiClient';
import { buildApiError } from './apiErrors';

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  version: string;
  checks: Record<string, string>;
}

export interface BackupEntry {
  filename: string;
  size_bytes: number;
  created_at: string;
}

export interface BackupStatus {
  last_backup: string | null;
  total_backups: number;
  backups: BackupEntry[];
}

export async function getHealthStatus(): Promise<HealthCheck> {
  const response = await apiFetch(`${API_BASE_URL}/health`, { method: 'GET' });
  if (response.ok || response.status === 503) {
    return response.json() as Promise<HealthCheck>;
  }
  throw await buildApiError(response, 'Health check failed');
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const response = await apiFetch(`${API_BASE_URL}/backup/status`, { method: 'GET' });
  if (!response.ok) {
    throw await buildApiError(response, 'Failed to fetch backup status');
  }
  return response.json() as Promise<BackupStatus>;
}

export async function triggerBackup(accessToken: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/backup/trigger`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await buildApiError(response, 'Failed to trigger backup');
  }
}
