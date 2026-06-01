import type { GroupRole } from '../../generated/prisma';
import { ApiError } from '../api-error';
import type { GroupRecord, PantryItem } from '../demo-store';
import { prisma } from '../prisma';
import { assertUuid } from '../request-user';

function mapRole(role: GroupRole): 'admin' | 'member' {
  return role === 'MEMBER' ? 'member' : 'admin';
}

export type LoadedGenerationGroup = {
  group: GroupRecord;
  pantry: PantryItem[];
  memberProfileIds: string[];
  viewerRole: 'admin' | 'member';
  isDemoGroup: boolean;
};

export function isDemoGroupId(groupId: string) {
  return !/^[0-9a-f-]{36}$/i.test(groupId);
}

export async function loadGenerationGroup(
  groupId: string,
  profileId: string
): Promise<LoadedGenerationGroup> {
  if (isDemoGroupId(groupId)) {
    const { getGroupPantry, getGroupRecord } = await import('../demo-store');
    const group = getGroupRecord(groupId);

    if (!group) {
      throw new ApiError(404, 'Group not found.');
    }

    const membership = group.members.find(
      (member) => member.userId === profileId
    );

    if (!membership) {
      throw new ApiError(
        403,
        'You must belong to the group to access bundle generation.'
      );
    }

    return {
      group,
      pantry: getGroupPantry(groupId),
      memberProfileIds: group.members.map((member) => member.userId),
      viewerRole: membership.role,
      isDemoGroup: true
    };
  }

  assertUuid(groupId, 'groupId');
  assertUuid(profileId, 'authenticated user id');

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          profile: {
            select: {
              id: true,
              displayName: true,
              email: true,
              ingredients: {
                orderBy: { name: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  const membership = group.members.find(
    (member) => member.profileId === profileId
  );

  if (!membership) {
    throw new ApiError(
      403,
      'You must belong to the group to access bundle generation.'
    );
  }

  const pantry: PantryItem[] = group.members.flatMap((member) =>
    member.profile.ingredients.map((ingredient) => ({
      ingredientId:
        ingredient.canonicalIngredientId ??
        ingredient.name.toLowerCase().replace(/\s+/g, '-'),
      name: ingredient.name,
      quantity:
        ingredient.quantity === null
          ? 0
          : Number(ingredient.quantity),
      unit: ingredient.unit ?? 'each',
      ownerUserId: member.profileId,
      ownerName:
        member.profile.displayName ??
        member.profile.email ??
        'Member'
    }))
  );

  const adaptedGroup: GroupRecord = {
    id: group.id,
    name: group.name,
    allowMissingIngredients: group.allowMissingIngredients,
    staplesEnabled: group.staplesEnabled,
    customStaples: group.customStaples,
    pantrySnapshotVersion: group.pantrySnapshotVersion,
    activeBundleVersion: group.activeBundleVersion,
    selectedBundleId: group.selectedBundleId,
    activeReservations: [],
    updatedAt: group.updatedAt.toISOString(),
    members: group.members.map((member) => ({
      userId: member.profileId,
      name:
        member.profile.displayName ??
        member.profile.email ??
        'Member',
      role: mapRole(member.role)
    }))
  };

  return {
    group: adaptedGroup,
    pantry,
    memberProfileIds: group.members.map((member) => member.profileId),
    viewerRole: mapRole(membership.role),
    isDemoGroup: false
  };
}
