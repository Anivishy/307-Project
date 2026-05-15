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

describe('US8 staples settings', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('returns the exact default staples preset', async () => {
    const response = await getSettings(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/settings`,
        DEMO_ADMIN_ID
      ),
      routeParams(GROUP_ID)
    );

    const payload = (await response.json()) as {
      defaultStaplesPreset: Array<{ id: string; name: string }>;
    };

    expect(payload.defaultStaplesPreset).toEqual([
      { id: 'olive-oil', name: 'Olive oil' },
      { id: 'butter', name: 'Butter' },
      { id: 'salt', name: 'Salt' },
      { id: 'pepper', name: 'Pepper' }
    ]);
  });

  it('allows an admin to toggle staplesEnabled on and off', async () => {
    const enableResponse = await patchSettings(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/settings`,
        DEMO_ADMIN_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({ staplesEnabled: true })
        }
      ),
      routeParams(GROUP_ID)
    );

    const enabledSettings = (await enableResponse.json()) as {
      staplesEnabled: boolean;
    };
    expect(enabledSettings.staplesEnabled).toBe(true);

    const disableResponse = await patchSettings(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/settings`,
        DEMO_ADMIN_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({ staplesEnabled: false })
        }
      ),
      routeParams(GROUP_ID)
    );

    const disabledSettings = (await disableResponse.json()) as {
      staplesEnabled: boolean;
    };
    expect(disabledSettings.staplesEnabled).toBe(false);
  });

  it('allows an admin to add and remove custom staples', async () => {
    const addResponse = await patchSettings(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/settings`,
        DEMO_ADMIN_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({
            customStaples: ['basil-leaves', 'thyme']
          })
        }
      ),
      routeParams(GROUP_ID)
    );

    const addSettings = (await addResponse.json()) as {
      customStaples: Array<{ id: string; name: string }>;
    };

    expect(addSettings.customStaples).toEqual([
      { id: 'basil-leaves', name: 'Basil leaves' },
      { id: 'thyme', name: 'Fresh thyme' }
    ]);

    const removeResponse = await patchSettings(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/settings`,
        DEMO_ADMIN_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({ customStaples: ['thyme'] })
        }
      ),
      routeParams(GROUP_ID)
    );

    const removeSettings = (await removeResponse.json()) as {
      customStaples: Array<{ id: string; name: string }>;
    };

    expect(removeSettings.customStaples).toEqual([
      { id: 'thyme', name: 'Fresh thyme' }
    ]);
  });

  it('treats enabled staples as unlimited and surfaces them in the rationale', async () => {
    await patchSettings(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/settings`,
        DEMO_ADMIN_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({
            staplesEnabled: true,
            customStaples: ['basil-leaves']
          })
        }
      ),
      routeParams(GROUP_ID)
    );

    const response = await getBundleCandidates(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
        DEMO_ADMIN_ID
      ),
      routeParams(GROUP_ID)
    );

    const payload = (await response.json()) as {
      candidates: Array<{
        id: string;
        rationale: string;
        assumedStaples: Array<{ name: string }>;
        contributorMapping: Record<
          string,
          Array<{ userId: string }>
        >;
      }>;
    };

    const gardenPasta = payload.candidates.find(
      (candidate) =>
        candidate.id === 'bundle-garden-pasta-board'
    );
    const bruschetta = payload.candidates.find(
      (candidate) => candidate.id === 'bundle-bruschetta-board'
    );

    expect(gardenPasta).toBeDefined();
    expect(
      gardenPasta?.assumedStaples.map((item) => item.name)
    ).toEqual(expect.arrayContaining(['Olive oil', 'Salt']));
    expect(
      gardenPasta?.contributorMapping['olive-oil']
    ).toEqual([
      expect.objectContaining({ userId: 'group-staples' })
    ]);
    expect(gardenPasta?.rationale).toContain(
      'Assumed staples: Olive oil, Salt.'
    );

    expect(bruschetta).toBeDefined();
    expect(
      bruschetta?.assumedStaples.map((item) => item.name)
    ).toContain('Basil leaves');
  });

  it('prevents non-admin members from modifying staples settings', async () => {
    const response = await patchSettings(
      requestAs(
        `http://localhost/api/groups/${GROUP_ID}/settings`,
        DEMO_MEMBER_ID,
        {
          method: 'PATCH',
          body: JSON.stringify({ staplesEnabled: true })
        }
      ),
      routeParams(GROUP_ID)
    );

    expect(response.status).toBe(403);
  });
});
