import { describe, expect, it } from 'vitest';

import {
  getSpoonacularDefinitions,
  listSpoonacularCuisineValues,
  listSpoonacularDietValues,
  listSpoonacularIntoleranceValues
} from './definitions';

describe('spoonacular definitions', () => {
  it('returns supported diet, intolerance, and cuisine values', () => {
    const definitions = getSpoonacularDefinitions();

    expect(definitions.diets).toContainEqual(
      expect.objectContaining({
        value: 'gluten free',
        label: 'Gluten Free'
      })
    );
    expect(definitions.intolerances).toContainEqual({
      value: 'tree nut',
      label: 'Tree Nut'
    });
    expect(definitions.cuisines).toContainEqual({
      value: 'middle eastern',
      label: 'Middle Eastern'
    });
  });

  it('exposes normalized API values for validation and search params', () => {
    expect(listSpoonacularDietValues()).toContain('vegan');
    expect(listSpoonacularIntoleranceValues()).toContain('sesame');
    expect(listSpoonacularCuisineValues()).toContain('latin american');
  });
});
