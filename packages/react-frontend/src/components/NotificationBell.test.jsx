import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { saveSession } from '../lib/session.js';
import { NotificationBell } from './NotificationBell.jsx';

const notificationsPayload = {
  unreadCount: 2,
  notifications: [
    {
      id: 'notification-1',
      type: 'INGREDIENT_ADDED',
      title: 'Sam Prep added Rice',
      message:
        'Sam Prep added Rice (2 cups) to Dorm Dinner Crew.',
      readAt: null,
      createdAt: '2026-05-26T18:30:00.000Z'
    }
  ]
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('NotificationBell', () => {
  let fetchMock;

  beforeEach(() => {
    saveSession({
      profileId: 'profile-1',
      email: 'cook@example.com',
      accessToken: 'token',
      refreshToken: 'refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600
    });

    fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input);

      if (url === '/api/notifications/read') {
        expect(options.method).toBe('PATCH');
        return jsonResponse({ unreadCount: 0, readCount: 2 });
      }

      if (url === '/api/notifications') {
        return jsonResponse(notificationsPayload);
      }

      return jsonResponse({ error: 'Unexpected request' }, 404);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows unread count and clears it after opening the inbox', async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    expect(
      await screen.findByRole('button', {
        name: /Notifications, 2 unread/i
      })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /Notifications, 2 unread/i
      })
    );

    expect(
      await screen.findByRole('dialog', {
        name: /Notification inbox/i
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Sam Prep added Rice')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sam Prep added Rice (2 cups) to Dorm Dinner Crew.'
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Notifications' })
      ).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/read',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('closes the inbox when the bell is clicked again', async () => {
    const user = userEvent.setup();

    render(<NotificationBell />);

    const unreadButton = await screen.findByRole('button', {
      name: /Notifications, 2 unread/i
    });
    await user.click(unreadButton);

    expect(
      await screen.findByRole('dialog', {
        name: /Notification inbox/i
      })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Notifications' })
    );

    expect(
      screen.queryByRole('dialog', {
        name: /Notification inbox/i
      })
    ).not.toBeInTheDocument();
  });

  it('shows an empty inbox without marking anything read', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);

      if (url === '/api/notifications') {
        return jsonResponse({
          unreadCount: 0,
          notifications: []
        });
      }

      return jsonResponse({ error: 'Unexpected request' }, 404);
    });

    render(<NotificationBell />);

    await user.click(
      await screen.findByRole('button', { name: 'Notifications' })
    );

    expect(
      await screen.findByText('No notifications yet.')
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/notifications/read',
      expect.anything()
    );
  });
});
