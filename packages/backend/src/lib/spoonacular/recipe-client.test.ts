import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { searchRecipes } from './recipe-client';

describe('spoonacular recipe client', () => {
  beforeEach(() => {
    vi.stubEnv('SPOONACULAR_API_KEY', 'test-key');
    vi.stubEnv('SPOONACULAR_MOCK_GENERATION', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('passes profile preferences through to complexSearch', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [],
          offset: 2,
          number: 5,
          totalResults: 0
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchRecipes({
      type: 'main course',
      includeIngredients: ['rice', 'beans'],
      excludeIngredients: ['peanut', 'cilantro'],
      diet: 'gluten free,vegan',
      intolerances: 'dairy,egg',
      cuisine: 'italian',
      excludeCuisine: 'greek',
      query: 'weeknight dinner',
      number: 5,
      offset: 2
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(requestUrl.pathname).toBe('/recipes/complexSearch');
    expect(requestUrl.searchParams.get('includeIngredients')).toBe(
      'rice,beans'
    );
    expect(requestUrl.searchParams.get('excludeIngredients')).toBe(
      'peanut,cilantro'
    );
    expect(requestUrl.searchParams.get('diet')).toBe(
      'gluten free,vegan'
    );
    expect(requestUrl.searchParams.get('intolerances')).toBe(
      'dairy,egg'
    );
    expect(requestUrl.searchParams.get('cuisine')).toBe('italian');
    expect(requestUrl.searchParams.get('excludeCuisine')).toBe('greek');
    expect(requestUrl.searchParams.get('apiKey')).toBe('test-key');
  });
});
