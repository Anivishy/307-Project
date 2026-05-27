import { ApiError } from './api-error';
import {
  getDefaultStaplesPreset,
  getIngredientCatalog,
  getBundleTemplates,
  getGroupPantry,
  getGroupRecord,
  replaceActiveBundle,
  resolveIngredientIds,
  type BundleReservation,
  type GroupRole,
  updateGroupRecord
} from './demo-store';
import { buildValidatedCandidateSet } from './bundle-validator';
import { listConstraintsForUsers } from './constraints/store';
import {
  notifyBundleSelection,
  notifyOverrideDisclosures,
  notifyPantryUpdates,
  type PreferenceOverrideDisclosure
} from './email-notifications';

// The group service owns US7/US8 demo behavior: settings reads/writes plus
// candidate filtering that depends on missing-ingredient and staples settings.
type ViewerContext = {
  groupId: string;
  groupName: string;
  allowMissingIngredients: boolean;
  staplesEnabled: boolean;
  defaultStaplesPreset: Array<{ id: string; name: string }>;
  customStaples: Array<{ id: string; name: string }>;
  ingredientCatalog: Array<{ id: string; name: string }>;
  pantrySnapshotVersion: number;
  activeBundleVersion: number;
  selectedBundleId: string | null;
  updatedAt: string;
  viewerRole: GroupRole;
};

type GroupSettingsUpdate = {
  allowMissingIngredients?: boolean;
  staplesEnabled?: boolean;
  customStaples?: string[];
};

type BundleSelectionInput = {
  bundleId?: unknown;
  pantrySnapshotVersion?: unknown;
  activeBundleVersion?: unknown;
  force?: unknown;
  preferenceOverrides?: unknown;
};

function buildSettingsPayload(
  groupId: string,
  viewerRole: GroupRole
) {
  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  return {
    groupId: group.id,
    groupName: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    staplesEnabled: group.staplesEnabled,
    defaultStaplesPreset: getDefaultStaplesPreset(),
    customStaples: resolveIngredientIds(group.customStaples),
    ingredientCatalog: getIngredientCatalog(),
    pantrySnapshotVersion: group.pantrySnapshotVersion,
    activeBundleVersion: group.activeBundleVersion,
    selectedBundleId: group.selectedBundleId,
    updatedAt: group.updatedAt,
    viewerRole
  };
}

function getViewerContext(
  groupId: string,
  userId: string
): ViewerContext {
  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  const membership = group.members.find(
    (member) => member.userId === userId
  );

  if (!membership) {
    throw new ApiError(
      403,
      'You must belong to the group to access its settings.'
    );
  }

  // Every settings response includes viewerRole so the frontend can hide admin-only controls.
  return {
    groupId: group.id,
    groupName: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    staplesEnabled: group.staplesEnabled,
    defaultStaplesPreset: getDefaultStaplesPreset(),
    customStaples: resolveIngredientIds(group.customStaples),
    ingredientCatalog: getIngredientCatalog(),
    pantrySnapshotVersion: group.pantrySnapshotVersion,
    activeBundleVersion: group.activeBundleVersion,
    selectedBundleId: group.selectedBundleId,
    updatedAt: group.updatedAt,
    viewerRole: membership.role
  };
}

function normalizeVersionToken(
  value: unknown,
  fieldName: string
) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new ApiError(
      400,
      `${fieldName} must be a non-negative integer.`
    );
  }

  return value;
}

function normalizeBundleId(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'bundleId is required.');
  }

  return value.trim();
}

function normalizePreferenceOverrides(
  value: unknown
): PreferenceOverrideDisclosure[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ApiError(
      400,
      'preferenceOverrides must be an array.'
    );
  }

  return value.map((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      Array.isArray(item)
    ) {
      throw new ApiError(
        400,
        'Each preference override must be an object.'
      );
    }

    const override = item as Record<string, unknown>;
    const userId = normalizeBundleId(override.userId);
    const preference = normalizeBundleId(override.preference);
    const reason = normalizeBundleId(override.reason);

    return { userId, preference, reason };
  });
}

function buildReservations(
  bundleId: string,
  candidate: ReturnType<
    typeof buildValidatedCandidateSet
  >['candidates'][number]
) {
  const reservations: BundleReservation[] = [];

  for (const ingredient of candidate.ingredientList) {
    const allocations =
      candidate.contributorMapping[ingredient.ingredientId] ??
      [];

    for (const allocation of allocations) {
      reservations.push({
        bundleId,
        ingredientId: ingredient.ingredientId,
        name: ingredient.name,
        quantity: allocation.quantity,
        unit: allocation.unit,
        sourceUserId: allocation.userId,
        sourceName: allocation.userName
      });
    }
  }

  return reservations;
}

export function readGroupSettings(
  groupId: string,
  userId: string
) {
  return getViewerContext(groupId, userId);
}

export function saveGroupSettings(
  groupId: string,
  userId: string,
  updates: GroupSettingsUpdate
) {
  const context = getViewerContext(groupId, userId);

  if (context.viewerRole !== 'admin') {
    throw new ApiError(
      403,
      'Only admins can update group settings.'
    );
  }

  if (updates.customStaples) {
    const validIds = new Set(
      getIngredientCatalog().map((item) => item.id)
    );
    const invalidStaple = updates.customStaples.find(
      (id) => !validIds.has(id)
    );

    if (invalidStaple) {
      throw new ApiError(
        400,
        `Unknown staple ingredient id: ${invalidStaple}.`
      );
    }
  }

  const updatedGroup = updateGroupRecord(groupId, updates);

  if (!updatedGroup) {
    throw new ApiError(404, 'Group not found.');
  }

  return buildSettingsPayload(
    updatedGroup.id,
    context.viewerRole
  );
}

export function readBundleCandidates(
  groupId: string,
  userId: string
) {
  // getViewerContext throws 404 if the group doesn't exist and 403 if the user isn't a member,
  // so the group is guaranteed to exist after this call returns.
  const context = getViewerContext(groupId, userId);
  const group = getGroupRecord(groupId)!;

  // Validation happens after loading pantry and templates so the response can include
  // both visible candidates and the number filtered out by group policy.
  const memberConstraints = listConstraintsForUsers(
    group.members.map((member) => member.userId)
  );
  const candidateSet = buildValidatedCandidateSet(
    group,
    getBundleTemplates(groupId),
    getGroupPantry(groupId),
    memberConstraints
  );

  return {
    ...context,
    candidateSetId: `${group.id}:${group.pantrySnapshotVersion}:${group.activeBundleVersion}`,
    generatedAt: new Date().toISOString(),
    ...candidateSet,
    candidates: candidateSet.candidates.map((candidate) => ({
      ...candidate,
      pantrySnapshotVersion: group.pantrySnapshotVersion,
      activeBundleVersion: group.activeBundleVersion,
      isSelected: candidate.id === group.selectedBundleId
    }))
  };
}

export function selectBundleCandidate(
  groupId: string,
  userId: string,
  input: BundleSelectionInput
) {
  const context = getViewerContext(groupId, userId);

  if (context.viewerRole !== 'admin') {
    throw new ApiError(
      403,
      'Only admins can select the active bundle.'
    );
  }

  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  const bundleId = normalizeBundleId(input.bundleId);
  const preferenceOverrides = normalizePreferenceOverrides(
    input.preferenceOverrides
  );
  const pantrySnapshotVersion = normalizeVersionToken(
    input.pantrySnapshotVersion,
    'pantrySnapshotVersion'
  );
  const activeBundleVersion = normalizeVersionToken(
    input.activeBundleVersion,
    'activeBundleVersion'
  );
  const isForced = input.force === true;
  const isStale =
    pantrySnapshotVersion !== group.pantrySnapshotVersion ||
    activeBundleVersion !== group.activeBundleVersion;

  if (isStale && !isForced) {
    throw new ApiError(
      409,
      'Candidate set is stale. Refresh or explicitly confirm before selecting.'
    );
  }

  const memberConstraints = listConstraintsForUsers(
    group.members.map((member) => member.userId)
  );
  const candidateSet = buildValidatedCandidateSet(
    group,
    getBundleTemplates(groupId),
    getGroupPantry(groupId),
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

  const result = replaceActiveBundle(
    groupId,
    bundleId,
    buildReservations(bundleId, candidate)
  );

  if (!result) {
    throw new ApiError(404, 'Group not found.');
  }

  notifyBundleSelection(result.group, candidate);
  notifyOverrideDisclosures(
    result.group,
    preferenceOverrides,
    bundleId
  );
  notifyPantryUpdates(
    result.group,
    candidate,
    group.activeReservations,
    result.group.activeReservations
  );

  return {
    groupId,
    selectedBundleId: bundleId,
    selectedBundleTitle: candidate.title,
    releasedBundleId: result.releasedBundleId,
    pantrySnapshotVersion: result.group.pantrySnapshotVersion,
    activeBundleVersion: result.group.activeBundleVersion,
    reservationCount: result.group.activeReservations.length,
    forced: isForced
  };
}
