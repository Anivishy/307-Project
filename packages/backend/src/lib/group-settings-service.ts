import type { GroupRole } from '../generated/prisma';
import { ApiError } from './api-error';
import {
  findIngredientById,
  findMissingIngredientIds,
  listIngredients
} from './constraints/ingredients';
import type { IngredientSummary } from './constraints/types';
import { prisma } from './prisma';
import { assertUuid } from './request-user';

type GroupSettingsUpdate = {
  allowMissingIngredients?: boolean;
  staplesEnabled?: boolean;
  customStaples?: string[];
};

const DEFAULT_STAPLE_IDS = ['olive-oil', 'butter', 'salt', 'pepper'];

function roleLabel(role: GroupRole) {
  return role === 'MEMBER' ? 'member' : 'admin';
}

function resolveIngredientIds(ids: string[]): IngredientSummary[] {
  return ids
    .map((id) => findIngredientById(id))
    .filter((ingredient): ingredient is IngredientSummary =>
      Boolean(ingredient)
    );
}

function normalizeStapleIds(ids: string[]) {
  const normalizedIds = [
    ...new Set(
      ids
        .map((id) => id.trim().toLowerCase())
        .filter((id) => id.length > 0)
    )
  ];
  const missingIds = findMissingIngredientIds(normalizedIds);

  if (missingIds.length > 0) {
    throw new ApiError(
      400,
      `Unknown staple ingredient id: ${missingIds[0]}.`
    );
  }

  return normalizedIds;
}

async function getGroupWithMembership(
  groupId: string,
  profileId: string
) {
  assertUuid(groupId, 'groupId');
  assertUuid(profileId, 'authenticated user id');

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true }
  });

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  const membership = group.members.find(
    (member) => member.profileId === profileId
  );

  if (!membership) {
    throw new ApiError(403, 'You are not a member of this group.');
  }

  return { group, membership };
}

function serializeGroupSettings(
  group: Awaited<ReturnType<typeof getGroupWithMembership>>['group'],
  viewerRole: GroupRole
) {
  return {
    groupId: group.id,
    groupName: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    staplesEnabled: group.staplesEnabled,
    defaultStaplesPreset: resolveIngredientIds(DEFAULT_STAPLE_IDS),
    customStaples: resolveIngredientIds(group.customStaples ?? []),
    ingredientCatalog: listIngredients(),
    pantrySnapshotVersion: group.pantrySnapshotVersion,
    activeBundleVersion: group.activeBundleVersion,
    selectedBundleId: group.selectedBundleId,
    updatedAt: group.updatedAt.toISOString(),
    viewerRole: roleLabel(viewerRole)
  };
}

export async function readPersistedGroupSettings(
  groupId: string,
  profileId: string
) {
  const { group, membership } = await getGroupWithMembership(
    groupId,
    profileId
  );

  return serializeGroupSettings(group, membership.role);
}

export async function savePersistedGroupSettings(
  groupId: string,
  profileId: string,
  updates: GroupSettingsUpdate
) {
  const { membership } = await getGroupWithMembership(
    groupId,
    profileId
  );

  if (membership.role === 'MEMBER') {
    throw new ApiError(
      403,
      'Only admins can update group settings.'
    );
  }

  const data = {
    ...(updates.allowMissingIngredients !== undefined
      ? { allowMissingIngredients: updates.allowMissingIngredients }
      : {}),
    ...(updates.staplesEnabled !== undefined
      ? { staplesEnabled: updates.staplesEnabled }
      : {}),
    ...(updates.customStaples !== undefined
      ? { customStaples: normalizeStapleIds(updates.customStaples) }
      : {})
  };

  const group = await prisma.group.update({
    where: { id: groupId },
    data,
    include: { members: true }
  });

  return serializeGroupSettings(group, membership.role);
}
