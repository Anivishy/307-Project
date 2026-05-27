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
import { PantryPage } from './PantryPage.jsx';

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

      if (url === '/api/ingredients/catalog') {
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
