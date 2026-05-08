import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SketchyInput } from '@/components/design-system/Forms';
import { SketchyButton } from '@/components/design-system/Primitives';
import type { ApiKeyResponse } from '@api';
import { useApiKeysPage } from './useApiKeysPage';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

interface ApiKeyRowProps {
  apiKey: ApiKeyResponse;
  isRevoking: boolean;
  onRevoke: (keyId: number) => void;
}

function ApiKeyRow({ apiKey, isRevoking, onRevoke }: ApiKeyRowProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <li className="rounded-2xl border border-brand-primary/15 bg-white p-5 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="min-w-0 text-xl font-bold text-brand-dark">{apiKey.name}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${apiKey.is_active ? 'bg-green-100 text-green-700' : 'bg-brand-light text-brand-muted'}`}>
              {apiKey.is_active ? t('apiKeys.status.active') : t('apiKeys.status.revoked')}
            </span>
          </div>
          <code dir="ltr" className="mt-2 block break-all font-mono text-sm text-brand-muted">
            {apiKey.key_prefix}
          </code>
        </div>

        <dl className="grid gap-2 text-sm text-brand-muted sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <dt className="font-bold text-brand-dark">{t('apiKeys.list.createdAt')}</dt>
            <dd>{formatDate(apiKey.created_at)}</dd>
          </div>
          <div>
            <dt className="font-bold text-brand-dark">{t('apiKeys.list.lastUsedAt')}</dt>
            <dd>{formatDate(apiKey.last_used_at) ?? t('apiKeys.list.neverUsed')}</dd>
          </div>
        </dl>

        <div className="flex justify-start lg:justify-end">
          <SketchyButton
            type="button"
            variant="outline"
            className="px-5 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!apiKey.is_active || isRevoking}
            onClick={() => onRevoke(apiKey.id)}
          >
            {isRevoking ? t('apiKeys.actions.revoking') : t('apiKeys.actions.revoke')}
          </SketchyButton>
        </div>
      </div>
    </li>
  );
}

export function ApiKeysPage(): JSX.Element {
  const { t } = useTranslation();
  const {
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
  } = useApiKeysPage();

  async function handleCopyCreatedKey(): Promise<void> {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      toast.success(t('apiKeys.notifications.copied'));
    } catch {
      toast.error(t('apiKeys.errors.copyFailed'));
    }
  }

  function handleRevoke(keyId: number): void {
    const toastId = toast.warning(t('apiKeys.actions.confirmRevoke'), {
      duration: 10000,
      action: {
        label: t('apiKeys.actions.revoke'),
        onClick: () => {
          toast.dismiss(toastId);
          void revokeKey(keyId);
        },
      },
      cancel: {
        label: t('apiKeys.actions.cancel'),
        onClick: () => toast.dismiss(toastId),
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-rounded text-xl text-brand-muted">{t('apiKeys.list.loading')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-2xl rounded-2xl border-4 border-red-200 bg-white p-8 shadow-soft">
          <h1 className="text-center text-3xl font-bold text-brand-dark">{t('apiKeys.title')}</h1>
          <p role="alert" className="mt-4 text-center text-base font-medium text-red-600">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center py-12">
      <div className="w-full max-w-5xl space-y-8 rounded-2xl border-4 border-brand-primary/20 bg-white p-6 shadow-soft md:p-10">
        <div className="space-y-2 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-brand-primary">{t('apiKeys.header.eyebrow')}</p>
          <h1 className="text-3xl font-bold text-brand-dark">{t('apiKeys.title')}</h1>
          <p className="text-sm text-brand-muted">{t('apiKeys.description')}</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void createKey();
          }}
          className="rounded-2xl border border-brand-primary/15 bg-brand-light/30 p-6"
        >
          <label className="block text-sm font-bold text-brand-muted" htmlFor="api-key-name">
            {t('apiKeys.create.label')}
          </label>
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <SketchyInput
              id="api-key-name"
              value={keyName}
              maxLength={100}
              onChange={event => setKeyName(event.target.value)}
              placeholder={t('apiKeys.create.placeholder')}
              disabled={isCreating}
            />
            <SketchyButton type="submit" className="px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-50" disabled={isCreating}>
              {isCreating ? t('apiKeys.create.creating') : t('apiKeys.create.submit')}
            </SketchyButton>
          </div>
        </form>

        {createdKey ? (
          <section className="rounded-2xl border-4 border-brand-accent bg-brand-accent/10 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-brand-dark">{t('apiKeys.created.title')}</h2>
                <p className="mt-1 text-sm text-brand-muted">{t('apiKeys.created.description')}</p>
                <code dir="ltr" className="mt-4 block max-h-32 overflow-auto break-all rounded-xl bg-white p-4 font-mono text-sm text-brand-dark">
                  {createdKey}
                </code>
              </div>
              <div className="flex shrink-0 gap-3">
                <SketchyButton type="button" className="px-5 py-2 text-base" onClick={() => { void handleCopyCreatedKey(); }}>
                  {t('apiKeys.created.copy')}
                </SketchyButton>
                <SketchyButton type="button" variant="outline" className="px-5 py-2 text-base" onClick={clearCreatedKey}>
                  {t('apiKeys.created.dismiss')}
                </SketchyButton>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-brand-dark">{t('apiKeys.list.title')}</h2>
            <span className="rounded-full bg-brand-light px-3 py-1 text-sm font-bold text-brand-primary">
              {t('apiKeys.list.count', { count: apiKeys.length })}
            </span>
          </div>

          {apiKeys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-primary/30 bg-brand-light/30 p-8 text-center">
              <p className="font-semibold text-brand-muted">{t('apiKeys.list.empty')}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {apiKeys.map(apiKey => (
                <ApiKeyRow
                  key={apiKey.id}
                  apiKey={apiKey}
                  isRevoking={revokingIds.has(apiKey.id)}
                  onRevoke={handleRevoke}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
