import { ApiError } from './api-error';
import {
  getDefaultStaples,
  getIngredientOptions,
  getBundles,
  getPantry,
  getDemoGroup,
  getIngredientsById,
  type GroupRole,
  updateDemoGroup
} from './demo-store';
import { buildCandidateList } from './bundle-validator';

// The group service owns US7/US8 demo behavior: settings reads/writes plus
// candidate filtering that depends on missing-ingredient and staples settings.
type GroupView = {
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

type SettingsPatch = {
  allowMissingIngredients?: boolean;
  staplesEnabled?: boolean;
  customStaples?: string[];
};

function formatSettings(
  groupId: string,
  viewerRole: GroupRole
) {
  const group = getDemoGroup(groupId);

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  return {
    groupId: group.id,
    groupName: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    staplesEnabled: group.staplesEnabled,
    defaultStaplesPreset: getDefaultStaples(),
    customStaples: getIngredientsById(group.customStaples),
    ingredientCatalog: getIngredientOptions(),
    updatedAt: group.updatedAt,
    viewerRole
  };
}

function getGroupView(
  groupId: string,
  userId: string
): GroupView {
  const group = getDemoGroup(groupId);

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
    defaultStaplesPreset: getDefaultStaples(),
    customStaples: getIngredientsById(group.customStaples),
    ingredientCatalog: getIngredientOptions(),
    updatedAt: group.updatedAt,
    viewerRole: membership.role
  };
}

export function getGroupSettings(
  groupId: string,
  userId: string
) {
  return getGroupView(groupId, userId);
}

export function updateGroupSettings(
  groupId: string,
  userId: string,
  updates: SettingsPatch
) {
  const view = getGroupView(groupId, userId);

  if (view.viewerRole !== 'admin') {
    throw new ApiError(
      403,
      'Only admins can update group settings.'
    );
  }

  if (updates.customStaples) {
    const ingredientIds = new Set(
      getIngredientOptions().map((item) => item.id)
    );
    const unknownStaple = updates.customStaples.find(
      (id) => !ingredientIds.has(id)
    );

    if (unknownStaple) {
      throw new ApiError(
        400,
        `Unknown staple ingredient id: ${unknownStaple}.`
      );
    }
  }

  const group = updateDemoGroup(groupId, updates);

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  return formatSettings(group.id, view.viewerRole);
}

export function getBundleCandidates(
  groupId: string,
  userId: string
) {
  const view = getGroupView(groupId, userId);
  const group = getDemoGroup(groupId);

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  // Validation happens after loading pantry and bundles so the response can include
  // both visible candidates and the number filtered out by group policy.
  const candidateList = buildCandidateList(
    group,
    getBundles(groupId),
    getPantry(groupId)
  );

  return {
    ...view,
    ...candidateList
  };
}
