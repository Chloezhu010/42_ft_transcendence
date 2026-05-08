/**
 * Route coverage for the public landing and legal screens.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app';
import { AuthProvider } from '@/app/auth';

const { mockExchangeOAuthCode, mockGetMe } = vi.hoisted(() => ({
  mockExchangeOAuthCode: vi.fn(),
  mockGetMe: vi.fn(),
}));

vi.mock('@api', () => ({
  exchangeOAuthCode: mockExchangeOAuthCode,
  getMe: mockGetMe,
  login: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
}));

vi.mock('@/pages/api-keys', () => ({
  ApiKeysPage: () => <div>API keys route</div>,
}));

function renderApp(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  localStorage.clear();
  mockExchangeOAuthCode.mockResolvedValue({ access_token: 'oauth-token', token_type: 'bearer' });
  mockGetMe.mockResolvedValue({
    id: 1,
    email: 'alice@example.com',
    username: 'alice',
    avatar_url: null,
    is_online: true,
    created_at: '2026-04-17T10:00:00Z',
  });
});

describe('App public routes', () => {
  it('renders the landing page at the root route', () => {
    renderApp('/');

    expect(
      screen.getByRole('heading', { name: /your child's imagination,\s*sketched to life/i }),
    ).toBeInTheDocument();

    const createLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/create');

    expect(createLinks.length).toBeGreaterThan(0);
  });

  it('renders the privacy policy route', () => {
    renderApp('/privacy');

    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByText(/how funova handles story inputs/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /contact about privacy/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/should not be filed in the public repository issue tracker/i),
    ).toBeInTheDocument();
  });

  it('renders a public terms support link only on the terms route', () => {
    renderApp('/terms');

    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact about terms/i })).toHaveAttribute(
      'href',
      'https://github.com/Chloezhu010/42_ft_transcendence/issues',
    );
  });

  it('renders the Google OAuth callback page at /auth/callback', async () => {
    renderApp('/auth/callback?code=test-code');
    await waitFor(() => {
      expect(screen.getByTestId('google-oauth-callback')).toBeInTheDocument();
    });
  });

  it('renders the protected API keys route for an authenticated user', async () => {
    localStorage.setItem('auth.accessToken', 'stored-token');

    renderApp('/api-keys');

    await waitFor(() => {
      expect(screen.getByText('API keys route')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /api keys/i })).toHaveAttribute('href', '/api-keys');
  });

  it('redirects unauthenticated API keys requests to login', async () => {
    renderApp('/api-keys');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });
  });

  it('redirects unknown routes to the landing page', async () => {
    renderApp('/this-does-not-exist');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /your child's imagination,\s*sketched to life/i }),
      ).toBeInTheDocument();
    });
  });
});
