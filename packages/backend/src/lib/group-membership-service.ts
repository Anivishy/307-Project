import type { Group, GroupMember, GroupRole } from '../generated/prisma';
import { ApiError } from './api-error';
import { prisma } from './prisma';
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

function normalizeText(value: unknown, fieldName: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer.`
    );
  }

  return trimmed;
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
  maxLength: number
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, `${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer.`
    );
  }

  return trimmed || undefined;
}

function normalizeInviteCode(value: unknown) {
  const inviteCode = normalizeText(value, 'inviteCode', 32)
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
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `${prefix}-${suffix}`;
}

function roleLabel(role: GroupRole) {
  return role === 'MEMBER' ? 'Member' : 'Admin';
}

function serializeGroup(group: GroupWithMembers, viewerId: string) {
  const viewerMembership = group.members.find(
    (member) => member.profileId === viewerId
  );

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: group.inviteCode,
    role: viewerMembership ? roleLabel(viewerMembership.role) : null,
    members: group.members.length,
    pantrySnapshotVersion: group.pantrySnapshotVersion,
    activeBundleVersion: group.activeBundleVersion,
    selectedBundleId: group.selectedBundleId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString()
  };
}

async function ensureProfileExists(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }
}

export async function listUserGroups(profileId: string) {
  assertUuid(profileId, 'x-user-id');

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: { profileId }
      }
    },
    include: { members: true },
    orderBy: { updatedAt: 'desc' }
  });

  return groups.map((group) => serializeGroup(group, profileId));
}

export async function createUserGroup(
  profileId: string,
  input: GroupCreateInput
) {
  assertUuid(profileId, 'x-user-id');
  await ensureProfileExists(profileId);

  const name = normalizeText(input.name, 'name', 120);
  const description = normalizeOptionalText(
    input.description,
    'description',
    2_000
  );
  const inviteCode = buildInviteCode(name);

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

export async function joinUserGroup(
  profileId: string,
  input: GroupJoinInput
) {
  assertUuid(profileId, 'x-user-id');
  await ensureProfileExists(profileId);

  const inviteCode = normalizeInviteCode(input.inviteCode);
  const group = await prisma.group.findUnique({
    where: { inviteCode },
    include: { members: true }
  });

  if (!group) {
    throw new ApiError(404, 'Invite code not found.');
  }

  if (group.members.some((member) => member.profileId === profileId)) {
    throw new ApiError(409, 'You already belong to this group.');
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
