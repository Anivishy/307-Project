import { beforeEach, describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET as getBundleCandidates } from '../app/api/groups/[groupId]/bundle-candidates/route';
import { POST as generationRoute } from '../app/generation/route';
import {
  PATCH as patchProfileConstraintsRoute,
  POST as postProfileConstraintsRoute
} from '../app/api/profile/constraints/route';
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
  DEMO_MEMBER_USER_ID,
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
): NextRequest {
  return new Request(url, {
    headers: {
      'content-type': 'application/json',
      'x-user-id': userId,
      ...(init?.headers ?? {})
    },
    ...init
  }) as unknown as NextRequest;
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

  it('profile constraints POST rejects malformed JSON without replacing saved constraints', async () => {
    replaceUserConstraints(DEMO_ADMIN_USER_ID, {
      allergies: ['peanuts'],
      medicalRestrictions: ['low sodium'],
      neverIncludeIngredientIds: ['shrimp']
    });

    const response = await postProfileConstraintsRoute(
      createRequest(
        'http://localhost/api/profile/constraints',
        DEMO_ADMIN_USER_ID,
        {
          method: 'POST',
          body: '{'
        }
      )
    );

    expect(response.status).toBe(400);
    expect(getUserConstraints(DEMO_ADMIN_USER_ID)).toEqual(
      expect.objectContaining({
        allergies: ['peanuts'],
        medicalRestrictions: ['low sodium'],
        neverIncludeIngredientIds: ['shrimp']
      })
    );
  });

  it('ingredient search supports typeahead and invalid id detection', () => {
    expect(searchIngredients('shr').at(0)?.id).toBe('shrimp');
    expect(
      findMissingIngredientIds(['shrimp', 'not-real'])
    ).toEqual(['not-real']);
    expect(
      findMissingIngredientIds([
        'saffron-threads',
        'basil-leaves'
      ])
    ).toEqual([]);
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
        medicalRestrictions: ['low sodium'],
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

  it('validator uses catalog tags when candidates only include ingredient ids and names', () => {
    const candidate: CandidateBundle = {
      id: 'candidate-catalog-tags',
      courses: [
        {
          name: 'Main',
          ingredients: [{ id: 'shrimp', name: 'Shrimp' }]
        }
      ]
    };

    const result = validateHardConstraints(candidate, [
      {
        userId: 'user-1',
        allergies: ['shellfish'],
        medicalRestrictions: [],
        neverIncludeIngredientIds: [],
        updatedAt: new Date().toISOString()
      }
    ]);

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        constraintType: 'allergy',
        ingredientId: 'shrimp'
      })
    ]);
  });

  it('validator does not treat hazard-free catalog tags as hard constraint violations', () => {
    const safeCandidate: CandidateBundle = {
      id: 'gluten-free-rice',
      courses: [
        {
          name: 'Side',
          ingredients: [{ id: 'rice', name: 'Rice' }]
        }
      ]
    };
    const unsafeCandidate: CandidateBundle = {
      id: 'wheat-flour',
      courses: [
        {
          name: 'Main',
          ingredients: [
            { id: 'wheat-flour', name: 'Wheat Flour' }
          ]
        }
      ]
    };
    const constraints = [
      {
        userId: 'user-1',
        allergies: ['gluten'],
        medicalRestrictions: [],
        neverIncludeIngredientIds: [],
        updatedAt: new Date().toISOString()
      }
    ];

    expect(
      validateHardConstraints(safeCandidate, constraints).allowed
    ).toBe(true);
    expect(
      validateHardConstraints(unsafeCandidate, constraints).allowed
    ).toBe(false);
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

  it('saved profile constraints hide violating group bundle candidates', async () => {
    const saveResponse = await patchProfileConstraintsRoute(
      createRequest(
        'http://localhost/api/profile/constraints',
        DEMO_ADMIN_USER_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({
            neverIncludeIngredientIds: ['cream']
          })
        }
      )
    );

    expect(saveResponse.status).toBe(200);

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
      rejectedCandidates: Array<{
        candidateId: string;
        reason: string;
        hardConstraintViolationCount: number;
      }>;
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
    expect(payload.rejectedCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateId: 'bundle-creamy-tuscan-night',
          reason: 'hard_constraints',
          hardConstraintViolationCount: 1
        })
      ])
    );
  });

  it('generation route derives group constraints server-side', async () => {
    patchUserConstraints(DEMO_MEMBER_USER_ID, {
      neverIncludeIngredientIds: ['cream']
    });

    const response = await generationRoute(
      createRequest('http://localhost/generation', DEMO_ADMIN_USER_ID, {
        method: 'POST',
        body: JSON.stringify({
          groupId: GROUP_ID,
          candidates: [
            {
              id: 'unsafe',
              courses: [
                {
                  name: 'Main',
                  ingredients: [{ id: 'cream', name: 'Cream' }]
                }
              ]
            },
            {
              id: 'safe',
              courses: [
                {
                  name: 'Side',
                  ingredients: [{ id: 'rice', name: 'Rice' }]
                }
              ]
            }
          ]
        })
      })
    );

    const payload = (await response.json()) as {
      candidates: CandidateBundle[];
      rejectedCandidateCount: number;
      rejectedCandidates: Array<{
        candidateId: string;
        reason: string;
        violationCount: number;
      }>;
    };

    expect(response.status).toBe(200);
    expect(payload.candidates.map((candidate) => candidate.id)).toEqual([
      'safe'
    ]);
    expect(payload.rejectedCandidateCount).toBe(1);
    expect(payload.rejectedCandidates).toEqual([
      {
        candidateId: 'unsafe',
        reason: 'hard_constraints',
        violationCount: 1
      }
    ]);
    expect(JSON.stringify(payload)).not.toContain(
      DEMO_MEMBER_USER_ID
    );
    expect(JSON.stringify(payload)).not.toContain('cream');
  });

  it('generation route rejects client-supplied member constraint scope', async () => {
    const response = await generationRoute(
      createRequest('http://localhost/generation', DEMO_ADMIN_USER_ID, {
        method: 'POST',
        body: JSON.stringify({
          groupMemberIds: [DEMO_ADMIN_USER_ID],
          candidates: [
            {
              id: 'candidate',
              courses: [
                {
                  name: 'Main',
                  ingredients: [{ id: 'rice', name: 'Rice' }]
                }
              ]
            }
          ]
        })
      })
    );

    expect(response.status).toBe(400);
  });
});
