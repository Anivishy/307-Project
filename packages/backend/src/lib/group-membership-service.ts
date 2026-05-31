import type {
  Group,
  GroupMember,
  GroupRole
} from '../generated/prisma';
import { randomUUID } from 'node:crypto';
import { ApiError } from './api-error';
import { shouldUseLocalDemoStore } from './database-env';
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

const demoGroupsById = new Map<string, GroupWithMembers>();
const demoGroupsByInviteCode = new Map<string, GroupWithMembers>();

async function getPrismaClient() {
  const { prisma } = await import('./prisma');
  return prisma;
}

function createDemoGroupRecord(input: {
  ownerId: string;
  name: string;
  description?: string;
  inviteCode: string;
}) {
  const now = new Date();
  const group = {
    id: randomUUID(),
    ownerId: input.ownerId,
    name: input.name,
    description: input.description ?? null,
    inviteCode: input.inviteCode,
    pantrySnapshotVersion: 1,
    activeBundleVersion: 1,
    selectedBundleId: null,
    allowMissingIngredients: false,
    staplesEnabled: false,
    customStaples: [],
    createdAt: now,
    updatedAt: now,
    members: [
      {
        id: randomUUID(),
        groupId: '',
        profileId: input.ownerId,
        role: 'ADMIN',
        joinedAt: now
      }
    ]
  } satisfies GroupWithMembers;

  group.members[0].groupId = group.id;
  demoGroupsById.set(group.id, group);
  demoGroupsByInviteCode.set(group.inviteCode ?? '', group);
  return group;
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
  if (shouldUseLocalDemoStore()) {
    return;
  }

  const prisma = await getPrismaClient();
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }
}

function getDemoGroupForMember(
  groupId: string,
  profileId: string
) {
  const group = demoGroupsById.get(groupId);

  if (!group) {
    throw new ApiError(404, 'Group not found.');
  }

  const isMember = group.members.some(
    (member) => member.profileId === profileId
  );

  if (!isMember) {
    throw new ApiError(403, 'You are not a member of this group.');
  }

  return group;
}

export async function listUserGroups(profileId: string) {
  assertUuid(profileId, 'authenticated user id');

  if (shouldUseLocalDemoStore()) {
    return Array.from(demoGroupsById.values())
      .filter((group) =>
        group.members.some((member) => member.profileId === profileId)
      )
      .map((group) => serializeGroup(group, profileId));
  }

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

  if (shouldUseLocalDemoStore()) {
    return serializeGroup(
      createDemoGroupRecord({
        ownerId: profileId,
        name,
        description,
        inviteCode
      }),
      profileId
    );
  }

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

  if (shouldUseLocalDemoStore()) {
    const group = getDemoGroupForMember(groupId, profileId);
    return group.members.map((member) => ({
      profileId: member.profileId,
      displayName: null,
      profilePictureUrl: null,
      profilePictureStorageRef: null,
      email: null,
      role: roleLabel(member.role),
      joinedAt: member.joinedAt.toISOString(),
      ingredients: []
    }));
  }

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

  if (shouldUseLocalDemoStore()) {
    return serializeGroup(
      getDemoGroupForMember(groupId, profileId),
      profileId
    );
  }

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

  if (shouldUseLocalDemoStore()) {
    const group = demoGroupsByInviteCode.get(code);

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

  if (shouldUseLocalDemoStore()) {
    const group = demoGroupsByInviteCode.get(inviteCode);

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

    group.members.push({
      id: randomUUID(),
      groupId: group.id,
      profileId,
      role: 'MEMBER',
      joinedAt: new Date()
    });
    group.updatedAt = new Date();

    return serializeGroup(group, profileId);
  }

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
