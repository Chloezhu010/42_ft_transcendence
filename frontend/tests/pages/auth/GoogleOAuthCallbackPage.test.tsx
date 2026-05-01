import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GoogleOAuthCallbackPage } from '@/pages/auth';

const { mockNavigate, mockUseAuth, mockCompleteGoogleOAuth } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockCompleteGoogleOAuth: vi.fn(),
}));

vi.mock('@/app/auth', () => ({ useAuth: mockUseAuth }));

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
    mockUseAuth.mockReturnValue({ completeGoogleOAuth: mockCompleteGoogleOAuth });
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

  it('shows a specific message for link conflict errors from the backend redirect', async () => {
    renderCallback('?error=link_conflict');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already uses password login/i);
    });

    expect(mockCompleteGoogleOAuth).not.toHaveBeenCalled();
  });
});
