import {
  render,
  screen,
  waitFor
} from '@testing-library/react';
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
import { ProfilePage } from './ProfilePage.jsx';

const profilePayload = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'kartik@example.com',
  displayName: 'Kartik',
  profilePictureUrl: '',
  profilePictureStorageRef: '',
  allergies: [],
  medicalRestrictions: [],
  neverIncludeIngredientIds: [],
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z'
};

const constraintsPayload = {
  constraints: {
    userId: 'user-admin-1',
    allergies: ['peanut'],
    medicalRestrictions: ['low sodium'],
    neverIncludeIngredientIds: ['shrimp'],
    updatedAt: '2026-05-14T00:00:00.000Z'
  }
};

const ingredientsPayload = {
  ingredients: [
    {
      id: 'shrimp',
      name: 'Shrimp',
      category: 'Seafood',
      commonUnits: ['lb']
    }
  ]
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('ProfilePage US5 controls', () => {
  let fetchMock;
  let storage;

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => storage.get(key) ?? null),
      setItem: vi.fn((key, value) => {
        storage.set(key, String(value));
      }),
      removeItem: vi.fn((key) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      })
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:profile-picture')
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });

    saveSession({
      profileId: profilePayload.id,
      email: profilePayload.email,
      displayName: profilePayload.displayName,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: 4102444800
    });

    fetchMock = vi.fn(async (input, options) => {
      const url = String(input);

      if (
        url === '/api/profiles/me' &&
        options?.method === 'PATCH'
      ) {
        const body = JSON.parse(options.body);
        return jsonResponse({
          ...profilePayload,
          displayName:
            body.displayName ?? profilePayload.displayName,
          profilePictureStorageRef:
            body.profilePicture?.storageRef ?? '',
          profilePictureUrl: body.profilePicture?.url ?? ''
        });
      }

      if (url === '/api/profiles/me') {
        return jsonResponse(profilePayload);
      }

      if (url === '/api/groups') {
        return jsonResponse({ groups: [{ id: 'group-1' }] });
      }

      if (url === '/api/auth/email-change/request') {
        return jsonResponse({
          status: 'verificationRequired',
          email: JSON.parse(options.body).newEmail,
          sessionsRevoked: false
        });
      }

      if (url.startsWith('/api/ingredients/catalog')) {
        return jsonResponse(ingredientsPayload);
      }

      if (
        url === '/api/profile/constraints' &&
        options?.method === 'PATCH'
      ) {
        return jsonResponse(constraintsPayload);
      }

      return jsonResponse(constraintsPayload);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads, displays, and saves hard dietary rules', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    expect(
      await screen.findByText('peanut')
    ).toBeInTheDocument();
    expect(screen.getByText('low sodium')).toBeInTheDocument();
    expect(screen.getByText('Shrimp')).toBeInTheDocument();
    expect(
      screen.queryByText('Add from Database')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Current Ingredients')
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Save Rules/i })
    );

    const saveCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/profile/constraints' &&
        options?.method === 'PATCH'
    );

    expect(saveCall).toBeDefined();
    expect(JSON.parse(saveCall[1].body)).toEqual({
      allergies: ['peanut'],
      medicalRestrictions: ['low sodium'],
      neverIncludeIngredientIds: ['shrimp']
    });
  });

  it('saves display name and validated profile picture metadata', async () => {
    const user = userEvent.setup();
    const picture = new File(['avatar'], 'avatar.png', {
      type: 'image/png'
    });

    render(<ProfilePage />);

    const nameInput = await screen.findByLabelText(
      /display name/i
    );
    await user.clear(nameInput);
    await user.type(nameInput, 'Avery Cook');
    await user.upload(
      screen.getByLabelText(/upload profile picture/i),
      picture
    );

    expect(
      screen.getByText(/profile picture preview ready/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /save profile/i })
    );

    await screen.findByText(/account details saved/i);

    const saveCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/profiles/me' &&
        options?.method === 'PATCH'
    );
    const body = JSON.parse(saveCall[1].body);

    expect(body.displayName).toBe('Avery Cook');
    expect(body.profilePicture).toMatchObject({
      contentType: 'image/png',
      sizeBytes: picture.size
    });
    expect(body.profilePicture.storageRef).toContain(
      'profile-pictures/11111111-1111-4111-8111-111111111111/'
    );
  });

  it('requests email-change verification from account settings', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    await user.type(
      await screen.findByLabelText(/new email/i),
      'avery@example.com'
    );
    await user.click(
      screen.getByRole('button', {
        name: /request verification/i
      })
    );

    await screen.findByText(/verification email sent/i);

    await waitFor(() => {
      const emailCall = fetchMock.mock.calls.find(
        ([url, options]) =>
          String(url) === '/api/auth/email-change/request' &&
          options?.method === 'POST'
      );

      expect(emailCall).toBeDefined();
      expect(JSON.parse(emailCall[1].body)).toEqual({
        newEmail: 'avery@example.com'
      });
    });
  });
});
