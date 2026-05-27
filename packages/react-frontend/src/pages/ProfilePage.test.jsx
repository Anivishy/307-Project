import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { ProfilePage } from './ProfilePage.jsx';

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

describe('ProfilePage US5 controls', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (input, options) => {
      const url = String(input);

      if (url.startsWith('/api/ingredients/catalog')) {
        return new Response(
          JSON.stringify(ingredientsPayload),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      }

      if (options?.method === 'PATCH') {
        return new Response(
          JSON.stringify(constraintsPayload),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      }

      return new Response(JSON.stringify(constraintsPayload), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
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
});
