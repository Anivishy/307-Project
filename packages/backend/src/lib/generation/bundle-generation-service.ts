import { ApiError } from '../api-error';
import { buildValidatedCandidateSet } from '../bundle-validator';
import type { BundleTemplate } from '../demo-store';
import {
  getBundleTemplates,
  getGroupPantry,
  getGroupRecord
} from '../demo-store';
import { findCatalogIngredientsByIds } from '../ingredient-catalog-service';
import { isSpoonacularGenerationMockMode } from '../spoonacular/config';
import {
  appendStoredCandidateTemplate,
  getStoredCandidateSet,
  replaceStoredCandidateSet,
  type BundleGenerationRequest,
  type StoredCandidateSet
} from './bundle-candidate-store';
import {
  generateBundleTemplates,
  generateOneMoreBundleTemplate
} from './bundle-orchestrator';
import {
  aggregateMemberPreferences,
  loadMemberConstraints
} from './constraints-loader';
import { loadGenerationGroup } from './group-context';

function buildExcludeIngredientNames(
  neverIncludeIngredientIds: string[],
  resolvedNames: string[]
) {
  return [
    ...new Set(
      [...neverIncludeIngredientIds, ...resolvedNames]
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ];
}

async function resolveNeverIncludeNames(
  memberConstraints: Awaited<ReturnType<typeof loadMemberConstraints>>
) {
  const neverIncludeIds = [
    ...new Set(
      memberConstraints.flatMap(
        (constraints) => constraints.neverIncludeIngredientIds
      )
    )
  ];

  if (neverIncludeIds.length === 0) {
    return [];
  }

  const ingredients = await findCatalogIngredientsByIds(neverIncludeIds);
  return ingredients.map((ingredient) => ingredient.name);
}

function resolveTemplatesForRead(
  groupId: string,
  storedTemplates: BundleTemplate[]
) {
  if (storedTemplates.length > 0) {
    return storedTemplates;
  }

  if (isSpoonacularGenerationMockMode()) {
    const demoTemplates = getBundleTemplates(groupId);
    if (demoTemplates.length > 0) {
      return demoTemplates;
    }
  }

  return [];
}

function serializeCandidateResponse(
  loaded: Awaited<ReturnType<typeof loadGenerationGroup>>,
  candidateSet: ReturnType<typeof buildValidatedCandidateSet>,
  stored?: StoredCandidateSet
) {
  return {
    groupId: loaded.group.id,
    groupName: loaded.group.name,
    allowMissingIngredients: loaded.group.allowMissingIngredients,
    staplesEnabled: loaded.group.staplesEnabled,
    pantrySnapshotVersion: loaded.group.pantrySnapshotVersion,
    activeBundleVersion: loaded.group.activeBundleVersion,
    selectedBundleId: loaded.group.selectedBundleId,
    updatedAt: loaded.group.updatedAt,
    viewerRole: loaded.viewerRole,
    candidateSetId:
      stored?.candidateSetId ??
      `${loaded.group.id}:${loaded.group.pantrySnapshotVersion}:${loaded.group.activeBundleVersion}`,
    generatedAt: stored?.generatedAt ?? new Date().toISOString(),
    generationSource:
      stored?.source ??
      (isSpoonacularGenerationMockMode() ? 'mock' : 'spoonacular'),
    needsGeneration:
      candidateSet.candidates.length === 0 &&
      !isSpoonacularGenerationMockMode(),
    ...candidateSet,
    candidates: candidateSet.candidates.map((candidate) => ({
      ...candidate,
      pantrySnapshotVersion: loaded.group.pantrySnapshotVersion,
      activeBundleVersion: loaded.group.activeBundleVersion,
      isSelected: candidate.id === loaded.group.selectedBundleId
    }))
  };
}

async function persistSelectedBundle(input: {
  groupId: string;
  bundleId: string;
  pantrySnapshotVersion: number;
  activeBundleVersion: number;
  isForced: boolean;
}) {
  const { prisma } = await import('../prisma');
  const result = await prisma.group.updateMany({
    where: input.isForced
      ? { id: input.groupId }
      : {
          id: input.groupId,
          pantrySnapshotVersion: input.pantrySnapshotVersion,
          activeBundleVersion: input.activeBundleVersion
        },
    data: {
      selectedBundleId: input.bundleId,
      activeBundleVersion: { increment: 1 }
    }
  });

  if (result.count === 0) {
    throw new ApiError(
      input.isForced ? 404 : 409,
      input.isForced
        ? 'Group not found.'
        : 'Candidate set is stale. Refresh or explicitly confirm before selecting.'
    );
  }

  const group = await prisma.group.findUnique({
    where: { id: input.groupId },
    select: {
      pantrySnapshotVersion: true,
      activeBundleVersion: true,
      selectedBundleId: true
    }
  });

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  return group;
}

export async function readGeneratedBundleCandidates(
  groupId: string,
  profileId: string
) {
  const loaded = await loadGenerationGroup(groupId, profileId);
  const stored = getStoredCandidateSet(groupId);
  const templates = resolveTemplatesForRead(
    groupId,
    stored?.templates ?? []
  );
  const memberConstraints = await loadMemberConstraints(
    loaded.memberProfileIds,
    loaded.isDemoGroup
  );
  const candidateSet = buildValidatedCandidateSet(
    loaded.group,
    templates,
    loaded.pantry,
    memberConstraints
  );

  return serializeCandidateResponse(
    loaded,
    candidateSet,
    stored
  );
}

export async function createBundleGenerationRequest(
  groupId: string,
  profileId: string,
  request: BundleGenerationRequest
) {
  const loaded = await loadGenerationGroup(groupId, profileId);

  if (loaded.viewerRole !== 'admin') {
    throw new ApiError(
      403,
      'Only admins can generate bundle candidates.'
    );
  }

  const memberConstraints = await loadMemberConstraints(
    loaded.memberProfileIds,
    loaded.isDemoGroup
  );
  const neverIncludeNames = await resolveNeverIncludeNames(
    memberConstraints
  );
  const memberPreferences = aggregateMemberPreferences(memberConstraints);
  const pantryIngredientNames = [
    ...new Set(loaded.pantry.map((item) => item.name))
  ];
  const excludeIngredients = buildExcludeIngredientNames(
    [
      ...memberConstraints.flatMap(
        (constraints) => constraints.neverIncludeIngredientIds
      ),
      ...memberPreferences.dislikedIngredients
    ],
    neverIncludeNames
  );

  const templates = await generateBundleTemplates(
    groupId,
    request,
    pantryIngredientNames,
    excludeIngredients,
    memberPreferences
  );

  if (templates.length === 0) {
    throw new ApiError(
      502,
      'Spoonacular did not return any valid bundle candidates.'
    );
  }

  const stored = replaceStoredCandidateSet(groupId, {
    candidateSetId: `${groupId}:${loaded.group.pantrySnapshotVersion}:${loaded.group.activeBundleVersion}`,
    groupId,
    templates,
    generatedAt: new Date().toISOString(),
    pantrySnapshotVersion: loaded.group.pantrySnapshotVersion,
    activeBundleVersion: loaded.group.activeBundleVersion,
    source: isSpoonacularGenerationMockMode() ? 'mock' : 'spoonacular',
    request
  });

  const candidateSet = buildValidatedCandidateSet(
    loaded.group,
    templates,
    loaded.pantry,
    memberConstraints
  );

  return serializeCandidateResponse(loaded, candidateSet, stored);
}

export async function appendGeneratedBundleCandidate(
  groupId: string,
  profileId: string
) {
  const loaded = await loadGenerationGroup(groupId, profileId);

  if (loaded.viewerRole !== 'admin') {
    throw new ApiError(
      403,
      'Only admins can generate additional bundle candidates.'
    );
  }

  const stored = getStoredCandidateSet(groupId);

  if (!stored) {
    throw new ApiError(
      400,
      'Generate an initial candidate set before requesting one more bundle.'
    );
  }

  const memberConstraints = await loadMemberConstraints(
    loaded.memberProfileIds,
    loaded.isDemoGroup
  );
  const neverIncludeNames = await resolveNeverIncludeNames(
    memberConstraints
  );
  const memberPreferences = aggregateMemberPreferences(memberConstraints);
  const pantryIngredientNames = [
    ...new Set(loaded.pantry.map((item) => item.name))
  ];
  const excludeIngredients = buildExcludeIngredientNames(
    [
      ...memberConstraints.flatMap(
        (constraints) => constraints.neverIncludeIngredientIds
      ),
      ...memberPreferences.dislikedIngredients
    ],
    neverIncludeNames
  );

  const nextTemplate = await generateOneMoreBundleTemplate(
    groupId,
    stored.request,
    pantryIngredientNames,
    stored.templates.length,
    excludeIngredients,
    memberPreferences
  );

  if (!nextTemplate) {
    throw new ApiError(
      502,
      'Spoonacular did not return another valid bundle candidate.'
    );
  }

  const updatedStored = appendStoredCandidateTemplate(
    groupId,
    nextTemplate
  );

  if (!updatedStored) {
    throw new ApiError(500, 'Unable to append bundle candidate.');
  }

  const candidateSet = buildValidatedCandidateSet(
    loaded.group,
    updatedStored.templates,
    loaded.pantry,
    memberConstraints
  );

  return serializeCandidateResponse(
    loaded,
    candidateSet,
    updatedStored
  );
}

export async function selectGeneratedBundleCandidate(
  groupId: string,
  profileId: string,
  input: {
    bundleId?: unknown;
    pantrySnapshotVersion?: unknown;
    activeBundleVersion?: unknown;
    force?: unknown;
  }
) {
  const { selectBundleCandidate } = await import('../group-service');

  if (!/^[0-9a-f-]{36}$/i.test(groupId)) {
    return selectBundleCandidate(groupId, profileId, input);
  }

  const loaded = await loadGenerationGroup(groupId, profileId);

  if (loaded.viewerRole !== 'admin') {
    throw new ApiError(403, 'Only admins can select the active bundle.');
  }

  const bundleId =
    typeof input.bundleId === 'string' && input.bundleId.trim().length > 0
      ? input.bundleId.trim()
      : null;

  if (!bundleId) {
    throw new ApiError(400, 'bundleId is required.');
  }

  const pantrySnapshotVersion = Number(input.pantrySnapshotVersion);
  const activeBundleVersion = Number(input.activeBundleVersion);

  if (
    !Number.isInteger(pantrySnapshotVersion) ||
    pantrySnapshotVersion < 0 ||
    !Number.isInteger(activeBundleVersion) ||
    activeBundleVersion < 0
  ) {
    throw new ApiError(
      400,
      'pantrySnapshotVersion and activeBundleVersion must be non-negative integers.'
    );
  }

  const isForced = input.force === true;
  const isStale =
    pantrySnapshotVersion !== loaded.group.pantrySnapshotVersion ||
    activeBundleVersion !== loaded.group.activeBundleVersion;

  if (isStale && !isForced) {
    throw new ApiError(
      409,
      'Candidate set is stale. Refresh or explicitly confirm before selecting.'
    );
  }

  const stored = getStoredCandidateSet(groupId);
  const templates = resolveTemplatesForRead(
    groupId,
    stored?.templates ?? (loaded.isDemoGroup ? getBundleTemplates(groupId) : [])
  );
  const memberConstraints = await loadMemberConstraints(
    loaded.memberProfileIds,
    loaded.isDemoGroup
  );
  const candidateSet = buildValidatedCandidateSet(
    loaded.group,
    templates,
    loaded.pantry,
    memberConstraints
  );
  const candidate = candidateSet.candidates.find(
    (item) => item.id === bundleId
  );

  if (!candidate) {
    throw new ApiError(
      404,
      'Bundle candidate not found or no longer valid.'
    );
  }

  const group = await persistSelectedBundle({
    groupId,
    bundleId,
    pantrySnapshotVersion,
    activeBundleVersion,
    isForced
  });

  return {
    groupId,
    selectedBundleId: bundleId,
    selectedBundleTitle: candidate.title,
    releasedBundleId: loaded.group.selectedBundleId,
    pantrySnapshotVersion: group.pantrySnapshotVersion,
    activeBundleVersion: group.activeBundleVersion,
    reservationCount: 0,
    forced: isForced
  };
}
