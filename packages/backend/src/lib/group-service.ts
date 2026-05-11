import { ApiError } from "./api-error";
import {
  getBundleTemplates,
  getGroupPantry,
  getGroupRecord,
  type GroupRole,
  updateAllowMissingIngredientsSetting,
} from "./demo-store";
import { buildValidatedCandidateSet } from "./bundle-validator";

type ViewerContext = {
  groupId: string;
  groupName: string;
  allowMissingIngredients: boolean;
  updatedAt: string;
  viewerRole: GroupRole;
};

function getViewerContext(groupId: string, userId: string): ViewerContext {
  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found.");
  }

  const membership = group.members.find((member) => member.userId === userId);

  if (!membership) {
    throw new ApiError(403, "You must belong to the group to access its settings.");
  }

  return {
    groupId: group.id,
    groupName: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    updatedAt: group.updatedAt,
    viewerRole: membership.role,
  };
}

export function readGroupSettings(groupId: string, userId: string) {
  return getViewerContext(groupId, userId);
}

export function saveGroupSettings(groupId: string, userId: string, allowMissingIngredients: boolean) {
  const context = getViewerContext(groupId, userId);

  if (context.viewerRole !== "admin") {
    throw new ApiError(403, "Only admins can update the missing ingredients setting.");
  }

  const updatedGroup = updateAllowMissingIngredientsSetting(groupId, allowMissingIngredients);

  if (!updatedGroup) {
    throw new ApiError(404, "Group not found.");
  }

  return {
    groupId: updatedGroup.id,
    groupName: updatedGroup.name,
    allowMissingIngredients: updatedGroup.allowMissingIngredients,
    updatedAt: updatedGroup.updatedAt,
    viewerRole: context.viewerRole,
  };
}

export function readBundleCandidates(groupId: string, userId: string) {
  const context = getViewerContext(groupId, userId);
  const group = getGroupRecord(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found.");
  }

  const candidateSet = buildValidatedCandidateSet(group, getBundleTemplates(groupId), getGroupPantry(groupId));

  return {
    ...context,
    ...candidateSet,
  };
}
