import type {
  BundleReservation,
  BundleTemplate,
  GroupMember,
  GroupRecord
} from './demo-store';
import {
  renderBundleSelectionEmail,
  renderOverrideDisclosureEmail,
  renderPantryUpdateEmail
} from './email-templates';
import {
  sendTransactionalEmail,
  type TransactionalEmail
} from './email-provider';

export type PreferenceOverrideDisclosure = {
  userId: string;
  preference: string;
  reason: string;
};

const pendingNotificationSends = new Set<Promise<void>>();

function memberById(group: GroupRecord, userId: string) {
  return group.members.find(
    (member) => member.userId === userId
  );
}

function enqueueEmail(email: TransactionalEmail) {
  const trackedPromise = sendTransactionalEmail(email).catch(
    (error) => {
      console.error('emailNotificationFailed', {
        event: email.metadata.event,
        to: email.to,
        groupId: email.metadata.groupId,
        error
      });
    }
  );

  pendingNotificationSends.add(trackedPromise);
  trackedPromise.finally(() => {
    pendingNotificationSends.delete(trackedPromise);
  });
}

function enqueueMemberEmail(
  member: GroupMember,
  emailFactory: (
    member: GroupMember
  ) => Parameters<typeof sendTransactionalEmail>[0]
) {
  enqueueEmail(emailFactory(member));
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

export function notifyBundleSelection(
  group: GroupRecord,
  bundle: BundleTemplate
) {
  for (const member of group.members) {
    enqueueMemberEmail(member, (recipient) =>
      renderBundleSelectionEmail({
        groupId: group.id,
        groupName: group.name,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        bundle
      })
    );
  }
}

export function notifyOverrideDisclosures(
  group: GroupRecord,
  overrides: PreferenceOverrideDisclosure[],
  bundleId?: string
) {
  for (const override of overrides) {
    const member = memberById(group, override.userId);

    if (!member) {
      continue;
    }

    enqueueMemberEmail(member, (recipient) =>
      renderOverrideDisclosureEmail({
        groupId: group.id,
        groupName: group.name,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        bundleId,
        preference: override.preference,
        reason: override.reason
      })
    );
  }
}

export function notifyPantryUpdates(
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

  for (const member of affectedMembers) {
    enqueueMemberEmail(member, (recipient) =>
      renderPantryUpdateEmail({
        groupId: group.id,
        groupName: group.name,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        bundle
      })
    );
  }
}

export async function waitForEmailNotificationsForTests() {
  await Promise.all(Array.from(pendingNotificationSends));
}
