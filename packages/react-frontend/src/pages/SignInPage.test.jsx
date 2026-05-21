import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  signInWithPassword,
  signUpWithPassword
} from '../lib/authApi.js';
import { SignInPage } from './SignInPage.jsx';

vi.mock('../lib/authApi.js', () => ({
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn()
}));

function renderAuthPage(mode = 'signin') {
  render(
    <MemoryRouter initialEntries={[`/${mode}`]}>
      <Routes>
        <Route
          path={`/${mode}`}
          element={<SignInPage mode={mode} />}
        />
        <Route path="/groups" element={<h1>Groups</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SignInPage password auth flow', () => {
  beforeEach(() => {
    vi.mocked(signInWithPassword).mockReset();
    vi.mocked(signUpWithPassword).mockReset();
  });

  it('signs in with email and password', async () => {
    vi.mocked(signInWithPassword).mockResolvedValue({
      session: {}
    });
    renderAuthPage('signin');

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'kartik@example.com'
    );
    await userEvent.type(
      screen.getByLabelText(/^password$/i),
      'correct-horse'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /^sign in$/i })
    );

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'kartik@example.com',
        password: 'correct-horse'
      });
    });
    expect(
      await screen.findByRole('heading', { name: 'Groups' })
    ).toBeInTheDocument();
  });

  it('creates an account with email, name, and password', async () => {
    vi.mocked(signUpWithPassword).mockResolvedValue({
      session: {}
    });
    renderAuthPage('signup');

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'kartik@example.com'
    );
    await userEvent.type(
      screen.getByLabelText(/name/i),
      'Kartik'
    );
    await userEvent.type(
      screen.getByLabelText(/^password$/i),
      'correct-horse'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /create account/i })
    );

    await waitFor(() => {
      expect(signUpWithPassword).toHaveBeenCalledWith({
        email: 'kartik@example.com',
        password: 'correct-horse',
        displayName: 'Kartik'
      });
    });
  });

  it('shows a generic confirmation-or-sign-in message when signup requires email confirmation', async () => {
    vi.mocked(signUpWithPassword).mockResolvedValue({
      email: 'kartik@example.com',
      requiresEmailConfirmation: true
    });
    renderAuthPage('signup');

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'kartik@example.com'
    );
    await userEvent.type(
      screen.getByLabelText(/name/i),
      'Kartik'
    );
    await userEvent.type(
      screen.getByLabelText(/^password$/i),
      'correct-horse'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /create account/i })
    );

    expect(
      await screen.findByText(/if kartik@example.com is new/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/sign in with your password/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Groups' })
    ).not.toBeInTheDocument();
  });

  it('shows a helpful message when the signup email already exists', async () => {
    vi.mocked(signUpWithPassword).mockRejectedValue(
      new Error(
        'An account already exists for this email. Sign in with your password, or check your inbox if you just created it.'
      )
    );
    renderAuthPage('signup');

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'kartik@example.com'
    );
    await userEvent.type(
      screen.getByLabelText(/name/i),
      'Kartik'
    );
    await userEvent.type(
      screen.getByLabelText(/^password$/i),
      'correct-horse'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /create account/i })
    );

    expect(
      await screen.findByText(/account already exists/i)
    ).toBeInTheDocument();
  });

  it('requires a name before creating an account', async () => {
    renderAuthPage('signup');

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'kartik@example.com'
    );
    await userEvent.type(
      screen.getByLabelText(/^password$/i),
      'correct-horse'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /create account/i })
    );

    expect(screen.getByText(/enter your name/i)).toBeInTheDocument();
    expect(signUpWithPassword).not.toHaveBeenCalled();
  });

  it('shows a clear error for an invalid email', async () => {
    renderAuthPage('signin');

    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'kartik'
    );
    await userEvent.type(
      screen.getByLabelText(/^password$/i),
      'correct-horse'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /^sign in$/i })
    );

    expect(
      screen.getByText(/enter a valid email address/i)
    ).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
