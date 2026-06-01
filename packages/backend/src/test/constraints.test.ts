import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseConstraintsPayload } from '../lib/constraints/normalize.ts';
import {
  findMissingCatalogIngredientIds,
  resetIngredientCatalogCacheForTests,
  searchCatalogIngredients
} from '../lib/ingredient-catalog-service.ts';
import {
  getUserConstraints,
  patchUserConstraints,
  replaceUserConstraints,
  resetConstraintStoreForTests
} from '../lib/constraints/store.ts';
import type { CandidateBundle } from '../lib/constraints/types.ts';
import {
  filterCandidatesByHardConstraints,
  validateHardConstraints
} from '../lib/constraints/validator.ts';

describe('US5 hard dietary constraints', () => {
  beforeEach(() => {
    vi.stubEnv('SPOONACULAR_MOCK', 'true');
    resetConstraintStoreForTests();
    resetIngredientCatalogCacheForTests();
  });

  it('parseConstraintsPayload normalizes and deduplicates constraint fields', () => {
    const parsed = parseConstraintsPayload(
      {
        allergies: [' Peanuts ', 'peanuts', ''],
        medicalRestrictions: ['Low Sodium', ' low   sodium '],
        neverIncludeIngredientIds: [' 15152 ', '15152'],
        diets: [' Vegan ', 'vegan'],
        intolerances: ['Dairy', ' dairy '],
        preferredCuisines: ['Italian', ' italian '],
        excludedCuisines: ['Greek'],
        dislikedIngredients: [' Cilantro ', 'cilantro'],
        spiceLevel: ' Medium '
      },
      { partial: false }
    );

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.value.allergies).toEqual(['peanuts']);
      expect(parsed.value.medicalRestrictions).toEqual([
        'low sodium'
      ]);
      expect(parsed.value.neverIncludeIngredientIds).toEqual([
        '15152'
      ]);
      expect(parsed.value.diets).toEqual(['vegan']);
      expect(parsed.value.intolerances).toEqual(['dairy']);
      expect(parsed.value.preferredCuisines).toEqual(['italian']);
      expect(parsed.value.excludedCuisines).toEqual(['greek']);
      expect(parsed.value.dislikedIngredients).toEqual(['cilantro']);
      expect(parsed.value.spiceLevel).toBe('medium');
    }
  });

  it('parseConstraintsPayload rejects unsupported spice levels', () => {
    const parsed = parseConstraintsPayload(
      {
        spiceLevel: 'extreme'
      },
      { partial: true }
    );

    expect(parsed.ok).toBe(false);

    if (!parsed.ok) {
      expect(parsed.issues).toContain(
        'spiceLevel must be mild, medium, or hot'
      );
    }
  });

  it('constraint store replaces all fields and patches only provided fields', () => {
    replaceUserConstraints('user-1', {
      allergies: ['peanuts'],
      medicalRestrictions: ['gluten'],
      neverIncludeIngredientIds: ['15152'],
      diets: ['vegan'],
      preferredCuisines: ['italian']
    });

    patchUserConstraints('user-1', {
      allergies: ['milk']
    });

    expect(getUserConstraints('user-1').allergies).toEqual([
      'milk'
    ]);
    expect(
      getUserConstraints('user-1').medicalRestrictions
    ).toEqual(['gluten']);
    expect(
      getUserConstraints('user-1').neverIncludeIngredientIds
    ).toEqual(['15152']);
    expect(getUserConstraints('user-1').diets).toEqual(['vegan']);
    expect(getUserConstraints('user-1').preferredCuisines).toEqual([
      'italian'
    ]);
  });

  it('ingredient search supports typeahead and invalid id detection', async () => {
    const result = await searchCatalogIngredients('shr', 5);
    expect(result.ingredients.at(0)?.id).toBe('15152');
    expect(
      await findMissingCatalogIngredientIds(['15152', 'not-real'])
    ).toEqual(['not-real']);
  });

  it('validator blocks allergies, medical restrictions, and never-include ingredients', () => {
    const candidate: CandidateBundle = {
      id: 'candidate-1',
      courses: [
        {
          name: 'Main',
          ingredients: [
            {
              id: '15152',
              name: 'Shrimp',
              tags: ['shellfish']
            },
            {
              id: 'soy-sauce',
              name: 'Soy Sauce',
              tags: ['soy', 'sodium']
            }
          ]
        }
      ]
    };

    const result = validateHardConstraints(candidate, [
      {
        userId: 'user-1',
        allergies: ['shellfish'],
        medicalRestrictions: ['sodium'],
        neverIncludeIngredientIds: ['15152'],
        updatedAt: new Date().toISOString()
      }
    ]);

    expect(result.allowed).toBe(false);
    expect(
      result.violations
        .map((violation) => violation.constraintType)
        .sort()
    ).toEqual([
      'allergy',
      'medicalRestriction',
      'neverInclude'
    ]);
  });

  it('filterCandidatesByHardConstraints removes unsafe candidates and keeps safe ones', () => {
    const safeCandidate: CandidateBundle = {
      id: 'safe',
      courses: [
        {
          name: 'Side',
          ingredients: [{ id: 'rice', name: 'Rice' }]
        }
      ]
    };
    const unsafeCandidate: CandidateBundle = {
      id: 'unsafe',
      courses: [
        {
          name: 'Main',
          ingredients: [{ id: 'peanuts', name: 'Peanuts' }]
        }
      ]
    };

    const result = filterCandidatesByHardConstraints(
      [safeCandidate, unsafeCandidate],
      [
        {
          userId: 'user-1',
          allergies: ['peanut'],
          medicalRestrictions: [],
          neverIncludeIngredientIds: [],
          updatedAt: new Date().toISOString()
        }
      ]
    );

    expect(
      result.accepted.map((candidate) => candidate.id)
    ).toEqual(['safe']);
    expect(
      result.rejected.map((candidate) => candidate.candidate.id)
    ).toEqual(['unsafe']);
  });

});
