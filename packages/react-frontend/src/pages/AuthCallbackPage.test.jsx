import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeMagicLinkSession } from '../lib/authApi.js';
import { parseMagicLinkCallback } from '../lib/authCallback.js';
import { AuthCallbackPage } from './AuthCallbackPage.jsx';

vi.mock('../lib/authApi.js', () => ({
  completeMagicLinkSession: vi.fn()
}));

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.mocked(completeMagicLinkSession).mockReset();
    window.history.replaceState({}, '', '/');
  });

  it('parses Supabase magic-link session fragments', () => {
    const callback = parseMagicLinkCallback({
      search: '',
      hash: '#access_token=access&refresh_token=refresh&expires_in=3600&token_type=bearer&type=magiclink'
    });

    expect(callback).toMatchObject({
      ok: true,
      session: {
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'bearer'
      }
    });
  });

  it('completes the session and navigates to groups', async () => {
    vi.mocked(completeMagicLinkSession).mockResolvedValue({
      session: {}
    });
    window.history.replaceState(
      {},
      '',
      '/auth/callback#access_token=access&refresh_token=refresh&expires_in=3600&token_type=bearer'
    );

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route
            path="/auth/callback"
            element={<AuthCallbackPage />}
          />
          <Route path="/groups" element={<h1>Groups</h1>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(completeMagicLinkSession).toHaveBeenCalledWith({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        expiresAt: undefined,
        tokenType: 'bearer'
      });
    });
    expect(
      await screen.findByRole('heading', { name: 'Groups' })
    ).toBeInTheDocument();
  });

  it('shows an expired-link recovery message', async () => {
    window.history.replaceState(
      {},
      '',
      '/auth/callback#error=access_denied&error_code=otp_expired'
    );

    render(
      <MemoryRouter>
        <AuthCallbackPage />
      </MemoryRouter>
    );

    expect(
      await screen.findAllByText(/sign-in link has expired/i)
    ).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: /back to sign in/i })
    ).toHaveAttribute('href', '/signin');
  });
});
