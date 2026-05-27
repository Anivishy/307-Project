export type EmailProviderName = 'console' | 'resend';

export type TransactionalEmail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  metadata: {
    event: string;
    groupId: string;
    bundleId?: string;
    userId?: string;
  };
};

export type TransactionalEmailSender = (
  email: TransactionalEmail
) => Promise<void>;

type EmailProviderConfig = {
  provider: EmailProviderName;
  from: string;
  resendApiKey?: string;
};

const DEFAULT_FROM =
  'RecipeCollab <notifications@recipecollab.local>';

function resolveEmailProviderConfig(): EmailProviderConfig {
  const resendApiKey = process.env.RESEND_API_KEY;
  const provider =
    process.env.EMAIL_PROVIDER === 'resend' || resendApiKey
      ? 'resend'
      : 'console';

  return {
    provider,
    from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
    resendApiKey
  };
}

async function sendWithResend(
  email: TransactionalEmail,
  config: EmailProviderConfig
) {
  if (!config.resendApiKey) {
    throw new Error(
      'RESEND_API_KEY is required for EMAIL_PROVIDER=resend.'
    );
  }

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [
          {
            name: 'event',
            value: email.metadata.event
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Resend email request failed with status ${response.status}.`
    );
  }
}

async function sendToConsole(email: TransactionalEmail) {
  console.info('transactionalEmailQueued', {
    event: email.metadata.event,
    to: email.to,
    subject: email.subject
  });
}

let emailSenderOverride: TransactionalEmailSender | null = null;

export function setEmailSenderForTests(
  sender: TransactionalEmailSender
) {
  emailSenderOverride = sender;
}

export function resetEmailSenderForTests() {
  emailSenderOverride = null;
}

export function getConfiguredEmailProviderName() {
  return resolveEmailProviderConfig().provider;
}

export async function sendTransactionalEmail(
  email: TransactionalEmail
) {
  if (emailSenderOverride) {
    await emailSenderOverride(email);
    return;
  }

  const config = resolveEmailProviderConfig();

  if (config.provider === 'resend') {
    await sendWithResend(email, config);
    return;
  }

  await sendToConsole(email);
}
