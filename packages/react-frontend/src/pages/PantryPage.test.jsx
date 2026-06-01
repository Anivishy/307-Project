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
import { saveSession } from '@/lib/session.js';
import { PantryPage } from '@/pages/PantryPage.jsx';

const catalogPayload = {
  ingredients: [
    {
      id: 'rice',
      name: 'Rice',
      category: 'Grain',
      commonUnits: ['cups']
    },
    {
      id: 'tomato',
      name: 'Tomato',
      category: 'Produce',
      commonUnits: ['pcs']
    }
  ]
};

const pantryPayload = {
  ingredients: [
    {
      id: 'item-rice',
      canonicalIngredientId: 'rice',
      name: 'Rice',
      quantity: 2,
      unit: 'cups'
    }
  ]
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('PantryPage controls', () => {
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

    saveSession({
      profileId: 'profile-1',
      email: 'cook@example.com',
      accessToken: 'token',
      refreshToken: 'refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600
    });

    fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input);

      if (url.startsWith('/api/ingredients/catalog')) {
        return jsonResponse(catalogPayload);
      }

      if (
        url === '/api/ingredients' &&
        options.method === 'POST'
      ) {
        return jsonResponse({
          id: 'item-tomato',
          ...JSON.parse(options.body)
        });
      }

      if (
        url === '/api/ingredients/item-rice' &&
        options.method === 'PATCH'
      ) {
        return jsonResponse({
          id: 'item-rice',
          ...JSON.parse(options.body)
        });
      }

      if (
        url === '/api/ingredients/item-rice' &&
        options.method === 'DELETE'
      ) {
        return new Response(null, { status: 204 });
      }

      if (url === '/api/ingredients') {
        return jsonResponse(pantryPayload);
      }

      return jsonResponse({ error: 'Unexpected request' }, 404);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('loads pantry items and adds a catalog ingredient', async () => {
    const user = userEvent.setup();

    render(<PantryPage />);

    expect(await screen.findByText('Rice')).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Ingredient'),
      'Tomato'
    );
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes('/api/ingredients/catalog?q=Tomato')
        )
      ).toBe(true);
    });
    await user.click(
      await screen.findByRole('button', { name: /^Tomato/i })
    );
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '3');
    await user.click(
      screen.getByRole('button', { name: /Add Item/i })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ingredients',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(await screen.findByText('Tomato')).toBeInTheDocument();
    expect(screen.getByText('3 pcs')).toBeInTheDocument();
  });

  it('edits and deletes an existing pantry item', async () => {
    const user = userEvent.setup();

    render(<PantryPage />);

    expect(await screen.findByText('Rice')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Edit Rice/i })
    );
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '4');
    await user.click(
      screen.getByRole('button', { name: /Save Changes/i })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ingredients/item-rice',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
    expect(await screen.findByText('4 cups')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Delete Rice/i })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ingredients/item-rice',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
    expect(screen.queryByText('Rice')).not.toBeInTheDocument();
  });
});
