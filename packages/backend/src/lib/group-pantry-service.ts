import { ApiError } from './api-error';
import { prisma } from './prisma';
import { assertUuid } from './request-user';

type PantryOwner = {
  userId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  quantity: number | null;
  unit: string | null;
};

type MergedPantryItem = {
  ingredientId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  owners: PantryOwner[];
};

function displayNameFor(profile: {
  displayName: string | null;
  email: string;
}) {
  return (
    profile.displayName ??
    profile.email.split('@')[0] ??
    'Member'
  );
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .padEnd(1, '?');
}

function ingredientKey(ingredient: {
  canonicalIngredientId: string | null;
  name: string;
  unit: string | null;
}) {
  const ingredientId =
    ingredient.canonicalIngredientId ??
    ingredient.name.trim().toLowerCase().replace(/\s+/g, '-');

  return `${ingredientId}:${ingredient.unit ?? ''}`;
}

function addQuantity(
  current: number | null,
  next: number | null
) {
  if (current === null || next === null) {
    return null;
  }

  return current + next;
}

export async function getGroupPantry(
  groupId: string,
  viewerProfileId: string,
  ownerId?: string | null
) {
  assertUuid(groupId, 'groupId');
  assertUuid(viewerProfileId, 'authenticated user id');

  if (ownerId) {
    assertUuid(ownerId, 'ownerId');
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          profile: {
            include: {
              ingredients: {
                orderBy: { name: 'asc' }
              }
            }
          }
        },
        orderBy: { joinedAt: 'asc' }
      }
    }
  });

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  const viewerIsMember = group.members.some(
    (member) => member.profileId === viewerProfileId
  );

  if (!viewerIsMember) {
    throw new ApiError(
      403,
      'You are not a member of this group.'
    );
  }

  const mergedItems = new Map<string, MergedPantryItem>();

  for (const member of group.members) {
    if (ownerId && member.profileId !== ownerId) {
      continue;
    }

    const ownerName = displayNameFor(member.profile);

    for (const ingredient of member.profile.ingredients) {
      const quantity =
        ingredient.quantity === null
          ? null
          : Number(ingredient.quantity);
      const key = ingredientKey(ingredient);
      const existing = mergedItems.get(key);
      const owner = {
        userId: member.profileId,
        displayName: ownerName,
        initials: initialsFor(ownerName),
        avatarUrl: null,
        quantity,
        unit: ingredient.unit
      };

      if (!existing) {
        mergedItems.set(key, {
          ingredientId:
            ingredient.canonicalIngredientId ??
            ingredient.name
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '-'),
          name: ingredient.name,
          quantity,
          unit: ingredient.unit,
          owners: [owner]
        });
        continue;
      }

      existing.quantity = addQuantity(
        existing.quantity,
        quantity
      );
      existing.owners.push(owner);
    }
  }

  return [...mergedItems.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}
