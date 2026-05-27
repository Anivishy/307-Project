import type { BundleTemplate } from './demo-store';
import type { TransactionalEmail } from './email-provider';

type BaseTemplateInput = {
  groupId: string;
  groupName: string;
  recipientName: string;
  recipientEmail: string;
  recipientUserId: string;
  bundleId?: string;
};

type BundleSelectionInput = BaseTemplateInput & {
  bundle: BundleTemplate;
};

type OverrideDisclosureInput = BaseTemplateInput & {
  preference: string;
  reason: string;
};

type PantryUpdateInput = BundleSelectionInput;

const DEFAULT_APP_BASE_URL = 'http://localhost:5173';

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL?.replace(/\/$/, '') ??
    DEFAULT_APP_BASE_URL
  );
}

function groupLink(groupId: string, bundleId?: string) {
  const path = `/groups/${encodeURIComponent(groupId)}`;

  if (!bundleId) {
    return `${appBaseUrl()}${path}`;
  }

  return `${appBaseUrl()}${path}?bundle=${encodeURIComponent(bundleId)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function paragraph(value: string) {
  return `<p>${escapeHtml(value)}</p>`;
}

function linkParagraph(label: string, href: string) {
  return `<p><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;
}

function emailShell(title: string, body: string[]) {
  return [
    '<!doctype html>',
    '<html>',
    '<body>',
    `<h1>${escapeHtml(title)}</h1>`,
    ...body,
    '</body>',
    '</html>'
  ].join('');
}

export function renderBundleSelectionEmail(
  input: BundleSelectionInput
): TransactionalEmail {
  const link = groupLink(input.groupId, input.bundle.id);
  const summary = courseSummary(input.bundle);

  return {
    to: [input.recipientEmail],
    subject: `${input.groupName} selected ${input.bundle.title}`,
    text: [
      `Hi ${input.recipientName},`,
      `${input.groupName} selected ${input.bundle.title}.`,
      `Courses: ${summary}.`,
      `Review the bundle: ${link}`
    ].join('\n\n'),
    html: emailShell(`${input.groupName} selected a bundle`, [
      paragraph(`Hi ${input.recipientName},`),
      paragraph(
        `${input.groupName} selected ${input.bundle.title}.`
      ),
      paragraph(`Courses: ${summary}.`),
      linkParagraph('Review the bundle', link)
    ]),
    metadata: {
      event: 'bundle-selection',
      groupId: input.groupId,
      bundleId: input.bundle.id,
      userId: input.recipientUserId
    }
  };
}

export function renderOverrideDisclosureEmail(
  input: OverrideDisclosureInput
): TransactionalEmail {
  const link = groupLink(input.groupId, input.bundleId);

  return {
    to: [input.recipientEmail],
    subject: `${input.groupName} preference override`,
    text: [
      `Hi ${input.recipientName},`,
      `${input.groupName} overrode one of your soft preferences.`,
      `Overridden preference: ${input.preference}.`,
      `Admin reason: ${input.reason}.`,
      `Review the group update: ${link}`
    ].join('\n\n'),
    html: emailShell(`${input.groupName} preference override`, [
      paragraph(`Hi ${input.recipientName},`),
      paragraph(
        `${input.groupName} overrode one of your soft preferences.`
      ),
      paragraph(`Overridden preference: ${input.preference}.`),
      paragraph(`Admin reason: ${input.reason}.`),
      linkParagraph('Review the group update', link)
    ]),
    metadata: {
      event: 'override-disclosure',
      groupId: input.groupId,
      bundleId: input.bundleId,
      userId: input.recipientUserId
    }
  };
}

export function renderPantryUpdateEmail(
  input: PantryUpdateInput
): TransactionalEmail {
  const link = groupLink(input.groupId, input.bundle.id);

  return {
    to: [input.recipientEmail],
    subject: `${input.groupName} pantry reservations changed`,
    text: [
      `Hi ${input.recipientName},`,
      `${input.groupName} selected ${input.bundle.title}, which changed reserved pantry quantities for ingredients you own.`,
      `Review the bundle: ${link}`
    ].join('\n\n'),
    html: emailShell(
      `${input.groupName} pantry reservations changed`,
      [
        paragraph(`Hi ${input.recipientName},`),
        paragraph(
          `${input.groupName} selected ${input.bundle.title}, which changed reserved pantry quantities for ingredients you own.`
        ),
        linkParagraph('Review the bundle', link)
      ]
    ),
    metadata: {
      event: 'pantry-update',
      groupId: input.groupId,
      bundleId: input.bundle.id,
      userId: input.recipientUserId
    }
  };
}
