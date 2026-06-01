import type { GroupRole } from '../generated/prisma';
import { ApiError } from './api-error';
import type { IngredientSummary } from './constraints/types';
import {
  findCatalogIngredientById,
  findMissingCatalogIngredientIds
} from './ingredient-catalog-service';
import { assertUuid } from './request-user';

type GroupSettingsUpdate = {
  allowMissingIngredients?: boolean;
  staplesEnabled?: boolean;
  customStaples?: string[];
};

const DEFAULT_STAPLE_IDS = ['4053', '1001', '2047', '1002030'];

async function getPrismaClient() {
  const { prisma } = await import('./prisma');
  return prisma;
}

function roleLabel(role: GroupRole) {
  return role === 'MEMBER' ? 'member' : 'admin';
}

async function resolveIngredientIds(
  ids: string[]
): Promise<IngredientSummary[]> {
  const ingredients = await Promise.all(
    ids.map((id) => findCatalogIngredientById(id))
  );

  return ingredients.filter(
    (ingredient): ingredient is IngredientSummary =>
      Boolean(ingredient)
  );
}

async function normalizeStapleIds(ids: string[]) {
  const normalizedIds = [
    ...new Set(
      ids
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  ];
  const missingIds = await findMissingCatalogIngredientIds(
    normalizedIds
  );

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

  const prisma = await getPrismaClient();
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

async function serializeGroupSettings(
  group: Awaited<ReturnType<typeof getGroupWithMembership>>['group'],
  viewerRole: GroupRole
) {
  return {
    groupId: group.id,
    groupName: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    staplesEnabled: group.staplesEnabled,
    defaultStaplesPreset: await resolveIngredientIds(
      DEFAULT_STAPLE_IDS
    ),
    customStaples: await resolveIngredientIds(
      group.customStaples ?? []
    ),
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
      ? {
          customStaples: await normalizeStapleIds(
            updates.customStaples
          )
        }
      : {})
  };

  const prisma = await getPrismaClient();
  const group = await prisma.group.update({
    where: { id: groupId },
    data,
    include: { members: true }
  });

  return serializeGroupSettings(group, membership.role);
}
