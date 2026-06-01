import type {
  Group,
  GroupMember,
  GroupRole
} from '../generated/prisma';
import { ApiError } from './api-error';
import {
  normalizeOptionalText,
  normalizeRequiredText
} from './input-normalization';
import { assertUuid } from './request-user';

type GroupCreateInput = {
  name?: unknown;
  description?: unknown;
};

type GroupJoinInput = {
  inviteCode?: unknown;
};

type GroupWithMembers = Group & {
  members: GroupMember[];
};

async function getPrismaClient() {
  const { prisma } = await import('./prisma');
  return prisma;
}

function normalizeInviteCode(value: unknown) {
  const inviteCode = normalizeRequiredText(value, 'inviteCode', 32)
    .toUpperCase()
    .replace(/\s+/g, '');

  if (!/^[A-Z0-9-]{4,32}$/.test(inviteCode)) {
    throw new ApiError(
      400,
      'inviteCode may only contain letters, numbers, and hyphens.'
    );
  }

  return inviteCode;
}

function buildInviteCode(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 5)
    .toUpperCase()
    .padEnd(5, 'X');
  const suffix = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `${prefix}-${suffix}`;
}

function roleLabel(role: GroupRole) {
  return role === 'MEMBER' ? 'Member' : 'Admin';
}

function serializeGroup(
  group: GroupWithMembers,
  viewerId: string
) {
  const viewerMembership = group.members.find(
    (member) => member.profileId === viewerId
  );

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: group.inviteCode,
    role: viewerMembership
      ? roleLabel(viewerMembership.role)
      : null,
    members: group.members.length,
    pantrySnapshotVersion: group.pantrySnapshotVersion,
    activeBundleVersion: group.activeBundleVersion,
    selectedBundleId: group.selectedBundleId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString()
  };
}

async function ensureProfileExists(profileId: string) {
  const prisma = await getPrismaClient();
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }
}

export async function listUserGroups(profileId: string) {
  assertUuid(profileId, 'authenticated user id');

  const prisma = await getPrismaClient();
  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: { profileId }
      }
    },
    include: { members: true },
    orderBy: { updatedAt: 'desc' }
  });

  return groups.map((group) =>
    serializeGroup(group, profileId)
  );
}

export async function createUserGroup(
  profileId: string,
  input: GroupCreateInput
) {
  assertUuid(profileId, 'authenticated user id');
  await ensureProfileExists(profileId);

  const name = normalizeRequiredText(input.name, 'name', 120);
  const description = normalizeOptionalText(
    input.description,
    'description',
    2_000
  );
  const inviteCode = buildInviteCode(name);

  const prisma = await getPrismaClient();
  const group = await prisma.group.create({
    data: {
      ownerId: profileId,
      name,
      description,
      inviteCode,
      members: {
        create: {
          profileId,
          role: 'ADMIN'
        }
      }
    },
    include: { members: true }
  });

  return serializeGroup(group, profileId);
}

export async function getGroupMembers(
  groupId: string,
  profileId: string
) {
  assertUuid(groupId, 'groupId');
  assertUuid(profileId, 'authenticated user id');

  const prisma = await getPrismaClient();
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

  const isMember = group.members.some(
    (m) => m.profileId === profileId
  );

  if (!isMember) {
    throw new ApiError(403, 'You are not a member of this group.');
  }

  return group.members.map((m) => ({
    profileId: m.profileId,
    displayName: m.profile.displayName,
    profilePictureUrl: m.profile.profilePictureUrl,
    profilePictureStorageRef: m.profile.profilePictureStorageRef,
    email: m.profile.email,
    role: roleLabel(m.role),
    joinedAt: m.joinedAt.toISOString(),
    ingredients: m.profile.ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity === null ? null : Number(ing.quantity),
      unit: ing.unit,
      notes: ing.notes
    }))
  }));
}

export async function getGroupById(
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

  const isMember = group.members.some(
    (member) => member.profileId === profileId
  );

  if (!isMember) {
    throw new ApiError(403, 'You are not a member of this group.');
  }

  return serializeGroup(group, profileId);
}

export async function getGroupPreviewByInviteCode(
  inviteCode: unknown
) {
  const code = normalizeInviteCode(inviteCode);
  const prisma = await getPrismaClient();
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { members: true }
  });

  if (!group) {
    throw new ApiError(404, 'Invite code not found.');
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: group.inviteCode,
    members: group.members.length
  };
}

export async function joinUserGroup(
  profileId: string,
  input: GroupJoinInput
) {
  assertUuid(profileId, 'authenticated user id');
  await ensureProfileExists(profileId);

  const inviteCode = normalizeInviteCode(input.inviteCode);
  const prisma = await getPrismaClient();
  const group = await prisma.group.findUnique({
    where: { inviteCode },
    include: { members: true }
  });

  if (!group) {
    throw new ApiError(404, 'Invite code not found.');
  }

  if (
    group.members.some(
      (member) => member.profileId === profileId
    )
  ) {
    throw new ApiError(
      409,
      'You already belong to this group.'
    );
  }

  const updatedGroup = await prisma.group.update({
    where: { id: group.id },
    data: {
      members: {
        create: {
          profileId,
          role: 'MEMBER'
        }
      }
    },
    include: { members: true }
  });

  return serializeGroup(updatedGroup, profileId);
}
