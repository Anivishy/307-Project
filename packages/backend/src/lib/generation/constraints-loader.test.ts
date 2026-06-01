import { describe, expect, it } from 'vitest';

import { aggregateMemberPreferences } from './constraints-loader';

describe('generation constraints loader', () => {
  it('aggregates Spoonacular profile preferences across members', () => {
    const preferences = aggregateMemberPreferences([
      {
        userId: 'user-1',
        allergies: [],
        medicalRestrictions: [],
        neverIncludeIngredientIds: [],
        diets: ['vegan', 'gluten free'],
        intolerances: ['dairy'],
        preferredCuisines: ['italian'],
        excludedCuisines: ['greek'],
        dislikedIngredients: ['cilantro'],
        spiceLevel: 'mild',
        updatedAt: '2026-05-28T00:00:00.000Z'
      },
      {
        userId: 'user-2',
        allergies: [],
        medicalRestrictions: [],
        neverIncludeIngredientIds: [],
        diets: ['vegan'],
        intolerances: ['egg'],
        preferredCuisines: ['mediterranean', 'italian'],
        excludedCuisines: [],
        dislikedIngredients: ['olives', 'cilantro'],
        spiceLevel: 'hot',
        updatedAt: '2026-05-28T00:00:00.000Z'
      }
    ]);

    expect(preferences).toEqual({
      diets: ['vegan', 'gluten free'],
      intolerances: ['dairy', 'egg'],
      preferredCuisines: ['italian', 'mediterranean'],
      excludedCuisines: ['greek'],
      dislikedIngredients: ['cilantro', 'olives'],
      spiceLevels: ['mild', 'hot']
    });
  });
});
