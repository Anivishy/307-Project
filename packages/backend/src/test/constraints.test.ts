import { beforeEach, describe, expect, it } from 'vitest';

import { GET as getBundleCandidates } from '../app/api/groups/[groupId]/bundle-candidates/route';
import {
  findMissingIngredientIds,
  searchIngredients
} from '../lib/constraints/ingredients.ts';
import { parseConstraintsPayload } from '../lib/constraints/normalize.ts';
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
import {
  DEMO_ADMIN_USER_ID,
  resetDemoState
} from '../lib/demo-store';

const GROUP_ID = 'dorm-dinner-crew';

function createRouteContext(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function createRequest(
  url: string,
  userId: string,
  init?: RequestInit
) {
  return new Request(url, {
    headers: {
      'content-type': 'application/json',
      'x-user-id': userId,
      ...(init?.headers ?? {})
    },
    ...init
  });
}

describe('US5 hard dietary constraints', () => {
  beforeEach(() => {
    resetConstraintStoreForTests();
    resetDemoState();
  });

  it('parseConstraintsPayload normalizes and deduplicates constraint fields', () => {
    const parsed = parseConstraintsPayload(
      {
        allergies: [' Peanuts ', 'peanuts', ''],
        medicalRestrictions: ['Low Sodium', ' low   sodium '],
        neverIncludeIngredientIds: [' SHRIMP ', 'shrimp']
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
        'shrimp'
      ]);
    }
  });

  it('constraint store replaces all fields and patches only provided fields', () => {
    replaceUserConstraints('user-1', {
      allergies: ['peanuts'],
      medicalRestrictions: ['gluten'],
      neverIncludeIngredientIds: ['shrimp']
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
    ).toEqual(['shrimp']);
  });

  it('ingredient search supports typeahead and invalid id detection', () => {
    expect(searchIngredients('shr').at(0)?.id).toBe('shrimp');
    expect(
      findMissingIngredientIds(['shrimp', 'not-real'])
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
              id: 'shrimp',
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
        neverIncludeIngredientIds: ['shrimp'],
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

  it('stored profile constraints hide violating group bundle candidates', async () => {
    patchUserConstraints(DEMO_ADMIN_USER_ID, {
      neverIncludeIngredientIds: ['cream']
    });

    const candidateResponse = await getBundleCandidates(
      createRequest(
        `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
        DEMO_ADMIN_USER_ID
      ),
      createRouteContext(GROUP_ID)
    );

    const payload = (await candidateResponse.json()) as {
      candidates: Array<{ id: string }>;
      hardConstraintRejectedCount: number;
    };

    expect(candidateResponse.status).toBe(200);
    expect(payload.hardConstraintRejectedCount).toBeGreaterThan(
      0
    );
    expect(
      payload.candidates.some(
        (candidate) =>
          candidate.id === 'bundle-creamy-tuscan-night'
      )
    ).toBe(false);
  });
});
