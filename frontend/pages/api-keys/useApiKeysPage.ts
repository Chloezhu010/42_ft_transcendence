import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/app/auth';
import { createApiKey, listApiKeys, revokeApiKey, type ApiKeyResponse } from '@api';

const MAX_API_KEY_NAME_LENGTH = 100;

type ApiRequestError = Error & { status?: number };

interface UseApiKeysPageResult {
  apiKeys: ApiKeyResponse[];
  createdKey: string | null;
  keyName: string;
  setKeyName: (value: string) => void;
  clearCreatedKey: () => void;
  createKey: () => Promise<void>;
  revokeKey: (keyId: number) => Promise<void>;
  isLoading: boolean;
  isCreating: boolean;
  revokingIds: Set<number>;
  loadError: string | null;
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && (error as ApiRequestError).status === 429;
}

export function useApiKeysPage(): UseApiKeysPageResult {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingIds, setRevokingIds] = useState<Set<number>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const token = accessToken;
    let isMounted = true;

    async function loadKeys(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        const keys = await listApiKeys(token);
        if (isMounted) setApiKeys(keys);
      } catch {
        if (isMounted) setLoadError(t('apiKeys.errors.loadFailed'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadKeys();

    return () => {
      isMounted = false;
    };
  }, [accessToken, t]);

  const clearCreatedKey = useCallback(() => {
    setCreatedKey(null);
  }, []);

  const createKey = useCallback(async () => {
    if (!accessToken || isCreating) return;
    const trimmedName = keyName.trim();

    if (!trimmedName) {
      toast.error(t('apiKeys.errors.nameRequired'));
      return;
    }

    if (trimmedName.length > MAX_API_KEY_NAME_LENGTH) {
      toast.error(t('apiKeys.errors.nameTooLong'));
      return;
    }

    setIsCreating(true);
    try {
      const created = await createApiKey(accessToken, trimmedName);
      const { key, ...safeCreated } = created;
      setApiKeys(prev => [safeCreated, ...prev]);
      setCreatedKey(key);
      setKeyName('');
      toast.success(t('apiKeys.notifications.created'));
    } catch (error) {
      const message = isRateLimitError(error)
        ? t('apiKeys.errors.rateLimited')
        : t('apiKeys.errors.createFailed');
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [accessToken, isCreating, keyName, t]);

  const revokeKey = useCallback(async (keyId: number) => {
    if (!accessToken || revokingIds.has(keyId)) return;
    setRevokingIds(prev => new Set(prev).add(keyId));

    try {
      await revokeApiKey(accessToken, keyId);
      setApiKeys(prev => prev.map(key => (
        key.id === keyId ? { ...key, is_active: false } : key
      )));
      toast.success(t('apiKeys.notifications.revoked'));
    } catch {
      toast.error(t('apiKeys.errors.revokeFailed'));
    } finally {
      setRevokingIds(prev => {
        const next = new Set(prev);
        next.delete(keyId);
        return next;
      });
    }
  }, [accessToken, revokingIds, t]);

  return {
    apiKeys,
    createdKey,
    keyName,
    setKeyName,
    clearCreatedKey,
    createKey,
    revokeKey,
    isLoading,
    isCreating,
    revokingIds,
    loadError,
  };
}
