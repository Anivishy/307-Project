import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getActivity } from '../app/api/groups/[groupId]/activity/route';
import { GET as getBundleCandidates } from '../app/api/groups/[groupId]/bundle-candidates/route';
import { POST as selectBundleCandidate } from '../app/api/groups/[groupId]/bundle-candidates/select/route';
import {
  addDemoPantryItemForTests,
  DEMO_ADMIN_USER_ID,
  DEMO_MEMBER_USER_ID,
  getGroupActivityLog,
  getGroupPantry,
  getGroupRecord,
  recordAdminPantryEdit,
  recordSoftPreferenceOverride,
  resetDemoState,
  updateGroupRecord,
  type PantryItem
} from './demo-store';

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
      'x-demo-user-id': userId,
      ...(init?.headers ?? {})
    },
    ...init
  });
}

async function readCandidateSet() {
  const response = await getBundleCandidates(
    createRequest(
      `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
      DEMO_ADMIN_USER_ID
    ),
    createRouteContext(GROUP_ID)
  );

  expect(response.status).toBe(200);
  return response.json() as Promise<{
    pantrySnapshotVersion: number;
    activeBundleVersion: number;
    candidates: Array<{ id: string; title: string }>;
  }>;
}

async function selectBundle(bundleId: string) {
  const payload = await readCandidateSet();
  const response = await selectBundleCandidate(
    createRequest(
      `http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`,
      DEMO_ADMIN_USER_ID,
      {
        method: 'POST',
        body: JSON.stringify({
          bundleId,
          pantrySnapshotVersion: payload.pantrySnapshotVersion,
          activeBundleVersion: payload.activeBundleVersion
        })
      }
    ),
    createRouteContext(GROUP_ID)
  );

  expect(response.status).toBe(200);
  return response.json() as Promise<{
    reservationCount: number;
    reservations: Array<{
      pantryItemId: string;
      reservedQuantity: number;
      unit: string;
      sourceUnit: string;
    }>;
    missingIngredients: Array<{ ingredientId: string }>;
    unsupportedUnitConversions: Array<{
      ingredientId: string;
      sourceUnit: string;
    }>;
    pantrySnapshotVersion: number;
  }>;
}

describe('US12 automatic pantry decrement and activity log', () => {
  beforeEach(() => {
    resetDemoState();
  });

  it('creates reservations, decrements pantry quantities, and stamps updated labels', async () => {
    const result = await selectBundle(
      'bundle-creamy-tuscan-night'
    );

    expect(result.reservationCount).toBeGreaterThan(0);
    expect(result.reservations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pantryItemId: 'pantry-vinayak-chicken',
          reservedQuantity: 2,
          unit: 'fillets',
          sourceUnit: 'fillets'
        })
      ])
    );

    const pantry = getGroupPantry(GROUP_ID);
    expect(pantry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'pantry-vinayak-chicken',
          quantity: 0,
          lastUpdatedBy: 'bundleSelection',
          lastUpdatedAt: expect.any(String)
        }),
        expect.objectContaining({
          id: 'pantry-kartik-mushrooms',
          quantity: 1
        })
      ])
    );
  });

  it('releases prior reservations before applying a replacement bundle', async () => {
    await selectBundle('bundle-creamy-tuscan-night');
    updateGroupRecord(GROUP_ID, { allowMissingIngredients: true });
    await selectBundle('bundle-garden-pasta-board');

    const pantry = getGroupPantry(GROUP_ID);

    expect(pantry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'pantry-vinayak-chicken',
          quantity: 2
        }),
        expect.objectContaining({
          id: 'pantry-ani-pasta',
          quantity: 1
        })
      ])
    );
  });

  it('flags missing ingredients and skips decrementing them', async () => {
    updateGroupRecord(GROUP_ID, {
      allowMissingIngredients: true
    });

    const result = await selectBundle(
      'bundle-saffron-pasta-night'
    );

    expect(result.missingIngredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: 'saffron-threads'
        })
      ])
    );
    expect(result.reservations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: 'saffron-threads'
        })
      ])
    );
  });

  it('flags unsupported unit conversions in the select response', async () => {
    updateGroupRecord(GROUP_ID, {
      allowMissingIngredients: true
    });
    addDemoPantryItemForTests(GROUP_ID, {
      id: 'pantry-vinayak-tomato-bushel',
      ingredientId: 'tomatoes',
      name: 'Tomatoes',
      quantity: 1,
      unit: 'bushels',
      ownerUserId: DEMO_ADMIN_USER_ID,
      ownerName: 'Vinayak',
      lastUpdatedBy: null,
      lastUpdatedAt: null
    } satisfies PantryItem);

    const result = await selectBundle(
      'bundle-bruschetta-board'
    );

    expect(result.unsupportedUnitConversions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: 'tomatoes',
          sourceUnit: 'bushels'
        })
      ])
    );
  });

  it('propagates owner pantry changes across every group the owner belongs to', async () => {
    await selectBundle('bundle-creamy-tuscan-night');

    expect(getGroupRecord('late-night-snacks')).toMatchObject({
      pantrySnapshotVersion: 2
    });
  });

  it('records bundle selection, admin pantry edit, and soft preference override activity', async () => {
    await selectBundle('bundle-creamy-tuscan-night');
    recordAdminPantryEdit(
      GROUP_ID,
      DEMO_ADMIN_USER_ID,
      'pantry-vinayak-tomatoes',
      5
    );
    recordSoftPreferenceOverride(
      GROUP_ID,
      DEMO_ADMIN_USER_ID,
      DEMO_MEMBER_USER_ID,
      'dislikes mushrooms',
      'Needed for the selected bundle'
    );

    expect(getGroupActivityLog(GROUP_ID)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'bundleSelection'
        }),
        expect.objectContaining({
          eventType: 'adminPantryEdit'
        }),
        expect.objectContaining({
          eventType: 'softPreferenceOverride'
        })
      ])
    );
  });

  it('allows members to read activity and blocks non-members', async () => {
    await selectBundle('bundle-creamy-tuscan-night');

    const memberResponse = await getActivity(
      createRequest(
        `http://localhost/api/groups/${GROUP_ID}/activity`,
        DEMO_MEMBER_USER_ID
      ),
      createRouteContext(GROUP_ID)
    );
    expect(memberResponse.status).toBe(200);

    const outsiderResponse = await getActivity(
      createRequest(
        'http://localhost/api/groups/dorm-dinner-crew/activity',
        'user-outsider'
      ),
      createRouteContext(GROUP_ID)
    );
    expect(outsiderResponse.status).toBe(403);
  });
});
