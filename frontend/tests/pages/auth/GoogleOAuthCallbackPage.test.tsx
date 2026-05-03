import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleOAuthCallbackPage } from '@/pages/auth';

const { mockNavigate, mockUseAuth, mockCompleteGoogleOAuth, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockCompleteGoogleOAuth: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock('@/app/auth', () => ({ useAuth: mockUseAuth }));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.oauth.callback.backToLogin': 'Back to login',
        'auth.oauth.callback.failedTitle': 'Google sign-in failed',
        'auth.oauth.callback.retryDescription': 'Please retry the Google sign-in flow from the login page.',
        'auth.oauth.callback.signingInDescription': 'Completing your Google sign-in and preparing your session.',
        'auth.oauth.callback.signingInTitle': 'Signing you in',
        'auth.oauth.errors.cancelled': 'Google sign-in was cancelled or failed. Please try again.',
        'auth.oauth.errors.linkConflict': 'This Google account matches an email that already uses password login. Sign in with email and password instead.',
        'auth.oauth.errors.missingCode': 'No authorization code found. Please try signing in with Google again.',
        'auth.oauth.notifications.signInComplete': 'Google sign-in complete.',
        'auth.oauth.notifications.signInFailed': 'Google sign-in failed. Please try again.',
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as Record<string, unknown>), useNavigate: () => mockNavigate };
});

function renderCallback(search: string): void {
  render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <GoogleOAuthCallbackPage />
    </MemoryRouter>,
  );
}

describe('GoogleOAuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      completeGoogleOAuth: mockCompleteGoogleOAuth,
      isLoadingSession: false,
    });
  });

  it('calls completeGoogleOAuth with the code param and navigates home on success', async () => {
    mockCompleteGoogleOAuth.mockResolvedValue(undefined);

    renderCallback('?code=abc123');

    await waitFor(() => {
      expect(mockCompleteGoogleOAuth).toHaveBeenCalledWith('abc123');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('navigates to the intended destination when next is provided', async () => {
    mockCompleteGoogleOAuth.mockResolvedValue(undefined);

    renderCallback('?code=abc123&next=%2Fgallery');

    await waitFor(() => {
      expect(mockCompleteGoogleOAuth).toHaveBeenCalledWith('abc123');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/gallery', { replace: true });
    });
  });

  it('shows an error and does not call completeGoogleOAuth when Google returns ?error', async () => {
    renderCallback('?error=access_denied');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(mockCompleteGoogleOAuth).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows an error and does not call completeGoogleOAuth when the code param is missing', async () => {
    renderCallback('');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(mockCompleteGoogleOAuth).not.toHaveBeenCalled();
    expect(screen.getByText(/please retry the google sign-in flow from the login page/i)).toBeInTheDocument();
  });

  it('shows an error when completeGoogleOAuth rejects', async () => {
    mockCompleteGoogleOAuth.mockRejectedValue(
      new Error('OAuth code expired or already used'),
    );

    renderCallback('?code=stale-code');

    await waitFor(() => {
      expect(mockCompleteGoogleOAuth).toHaveBeenCalledWith('stale-code');
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('OAuth code expired or already used');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the saved redirect path (with query + hash) and clears it from sessionStorage', async () => {
    sessionStorage.setItem('auth.oauthRedirectPath', '/create?x=1#top');
    mockCompleteGoogleOAuth.mockResolvedValue(undefined);

    renderCallback('?code=abc');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/create?x=1#top', { replace: true });
    });

    expect(sessionStorage.getItem('auth.oauthRedirectPath')).toBeNull();
  });

  it('falls back to / when next is a protocol-relative URL (open-redirect guard)', async () => {
    mockCompleteGoogleOAuth.mockResolvedValue(undefined);

    renderCallback('?code=abc&next=%2F%2Fevil.example');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(
      expect.stringContaining('evil.example'),
      expect.anything(),
    );
  });

  it('calls completeGoogleOAuth exactly once under React StrictMode (one-time code guard)', async () => {
    mockCompleteGoogleOAuth.mockResolvedValue(undefined);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/auth/callback?code=strict-code']}>
          <GoogleOAuthCallbackPage />
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(mockCompleteGoogleOAuth).toHaveBeenCalledTimes(1);
    expect(mockCompleteGoogleOAuth).toHaveBeenCalledWith('strict-code');
  });

  it('shows a specific message for link conflict errors from the backend redirect', async () => {
    renderCallback('?error=link_conflict');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already uses password login/i);
    });

    expect(mockCompleteGoogleOAuth).not.toHaveBeenCalled();
  });

  it('waits for session restore before exchanging the OAuth code', async () => {
    mockCompleteGoogleOAuth.mockResolvedValue(undefined);
    mockUseAuth
      .mockReturnValueOnce({
        completeGoogleOAuth: mockCompleteGoogleOAuth,
        isLoadingSession: true,
      })
      .mockReturnValue({
        completeGoogleOAuth: mockCompleteGoogleOAuth,
        isLoadingSession: false,
      });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/auth/callback?code=abc123']}>
        <GoogleOAuthCallbackPage />
      </MemoryRouter>,
    );

    expect(mockCompleteGoogleOAuth).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter initialEntries={['/auth/callback?code=abc123']}>
        <GoogleOAuthCallbackPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockCompleteGoogleOAuth).toHaveBeenCalledWith('abc123');
    });
  });
});
