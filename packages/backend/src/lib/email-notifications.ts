import type {
  BundleReservation,
  BundleTemplate,
  GroupMember,
  GroupRecord
} from './demo-store';

export type EmailNotificationEvent =
  | 'bundle-selection'
  | 'override-disclosure'
  | 'pantry-update';

export type TransactionalEmail = {
  to: string[];
  subject: string;
  text: string;
  metadata: {
    event: EmailNotificationEvent;
    groupId: string;
    bundleId?: string;
    userId?: string;
  };
};

export type TransactionalEmailSender = (
  email: TransactionalEmail
) => Promise<void>;

export type PreferenceOverrideDisclosure = {
  userId: string;
  preference: string;
  reason: string;
};

const DEFAULT_APP_BASE_URL = 'http://localhost:5173';

async function defaultEmailSender(email: TransactionalEmail) {
  console.info('transactionalEmailQueued', {
    event: email.metadata.event,
    to: email.to,
    subject: email.subject
  });
}

let emailSender: TransactionalEmailSender = defaultEmailSender;

export function setEmailSenderForTests(
  sender: TransactionalEmailSender
) {
  emailSender = sender;
}

export function resetEmailSenderForTests() {
  emailSender = defaultEmailSender;
}

function groupLink(groupId: string, bundleId?: string) {
  const baseUrl =
    process.env.APP_BASE_URL?.replace(/\/$/, '') ??
    DEFAULT_APP_BASE_URL;
  const path = `/groups/${encodeURIComponent(groupId)}`;

  if (!bundleId) {
    return `${baseUrl}${path}`;
  }

  return `${baseUrl}${path}?bundle=${encodeURIComponent(bundleId)}`;
}

function formatCourseType(type: string) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function courseSummary(
  bundle: Pick<BundleTemplate, 'courses'>
) {
  return bundle.courses
    .map(
      (course) =>
        `${formatCourseType(course.type)}: ${course.title}`
    )
    .join('; ');
}

function memberById(group: GroupRecord, userId: string) {
  return group.members.find(
    (member) => member.userId === userId
  );
}

async function sendEmailSafely(email: TransactionalEmail) {
  try {
    await emailSender(email);
  } catch (error) {
    console.error('emailNotificationFailed', {
      event: email.metadata.event,
      to: email.to,
      groupId: email.metadata.groupId,
      error
    });
  }
}

function buildBundleSelectionEmail(
  group: GroupRecord,
  member: GroupMember,
  bundle: BundleTemplate
): TransactionalEmail {
  const link = groupLink(group.id, bundle.id);

  return {
    to: [member.email],
    subject: `${group.name} selected ${bundle.title}`,
    text: [
      `Hi ${member.name},`,
      `${group.name} selected ${bundle.title}.`,
      `Courses: ${courseSummary(bundle)}.`,
      `Review the bundle: ${link}`
    ].join('\n\n'),
    metadata: {
      event: 'bundle-selection',
      groupId: group.id,
      bundleId: bundle.id,
      userId: member.userId
    }
  };
}

function buildOverrideDisclosureEmail(
  group: GroupRecord,
  member: GroupMember,
  override: PreferenceOverrideDisclosure,
  bundleId?: string
): TransactionalEmail {
  const link = groupLink(group.id, bundleId);

  return {
    to: [member.email],
    subject: `${group.name} preference override`,
    text: [
      `Hi ${member.name},`,
      `${group.name} overrode one of your soft preferences.`,
      `Overridden preference: ${override.preference}.`,
      `Admin reason: ${override.reason}.`,
      `Review the group update: ${link}`
    ].join('\n\n'),
    metadata: {
      event: 'override-disclosure',
      groupId: group.id,
      bundleId,
      userId: member.userId
    }
  };
}

function buildPantryUpdateEmail(
  group: GroupRecord,
  member: GroupMember,
  bundle: BundleTemplate
): TransactionalEmail {
  const link = groupLink(group.id, bundle.id);

  return {
    to: [member.email],
    subject: `${group.name} pantry reservations changed`,
    text: [
      `Hi ${member.name},`,
      `${group.name} selected ${bundle.title}, which changed reserved pantry quantities for ingredients you own.`,
      `Review the bundle: ${link}`
    ].join('\n\n'),
    metadata: {
      event: 'pantry-update',
      groupId: group.id,
      bundleId: bundle.id,
      userId: member.userId
    }
  };
}

function reservationQuantityByOwner(
  reservations: BundleReservation[]
) {
  const quantities = new Map<string, Map<string, number>>();

  for (const reservation of reservations) {
    if (reservation.sourceUserId === 'group-staples') {
      continue;
    }

    const ownerQuantities =
      quantities.get(reservation.sourceUserId) ??
      new Map<string, number>();
    const key = `${reservation.ingredientId}:${reservation.unit}`;
    ownerQuantities.set(
      key,
      (ownerQuantities.get(key) ?? 0) + reservation.quantity
    );
    quantities.set(reservation.sourceUserId, ownerQuantities);
  }

  return quantities;
}

function mapsDiffer(
  left: Map<string, number> | undefined,
  right: Map<string, number> | undefined
) {
  const leftEntries = Array.from(left?.entries() ?? []).sort();
  const rightEntries = Array.from(
    right?.entries() ?? []
  ).sort();

  return (
    JSON.stringify(leftEntries) !== JSON.stringify(rightEntries)
  );
}

function affectedPantryOwnerIds(
  previousReservations: BundleReservation[],
  nextReservations: BundleReservation[]
) {
  const previousByOwner = reservationQuantityByOwner(
    previousReservations
  );
  const nextByOwner =
    reservationQuantityByOwner(nextReservations);
  const ownerIds = new Set([
    ...previousByOwner.keys(),
    ...nextByOwner.keys()
  ]);

  return Array.from(ownerIds).filter((ownerId) =>
    mapsDiffer(
      previousByOwner.get(ownerId),
      nextByOwner.get(ownerId)
    )
  );
}

export async function notifyBundleSelection(
  group: GroupRecord,
  bundle: BundleTemplate
) {
  await Promise.all(
    group.members.map((member) =>
      sendEmailSafely(
        buildBundleSelectionEmail(group, member, bundle)
      )
    )
  );
}

export async function notifyOverrideDisclosures(
  group: GroupRecord,
  overrides: PreferenceOverrideDisclosure[],
  bundleId?: string
) {
  await Promise.all(
    overrides.map((override) => {
      const member = memberById(group, override.userId);

      if (!member) {
        return Promise.resolve();
      }

      return sendEmailSafely(
        buildOverrideDisclosureEmail(
          group,
          member,
          override,
          bundleId
        )
      );
    })
  );
}

export async function notifyPantryUpdates(
  group: GroupRecord,
  bundle: BundleTemplate,
  previousReservations: BundleReservation[],
  nextReservations: BundleReservation[]
) {
  const affectedMembers = affectedPantryOwnerIds(
    previousReservations,
    nextReservations
  )
    .map((userId) => memberById(group, userId))
    .filter((member): member is GroupMember => Boolean(member));

  await Promise.all(
    affectedMembers.map((member) =>
      sendEmailSafely(
        buildPantryUpdateEmail(group, member, bundle)
      )
    )
  );
}
