import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage, SignupPage } from '@/pages/auth';

const { mockNavigate, mockUseAuth, mockLogin, mockSignup } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockLogin: vi.fn(),
  mockSignup: vi.fn(),
}));

vi.mock('@/app/auth', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function buildAuthValue() {
  return {
    accessToken: null,
    currentUser: null,
    isLoadingSession: false,
    login: mockLogin,
    signup: mockSignup,
    logout: vi.fn(),
    refreshMe: vi.fn(),
  };
}

describe('auth pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthValue());
  });

  it('shows login errors returned by the auth action', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid email or password'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alice@example.com', 'wrong-password');
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates home after signup succeeds', async () => {
    mockSignup.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('your_username'), {
      target: { value: 'alice' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('alice@example.com', 'alice', 'Password123!');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
