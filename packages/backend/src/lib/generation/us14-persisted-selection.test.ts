import { beforeEach, describe, expect, it, vi } from 'vitest';

const GROUP_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const CANDIDATE_ID = 'bundle-spring-table';

const { loadGenerationGroupMock, prismaMock } = vi.hoisted(() => ({
  loadGenerationGroupMock: vi.fn(),
  prismaMock: {
    group: {
      updateMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

vi.mock('../prisma', () => ({
  prisma: prismaMock
}));

vi.mock('./group-context', () => ({
  loadGenerationGroup: loadGenerationGroupMock
}));

vi.mock('../bundle-validator', () => ({
  buildValidatedCandidateSet: vi.fn(() => ({
    filteredOutCandidateCount: 0,
    candidates: [
      {
        id: CANDIDATE_ID,
        title: 'Spring Table',
        ingredientList: [],
        contributorMapping: {}
      }
    ]
  }))
}));

vi.mock('./constraints-loader', () => ({
  loadMemberConstraints: vi.fn(async () => []),
  aggregateMemberPreferences: vi.fn(() => ({
    diets: [],
    intolerances: [],
    preferredCuisines: [],
    excludedCuisines: [],
    dislikedIngredients: [],
    spiceLevels: []
  }))
}));

vi.mock('./bundle-candidate-store', () => ({
  getStoredCandidateSet: vi.fn(() => ({
    templates: [{ id: CANDIDATE_ID }],
    candidateSetId: `${GROUP_ID}:4:2`,
    generatedAt: '2026-06-01T00:00:00.000Z',
    pantrySnapshotVersion: 4,
    activeBundleVersion: 2,
    source: 'spoonacular',
    request: {}
  })),
  appendStoredCandidateTemplate: vi.fn(),
  replaceStoredCandidateSet: vi.fn()
}));

function loadedGroup() {
  return {
    group: {
      id: GROUP_ID,
      name: 'Study Dinner Crew',
      allowMissingIngredients: false,
      staplesEnabled: false,
      customStaples: [],
      pantrySnapshotVersion: 4,
      activeBundleVersion: 2,
      selectedBundleId: null,
      activeReservations: [],
      updatedAt: '2026-06-01T00:00:00.000Z',
      members: [{ userId: ADMIN_ID, name: 'Kartik', role: 'admin' }]
    },
    pantry: [],
    memberProfileIds: [ADMIN_ID],
    viewerRole: 'admin',
    isDemoGroup: false
  };
}

describe('kartik US14 persisted bundle selection concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadGenerationGroupMock.mockResolvedValue(loadedGroup());
  });

  it('selects with a version-guarded update on current generation services', async () => {
    const { selectGeneratedBundleCandidate } = await import(
      './bundle-generation-service'
    );
    prismaMock.group.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.group.findUnique.mockResolvedValue({
      pantrySnapshotVersion: 4,
      activeBundleVersion: 3,
      selectedBundleId: CANDIDATE_ID
    });

    const payload = await selectGeneratedBundleCandidate(
      GROUP_ID,
      ADMIN_ID,
      {
        bundleId: CANDIDATE_ID,
        pantrySnapshotVersion: 4,
        activeBundleVersion: 2
      }
    );

    expect(prismaMock.group.updateMany).toHaveBeenCalledWith({
      where: {
        id: GROUP_ID,
        pantrySnapshotVersion: 4,
        activeBundleVersion: 2
      },
      data: {
        selectedBundleId: CANDIDATE_ID,
        activeBundleVersion: { increment: 1 }
      }
    });
    expect(payload).toMatchObject({
      selectedBundleId: CANDIDATE_ID,
      selectedBundleTitle: 'Spring Table',
      activeBundleVersion: 3
    });
  });

  it('rejects a concurrent stale write when another admin wins first', async () => {
    const { selectGeneratedBundleCandidate } = await import(
      './bundle-generation-service'
    );
    prismaMock.group.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      selectGeneratedBundleCandidate(GROUP_ID, ADMIN_ID, {
        bundleId: CANDIDATE_ID,
        pantrySnapshotVersion: 4,
        activeBundleVersion: 2
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message:
        'Candidate set is stale. Refresh or explicitly confirm before selecting.'
    });
    expect(prismaMock.group.findUnique).not.toHaveBeenCalled();
  });
});
