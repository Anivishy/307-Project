import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getBundleCandidates } from '../app/api/groups/[groupId]/bundle-candidates/route';
import { POST as selectBundleCandidate } from '../app/api/groups/[groupId]/bundle-candidates/select/route';
import { saveGroupSettings } from './group-service';
import {
  getConfiguredEmailProviderName,
  resetEmailSenderForTests,
  setEmailSenderForTests,
  type TransactionalEmail
} from './email-provider';
import { waitForEmailNotificationsForTests } from './email-notifications';
import {
  DEMO_ADMIN_USER_ID,
  DEMO_MEMBER_USER_ID,
  resetDemoState
} from './demo-store';

const GROUP_ID = 'dorm-dinner-crew';

function createRouteContext(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function createRequest(
  url: string,
  userId: string,
  init?: RequestInit
) {
  return new Request(url, {
    headers: {
      'content-type': 'application/json',
      'x-demo-user-id': userId,
      ...(init?.headers ?? {})
    },
    ...init
  });
}

async function readCandidateSet() {
  const response = await getBundleCandidates(
    createRequest(
      `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
      DEMO_ADMIN_USER_ID
    ),
    createRouteContext(GROUP_ID)
  );

  expect(response.status).toBe(200);
  return response.json() as Promise<{
    pantrySnapshotVersion: number;
    activeBundleVersion: number;
    candidates: Array<{ id: string; title: string }>;
  }>;
}

async function selectBundle(
  bundleId: string,
  versions: {
    pantrySnapshotVersion: number;
    activeBundleVersion: number;
  },
  preferenceOverrides?: Array<{
    userId: string;
    preference: string;
    reason: string;
  }>
) {
  return selectBundleCandidate(
    createRequest(
      `http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`,
      DEMO_ADMIN_USER_ID,
      {
        method: 'POST',
        body: JSON.stringify({
          bundleId,
          pantrySnapshotVersion: versions.pantrySnapshotVersion,
          activeBundleVersion: versions.activeBundleVersion,
          preferenceOverrides
        })
      }
    ),
    createRouteContext(GROUP_ID)
  );
}

function emailsFor(
  emails: TransactionalEmail[],
  event: TransactionalEmail['metadata']['event']
) {
  return emails.filter(
    (email) => email.metadata.event === event
  );
}

describe('US13 email notifications', () => {
  let sentEmails: TransactionalEmail[];

  beforeEach(() => {
    sentEmails = [];
    resetDemoState();
    resetEmailSenderForTests();
    setEmailSenderForTests(async (email) => {
      sentEmails.push(email);
    });
  });

  it('selects Resend as the configured transactional email provider', () => {
    const previousApiKey = process.env.RESEND_API_KEY;

    try {
      process.env.RESEND_API_KEY = 'test-resend-key';
      expect(getConfiguredEmailProviderName()).toBe('resend');
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = previousApiKey;
      }
    }
  });

  it('sends bundle-selection email to all members with required template fields', async () => {
    const payload = await readCandidateSet();

    const response = await selectBundle(
      payload.candidates[0].id,
      payload
    );
    await waitForEmailNotificationsForTests();

    expect(response.status).toBe(200);

    const bundleEmails = emailsFor(
      sentEmails,
      'bundle-selection'
    );
    expect(
      bundleEmails.map((email) => email.to[0]).sort()
    ).toEqual([
      'ani@example.com',
      'kartik@example.com',
      'vinayak@example.com'
    ]);
    expect(bundleEmails[0].text).toContain(
      'Creamy Tuscan Night'
    );
    expect(bundleEmails[0].text).toContain(
      'Courses: Appetizer: Garlic Tomato Toasts; Main: Creamy Tuscan Chicken.'
    );
    expect(bundleEmails[0].text).toContain('Dorm Dinner Crew');
    expect(bundleEmails[0].text).toContain(
      '/groups/dorm-dinner-crew?bundle=bundle-creamy-tuscan-night'
    );
    expect(bundleEmails[0].html).toContain(
      'Creamy Tuscan Night'
    );
  });

  it('sends override-disclosure email only to the affected member', async () => {
    const payload = await readCandidateSet();

    const response = await selectBundle(
      payload.candidates[0].id,
      payload,
      [
        {
          userId: DEMO_MEMBER_USER_ID,
          preference: 'No mushrooms in shared mains',
          reason:
            'The group had enough mushrooms already reserved.'
        }
      ]
    );
    await waitForEmailNotificationsForTests();

    expect(response.status).toBe(200);

    const overrideEmails = emailsFor(
      sentEmails,
      'override-disclosure'
    );
    expect(overrideEmails).toHaveLength(1);
    expect(overrideEmails[0].to).toEqual([
      'kartik@example.com'
    ]);
    expect(overrideEmails[0].text).toContain(
      'No mushrooms in shared mains'
    );
    expect(overrideEmails[0].text).toContain(
      'The group had enough mushrooms already reserved.'
    );
    expect(overrideEmails[0].text).toContain(
      'Dorm Dinner Crew'
    );
    expect(overrideEmails[0].text).toContain(
      '/groups/dorm-dinner-crew?bundle=bundle-creamy-tuscan-night'
    );
  });

  it('sends pantry-update email to affected pantry owners when reservations change', async () => {
    saveGroupSettings(GROUP_ID, DEMO_ADMIN_USER_ID, {
      allowMissingIngredients: true
    });
    const firstPayload = await readCandidateSet();

    const firstResponse = await selectBundle(
      'bundle-creamy-tuscan-night',
      firstPayload
    );
    await waitForEmailNotificationsForTests();
    sentEmails = [];

    expect(firstResponse.status).toBe(200);

    const secondPayload = await readCandidateSet();
    const secondResponse = await selectBundle(
      'bundle-saffron-pasta-night',
      secondPayload
    );
    await waitForEmailNotificationsForTests();

    expect(secondResponse.status).toBe(200);

    const pantryEmails = emailsFor(sentEmails, 'pantry-update');
    expect(
      pantryEmails.map((email) => email.to[0]).sort()
    ).toEqual([
      'ani@example.com',
      'kartik@example.com',
      'vinayak@example.com'
    ]);
    expect(pantryEmails[0].text).toContain(
      'Saffron Pasta Night'
    );
    expect(pantryEmails[0].text).toContain('Dorm Dinner Crew');
  });

  it('logs failed email sends without failing the originating API request', async () => {
    const payload = await readCandidateSet();
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    setEmailSenderForTests(async () => {
      throw new Error('provider unavailable');
    });

    const response = await selectBundle(
      payload.candidates[0].id,
      payload
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      selectedBundleId: payload.candidates[0].id
    });

    await waitForEmailNotificationsForTests();
    expect(errorSpy).toHaveBeenCalledWith(
      'emailNotificationFailed',
      expect.objectContaining({
        event: 'bundle-selection',
        groupId: GROUP_ID,
        error: expect.any(Error)
      })
    );

    errorSpy.mockRestore();
  });
});
