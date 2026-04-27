/**
 * System status page.
 * Shows live health check results, backup inventory, and a manual backup trigger.
 */
import { useEffect, useState } from 'react';
import type { BackupEntry, BackupStatus, HealthCheck } from '@api';
import { getBackupStatus, getHealthStatus, triggerBackup } from '@api';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface HealthSectionProps {
  health: HealthCheck;
}

function HealthSection({ health }: HealthSectionProps): JSX.Element {
  const isHealthy = health.status === 'healthy';
  return (
    <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
      <h2 className="text-lg font-black text-gray-700 uppercase tracking-wide mb-4">
        Health
      </h2>
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`inline-block w-3 h-3 rounded-full ${isHealthy ? 'bg-green-400' : 'bg-red-400'}`}
        />
        <span className={`font-bold text-lg ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
          {isHealthy ? 'Healthy' : 'Unhealthy'}
        </span>
        <span className="ml-auto text-xs text-gray-400 font-mono">{health.version}</span>
      </div>
      <ul className="space-y-2">
        {Object.entries(health.checks).map(([name, result]) => (
          <li key={name} className="flex items-center gap-2 text-sm">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${result === 'ok' ? 'bg-green-400' : 'bg-red-400'}`}
            />
            <span className="font-medium capitalize text-gray-600">{name}</span>
            <span className={`ml-auto font-mono text-xs ${result === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {result}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface BackupSectionProps {
  backupStatus: BackupStatus;
  isTriggeringBackup: boolean;
  onTrigger: () => void;
}

function BackupSection({ backupStatus, isTriggeringBackup, onTrigger }: BackupSectionProps): JSX.Element {
  return (
    <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-gray-700 uppercase tracking-wide">
            Backups
          </h2>
          <span className="text-xs text-gray-400">
            {backupStatus.total_backups} snapshot{backupStatus.total_backups !== 1 ? 's' : ''} available
          </span>
        </div>
        <button
          type="button"
          onClick={onTrigger}
          disabled={isTriggeringBackup}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTriggeringBackup ? 'Backing up…' : 'Back up now'}
        </button>
      </div>

      {backupStatus.last_backup && (
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-semibold text-gray-700">Last backup: </span>
          {formatTimestamp(backupStatus.last_backup)}
        </p>
      )}

      {backupStatus.backups.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">No backups available yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {backupStatus.backups.map((entry: BackupEntry) => (
            <li key={entry.filename} className="py-3 flex items-center gap-3">
              <span className="font-mono text-xs text-gray-700 flex-1 truncate">{entry.filename}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(entry.size_bytes)}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatTimestamp(entry.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function StatusPage(): JSX.Element {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);

  const loadData = async (): Promise<void> => {
    try {
      setError(null);
      const [healthData, backupData] = await Promise.all([
        getHealthStatus(),
        getBackupStatus(),
      ]);
      setHealth(healthData);
      setBackupStatus(backupData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBackupStatus = async (): Promise<void> => {
    const data = await getBackupStatus();
    setBackupStatus(data);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleTriggerBackup = async (): Promise<void> => {
    setIsTriggeringBackup(true);
    try {
      await triggerBackup();
      await refreshBackupStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger backup');
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
        <div role="status" aria-label="Loading status" className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      <h2 className="text-3xl font-black text-gray-800 mb-8">System Status</h2>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {health && <HealthSection health={health} />}

      {backupStatus && (
        <BackupSection
          backupStatus={backupStatus}
          isTriggeringBackup={isTriggeringBackup}
          onTrigger={() => void handleTriggerBackup()}
        />
      )}
    </div>
  );
}
