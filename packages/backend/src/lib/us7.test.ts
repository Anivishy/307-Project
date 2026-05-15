import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getBundleCandidates } from '../app/api/groups/[groupId]/bundle-candidates/route';
import {
  GET as getSettings,
  PATCH as patchSettings
} from '../app/api/groups/[groupId]/settings/route';
import {
  DEMO_ADMIN_ID,
  DEMO_MEMBER_ID,
  resetDemoStore
} from './demo-store';

const GROUP_ID = 'dorm-dinner-crew';

function routeParams(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function requestAs(
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

describe('US7 missing ingredient settings', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('reflects the current allowMissingIngredients value on load', async () => {
    const response = await getSettings(
      requestAs(
        'http://localhost/api/groups/dorm-dinner-crew/settings',
        DEMO_ADMIN_ID
      ),
      routeParams(GROUP_ID)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      groupId: GROUP_ID,
      allowMissingIngredients: false,
      viewerRole: 'admin'
    });
  });

  it('rejects missing-ingredient candidates when the setting is disabled', async () => {
    const response = await getBundleCandidates(
      requestAs(
        'http://localhost/api/groups/dorm-dinner-crew/bundle-candidates',
        DEMO_ADMIN_ID
      ),
      routeParams(GROUP_ID)
    );

    const payload = (await response.json()) as {
      filteredOutCandidateCount: number;
      candidates: Array<{
        id: string;
        missingIngredients: unknown[];
      }>;
    };

    expect(response.status).toBe(200);
    expect(payload.filteredOutCandidateCount).toBeGreaterThan(
      0
    );
    expect(
      payload.candidates.some(
        (candidate) =>
          candidate.id === 'bundle-saffron-pasta-night'
      )
    ).toBe(false);
    expect(
      payload.candidates.every(
        (candidate) => candidate.missingIngredients.length === 0
      )
    ).toBe(true);
  });

  it('returns flagged candidates with missing ingredient disclosures when the setting is enabled', async () => {
    const updateResponse = await patchSettings(
      requestAs(
        'http://localhost/api/groups/dorm-dinner-crew/settings',
        DEMO_ADMIN_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({
            allowMissingIngredients: true
          })
        }
      ),
      routeParams(GROUP_ID)
    );

    expect(updateResponse.status).toBe(200);

    const candidateResponse = await getBundleCandidates(
      requestAs(
        'http://localhost/api/groups/dorm-dinner-crew/bundle-candidates',
        DEMO_ADMIN_ID
      ),
      routeParams(GROUP_ID)
    );

    const payload = (await candidateResponse.json()) as {
      candidates: Array<{
        id: string;
        missingIngredients: Array<{
          name: string;
          quantityNeeded: number;
          unit: string;
        }>;
      }>;
    };

    const saffronPasta = payload.candidates.find(
      (candidate) =>
        candidate.id === 'bundle-saffron-pasta-night'
    );

    expect(candidateResponse.status).toBe(200);
    expect(saffronPasta).toBeDefined();
    expect(saffronPasta?.missingIngredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Saffron threads',
          quantityNeeded: 1,
          unit: 'tbsp'
        })
      ])
    );
  });

  it('blocks non-admin members from updating the setting', async () => {
    const response = await patchSettings(
      requestAs(
        'http://localhost/api/groups/dorm-dinner-crew/settings',
        DEMO_MEMBER_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({
            allowMissingIngredients: true
          })
        }
      ),
      routeParams(GROUP_ID)
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Only admins can update group settings.'
    });
  });
});
