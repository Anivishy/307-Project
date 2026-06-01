import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  findCatalogIngredientsByIds,
  findMissingCatalogIngredientIds,
  resetIngredientCatalogCacheForTests,
  searchCatalogIngredients
} from './ingredient-catalog-service';

describe('ingredient catalog service', () => {
  beforeEach(() => {
    vi.stubEnv('SPOONACULAR_MOCK', 'true');
    resetIngredientCatalogCacheForTests();
  });

  it('searches mock catalog ingredients for typeahead queries', async () => {
    const result = await searchCatalogIngredients('shr', 5);

    expect(result.source).toBe('mock');
    expect(result.ingredients.at(0)).toMatchObject({
      id: '15152',
      name: 'Shrimp'
    });
  });

  it('returns fixture catalog entries when query is empty in mock mode', async () => {
    const result = await searchCatalogIngredients('', 5);

    expect(result.ingredients.length).toBe(5);
    expect(result.source).toBe('mock');
  });

  it('resolves known ingredient ids and flags missing ids', async () => {
    const ingredients = await findCatalogIngredientsByIds([
      '2047',
      'not-real'
    ]);

    expect(ingredients).toEqual([
      expect.objectContaining({ id: '2047', name: 'Salt' })
    ]);
    expect(
      await findMissingCatalogIngredientIds(['2047', 'not-real'])
    ).toEqual(['not-real']);
  });
});
