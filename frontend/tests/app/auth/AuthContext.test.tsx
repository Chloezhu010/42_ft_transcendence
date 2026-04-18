import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@/app/auth';

const { mockGetMe, mockLogin, mockLogout, mockSignup } = vi.hoisted(() => ({
  mockGetMe: vi.fn(),
  mockLogin: vi.fn(),
  mockLogout: vi.fn(),
  mockSignup: vi.fn(),
}));

vi.mock('@api', () => ({
  getMe: mockGetMe,
  login: mockLogin,
  logout: mockLogout,
  signup: mockSignup,
}));

function TestConsumer(): JSX.Element {
  const { currentUser, isLoadingSession, accessToken, login, logout } = useAuth();

  const statusText = isLoadingSession
    ? 'loading'
    : currentUser
      ? `logged-in:${currentUser.username}`
      : 'logged-out';

  return (
    <div>
      <div data-testid="status">{statusText}</div>
      <div data-testid="token">{accessToken ?? 'no-token'}</div>

      <button onClick={() => void login('alice@example.com', 'Password123!')}>
        Login
      </button>

      <button onClick={() => void logout()}>
        Logout
      </button>
    </div>
  );
}

function renderWithProvider(): void {
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('restores as logged out when no token exists', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
    });

    expect(mockGetMe).not.toHaveBeenCalled();
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
  });

  it('restores the session from a saved token', async () => {
    localStorage.setItem('auth.accessToken', 'saved-token');
    mockGetMe.mockResolvedValue({
      id: 1,
      email: 'alice@example.com',
      username: 'alice',
      avatar_url: null,
      is_online: true,
      created_at: '2026-04-17T10:00:00Z',
    });

    renderWithProvider();

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalledWith('saved-token');
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-in:alice');
    });

    expect(screen.getByTestId('token')).toHaveTextContent('saved-token');
  });

  it('clears storage when restoring with an invalid token fails', async () => {
    localStorage.setItem('auth.accessToken', 'bad-token');
    mockGetMe.mockRejectedValue(Object.assign(new Error('Could not validate credentials'), { status: 401 }));

    renderWithProvider();

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalledWith('bad-token');
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
    });

    expect(localStorage.getItem('auth.accessToken')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
  });

  it('preserves storage when restoring fails with a transient backend error', async () => {
    localStorage.setItem('auth.accessToken', 'saved-token');
    mockGetMe.mockRejectedValue(Object.assign(new Error('Backend unavailable'), { status: 503 }));

    renderWithProvider();

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalledWith('saved-token');
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
    });

    expect(localStorage.getItem('auth.accessToken')).toBe('saved-token');
    expect(screen.getByTestId('token')).toHaveTextContent('saved-token');
  });

  it('login saves the token and loads the current user', async () => {
    mockLogin.mockResolvedValue({
      access_token: 'fresh-token',
      token_type: 'bearer',
    });

    mockGetMe.mockResolvedValue({
      id: 1,
      email: 'alice@example.com',
      username: 'alice',
      avatar_url: null,
      is_online: true,
      created_at: '2026-04-17T10:00:00Z',
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alice@example.com', 'Password123!');
    });

    await waitFor(() => {
      expect(mockGetMe).toHaveBeenCalledWith('fresh-token');
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-in:alice');
    });

    expect(localStorage.getItem('auth.accessToken')).toBe('fresh-token');
    expect(screen.getByTestId('token')).toHaveTextContent('fresh-token');
  });

  it('logout clears auth state even if the API call succeeds', async () => {
    localStorage.setItem('auth.accessToken', 'saved-token');
    mockGetMe.mockResolvedValue({
      id: 1,
      email: 'alice@example.com',
      username: 'alice',
      avatar_url: null,
      is_online: true,
      created_at: '2026-04-17T10:00:00Z',
    });
    mockLogout.mockResolvedValue(undefined);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-in:alice');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledWith('saved-token');
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('logged-out');
    });

    expect(localStorage.getItem('auth.accessToken')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
  });
});
