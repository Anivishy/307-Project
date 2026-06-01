import {
  render,
  screen,
  waitFor,
  within
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
import { saveSession } from '@/lib/session.js';
import { ProfilePage } from '@/pages/ProfilePage.jsx';

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
    diets: ['vegan'],
    intolerances: ['dairy'],
    preferredCuisines: ['italian'],
    excludedCuisines: [],
    dislikedIngredients: ['cilantro'],
    spiceLevel: 'medium',
    updatedAt: '2026-05-14T00:00:00.000Z'
  }
};

const definitionsPayload = {
  definitions: {
    diets: [
      {
        value: 'gluten free',
        label: 'Gluten Free',
        description: 'Avoids gluten.'
      },
      {
        value: 'vegan',
        label: 'Vegan',
        description: 'Avoids animal products.'
      }
    ],
    intolerances: [
      { value: 'dairy', label: 'Dairy' },
      { value: 'gluten', label: 'Gluten' }
    ],
    cuisines: [
      { value: 'italian', label: 'Italian' },
      { value: 'greek', label: 'Greek' },
      { value: 'thai', label: 'Thai' }
    ]
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

      if (url === '/api/auth/password/change') {
        return jsonResponse({
          passwordUpdated: true,
          sessionsRevoked: true,
          requiresSignIn: true
        });
      }

      if (url === '/api/auth/account') {
        return jsonResponse({
          accountDeleted: true,
          sessionsRevoked: true,
          membershipsRemoved: true,
          profileAnonymized: true
        });
      }

      if (url.startsWith('/api/ingredients/catalog')) {
        return jsonResponse(ingredientsPayload);
      }

      if (url === '/api/spoonacular/definitions') {
        return jsonResponse(definitionsPayload);
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
    expect(screen.getByLabelText('Vegan')).toBeChecked();
    expect(screen.getByLabelText('Dairy')).toBeChecked();
    expect(
      within(
        screen.getByRole('group', { name: 'Preferred Cuisines' })
      ).getByLabelText('Italian')
    ).toBeChecked();
    expect(screen.getByText('cilantro')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Medium' })
    ).toHaveAttribute('aria-pressed', 'true');
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
      diets: ['vegan'],
      intolerances: ['dairy'],
      neverIncludeIngredientIds: ['shrimp'],
      preferredCuisines: ['italian'],
      excludedCuisines: [],
      dislikedIngredients: ['cilantro'],
      spiceLevel: 'medium'
    });
  });

  it('saves definitions-backed diets and soft preferences', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    await user.click(await screen.findByLabelText('Gluten Free'));

    const excludedCuisineGroup = screen.getByRole('group', {
      name: 'Excluded Cuisines'
    });
    await user.click(within(excludedCuisineGroup).getByLabelText('Greek'));

    const preferredCuisineGroup = screen.getByRole('group', {
      name: 'Preferred Cuisines'
    });
    await user.click(within(preferredCuisineGroup).getByLabelText('Thai'));
    await user.click(screen.getByRole('button', { name: 'Hot' }));

    await user.click(
      screen.getByRole('button', { name: /Save Rules/i })
    );

    const saveCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/profile/constraints' &&
        options?.method === 'PATCH'
    );

    expect(JSON.parse(saveCall[1].body)).toEqual({
      allergies: ['peanut'],
      medicalRestrictions: ['low sodium'],
      diets: ['vegan', 'gluten free'],
      intolerances: ['dairy'],
      neverIncludeIngredientIds: ['shrimp'],
      preferredCuisines: ['italian', 'thai'],
      excludedCuisines: ['greek'],
      dislikedIngredients: ['cilantro'],
      spiceLevel: 'hot'
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

  it('shows profile picture validation errors before saving', async () => {
    const user = userEvent.setup();
    const picture = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      'avatar.png',
      {
        type: 'image/png'
      }
    );

    render(<ProfilePage />);

    await screen.findByLabelText(/display name/i);
    await user.upload(
      screen.getByLabelText(/upload profile picture/i),
      picture
    );

    expect(
      screen.getByText(/profile picture must be 5 mb or smaller/i)
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          String(url) === '/api/profiles/me' &&
          options?.method === 'PATCH'
      )
    ).toBe(false);
  });

  it('shows profile picture file-type errors before saving', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const picture = new File(['avatar'], 'avatar.svg', {
      type: 'image/svg+xml'
    });

    render(<ProfilePage />);

    await screen.findByLabelText(/display name/i);
    await user.upload(
      screen.getByLabelText(/upload profile picture/i),
      picture
    );

    expect(
      screen.getByText(/profile picture must be jpeg, png, webp, or gif/i)
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          String(url) === '/api/profiles/me' &&
          options?.method === 'PATCH'
      )
    ).toBe(false);
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

  it('changes the password and clears the saved session when re-authentication is required', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    await screen.findByLabelText(/display name/i);
    const passwordInputs =
      screen.getAllByLabelText(/current password/i);
    const newPasswordInput =
      screen.getByLabelText(/new password/i);

    await user.type(passwordInputs[0], 'current-secret');
    await user.type(newPasswordInput, 'new-secret');
    await user.click(
      screen.getByRole('button', {
        name: /change password/i
      })
    );

    await screen.findByText(/password changed/i);

    const passwordCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/auth/password/change' &&
        options?.method === 'POST'
    );

    expect(JSON.parse(passwordCall[1].body)).toEqual({
      currentPassword: 'current-secret',
      newPassword: 'new-secret'
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      'recipeCollab.session'
    );
  });

  it('deletes the account after email confirmation and clears the saved session', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    await screen.findByLabelText(/display name/i);
    const passwordInputs =
      screen.getAllByLabelText(/current password/i);

    await user.type(passwordInputs[1], 'current-secret');
    await user.type(
      screen.getByLabelText(/confirm email/i),
      'kartik@example.com'
    );
    await user.click(
      screen.getByRole('button', {
        name: /delete account/i
      })
    );

    await screen.findByText(/account deleted/i);

    const deleteCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/auth/account' &&
        options?.method === 'DELETE'
    );

    expect(JSON.parse(deleteCall[1].body)).toEqual({
      currentPassword: 'current-secret',
      confirmation: 'kartik@example.com'
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      'recipeCollab.session'
    );
  });
});
