/**
 * Route coverage for the public landing and legal screens.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app';
import { AuthProvider } from '@/app/auth';

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
});
