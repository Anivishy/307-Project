import { ApiError } from "./api-error";
import {
  getDefaultStaplesPreset,
  getIngredientCatalog,
  getBundleTemplates,
  getGroupPantry,
  getGroupRecord,
  resolveIngredientIds,
  type GroupRole,
  updateGroupRecord,
} from "./demo-store";
import { buildValidatedCandidateSet } from "./bundle-validator";

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
  updatedAt: string;
  viewerRole: GroupRole;
};

type GroupSettingsUpdate = {
  allowMissingIngredients?: boolean;
  staplesEnabled?: boolean;
  customStaples?: string[];
};

function buildSettingsPayload(groupId: string, viewerRole: GroupRole) {
  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found.");
  }

  return {
    groupId: group.id,
    groupName: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    staplesEnabled: group.staplesEnabled,
    defaultStaplesPreset: getDefaultStaplesPreset(),
    customStaples: resolveIngredientIds(group.customStaples),
    ingredientCatalog: getIngredientCatalog(),
    updatedAt: group.updatedAt,
    viewerRole,
  };
}

function getViewerContext(groupId: string, userId: string): ViewerContext {
  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found.");
  }

  const membership = group.members.find((member) => member.userId === userId);

  if (!membership) {
    throw new ApiError(403, "You must belong to the group to access its settings.");
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
    updatedAt: group.updatedAt,
    viewerRole: membership.role,
  };
}

export function readGroupSettings(groupId: string, userId: string) {
  return getViewerContext(groupId, userId);
}

export function saveGroupSettings(groupId: string, userId: string, updates: GroupSettingsUpdate) {
  const context = getViewerContext(groupId, userId);

  if (context.viewerRole !== "admin") {
    throw new ApiError(403, "Only admins can update group settings.");
  }

  if (updates.customStaples) {
    const validIds = new Set(getIngredientCatalog().map((item) => item.id));
    const invalidStaple = updates.customStaples.find((id) => !validIds.has(id));

    if (invalidStaple) {
      throw new ApiError(400, `Unknown staple ingredient id: ${invalidStaple}.`);
    }
  }

  const updatedGroup = updateGroupRecord(groupId, updates);

  if (!updatedGroup) {
    throw new ApiError(404, "Group not found.");
  }

  return buildSettingsPayload(updatedGroup.id, context.viewerRole);
}

export function readBundleCandidates(groupId: string, userId: string) {
  const context = getViewerContext(groupId, userId);
  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found.");
  }

  // Validation happens after loading pantry and templates so the response can include
  // both visible candidates and the number filtered out by group policy.
  const candidateSet = buildValidatedCandidateSet(group, getBundleTemplates(groupId), getGroupPantry(groupId));

  return {
    ...context,
    ...candidateSet,
  };
}
