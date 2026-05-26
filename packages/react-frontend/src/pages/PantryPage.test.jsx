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
      id: 'shrimp',
      name: 'Shrimp',
      category: 'Seafood',
      commonUnits: ['lb']
    }
  ]
};

const pantryPayload = {
  ingredients: [
    {
      id: 'pantry-rice',
      canonicalIngredientId: 'rice',
      name: 'Rice',
      quantity: '2',
      unit: 'cups'
    }
  ]
};

describe('PantryPage', () => {
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

    localStorage.setItem(
      'recipeCollab.session',
      JSON.stringify({
        profileId: '11111111-1111-4111-8111-111111111111',
        email: 'kartik@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 4102444800
      })
    );

    fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input);

      if (url.startsWith('/api/ingredients/catalog')) {
        return new Response(JSON.stringify(catalogPayload), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }

      if (
        url === '/api/ingredients' &&
        options.method === 'POST'
      ) {
        const body = JSON.parse(options.body);

        return new Response(
          JSON.stringify({
            id: 'pantry-shrimp',
            canonicalIngredientId: body.canonicalIngredientId,
            name: body.name,
            quantity: body.quantity,
            unit: body.unit
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      }

      if (url === '/api/ingredients') {
        return new Response(JSON.stringify(pantryPayload), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }

      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a dialog and adds a pantry item from the database', async () => {
    const user = userEvent.setup();

    render(<PantryPage />);

    expect(await screen.findByText('Rice')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /add pantry item/i })
    );

    const dialog = screen.getByRole('dialog', {
      name: /add pantry item/i
    });

    await user.type(
      within(dialog).getByLabelText(/ingredient/i),
      'Shrimp'
    );
    await user.clear(
      within(dialog).getByLabelText(/quantity/i)
    );
    await user.type(
      within(dialog).getByLabelText(/quantity/i),
      '3'
    );
    await user.click(
      within(dialog).getByRole('button', { name: /add item/i })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ingredients',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const saveCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url) === '/api/ingredients' &&
        options?.method === 'POST'
    );

    expect(JSON.parse(saveCall[1].body)).toEqual({
      canonicalIngredientId: 'shrimp',
      name: 'Shrimp',
      quantity: '3',
      unit: 'lb'
    });
    expect(
      await screen.findByText('Shrimp')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog')
    ).not.toBeInTheDocument();
  });
});
