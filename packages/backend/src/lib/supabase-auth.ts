import { ApiError } from './api-error';
import { loadBackendEnv } from './env';

loadBackendEnv();

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: SupabaseAuthUser;
};

const AUTH_BASE_PATH = '/auth/v1';

function getSupabaseAuthConfig() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new ApiError(
      500,
      'Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  return {
    url: url.replace(/\/+$/, ''),
    publishableKey
  };
}

function getSupabaseServiceRoleConfig() {
  const { url } = getSupabaseAuthConfig();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secretKey) {
    throw new ApiError(
      500,
      'Supabase Auth duplicate-email checks require SUPABASE_SECRET_KEY.'
    );
  }

  return {
    url,
    secretKey
  };
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getSupabaseErrorMessage(payload: unknown) {
  if (!isRecord(payload)) {
    return 'Supabase Auth request failed.';
  }

  return (
    (typeof payload.msg === 'string' && payload.msg) ||
    (typeof payload.message === 'string' && payload.message) ||
    (typeof payload.error_description === 'string' &&
      payload.error_description) ||
    (typeof payload.error === 'string' && payload.error) ||
    'Supabase Auth request failed.'
  );
}

function getAuthErrorStatus(response: Response, message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already')
  ) {
    return 409;
  }

  return response.status >= 500 ? 502 : response.status;
}

function validateSession(
  payload: unknown
): SupabaseAuthSession {
  if (
    !isRecord(payload) ||
    typeof payload.access_token !== 'string' ||
    typeof payload.refresh_token !== 'string' ||
    typeof payload.expires_in !== 'number' ||
    typeof payload.token_type !== 'string' ||
    !isRecord(payload.user) ||
    typeof payload.user.id !== 'string'
  ) {
    throw new ApiError(
      502,
      'Supabase Auth returned an invalid session.'
    );
  }

  return payload as SupabaseAuthSession;
}

function validateUser(payload: unknown): SupabaseAuthUser {
  if (!isRecord(payload) || typeof payload.id !== 'string') {
    throw new ApiError(
      401,
      'Invalid or expired Supabase session.'
    );
  }

  return payload as SupabaseAuthUser;
}

function readOptionalSessionFromPayload(payload: unknown) {
  if (isRecord(payload) && isRecord(payload.session)) {
    return validateSession(payload.session);
  }

  if (
    isRecord(payload) &&
    'session' in payload &&
    payload.session === null &&
    isRecord(payload.user) &&
    typeof payload.user.id === 'string'
  ) {
    return null;
  }

  if (
    isRecord(payload) &&
    typeof payload.id === 'string' &&
    typeof payload.email === 'string'
  ) {
    return null;
  }

  return validateSession(payload);
}

async function supabaseAuthFetch(
  path: string,
  init: RequestInit,
  accessToken?: string
) {
  const { url, publishableKey } = getSupabaseAuthConfig();
  const headers = new Headers(init.headers);
  headers.set('apikey', publishableKey);
  headers.set(
    'authorization',
    `Bearer ${accessToken ?? publishableKey}`
  );

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(
    `${url}${AUTH_BASE_PATH}${path}`,
    {
      ...init,
      headers
    }
  );

  if (!response.ok) {
    const payload = await readJson(response);
    const message = getSupabaseErrorMessage(payload);
    throw new ApiError(
      getAuthErrorStatus(response, message),
      message
    );
  }

  return response;
}

export async function hasSupabaseAuthUserWithEmail(
  email: string
) {
  const config = getSupabaseServiceRoleConfig();
  const normalizedEmail = email.trim().toLowerCase();

  const response = await fetch(
    `${config.url}${AUTH_BASE_PATH}/admin/users?page=1&per_page=1000`,
    {
      method: 'GET',
      headers: {
        apikey: config.secretKey,
        authorization: `Bearer ${config.secretKey}`
      }
    }
  );

  if (!response.ok) {
    const payload = await readJson(response);
    const message = getSupabaseErrorMessage(payload);
    throw new ApiError(
      getAuthErrorStatus(response, message),
      message
    );
  }

  const payload = await readJson(response);

  if (!isRecord(payload) || !Array.isArray(payload.users)) {
    throw new ApiError(
      502,
      'Supabase Auth returned an invalid users list.'
    );
  }

  return payload.users.some(
    (user) =>
      isRecord(user) &&
      typeof user.email === 'string' &&
      user.email.trim().toLowerCase() === normalizedEmail
  );
}

export async function requestSupabaseEmailOtp(email: string) {
  await supabaseAuthFetch('/otp', {
    method: 'POST',
    body: JSON.stringify({
      email,
      create_user: true
    })
  });
}

export async function requestSupabaseMagicLink(
  email: string,
  redirectTo: string
) {
  await supabaseAuthFetch(
    `/otp?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        create_user: true,
        redirect_to: redirectTo
      })
    }
  );
}

export async function verifySupabaseEmailOtp(
  email: string,
  token: string
) {
  const response = await supabaseAuthFetch('/verify', {
    method: 'POST',
    body: JSON.stringify({
      email,
      token,
      type: 'email'
    })
  });

  return validateSession(await readJson(response));
}

export async function signUpSupabaseWithPassword({
  email,
  password,
  displayName,
  redirectTo
}: {
  email: string;
  password: string;
  displayName?: string;
  redirectTo: string;
}) {
  const response = await supabaseAuthFetch(
    `/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: displayName ? { display_name: displayName } : {},
        redirect_to: redirectTo
      })
    }
  );

  return readOptionalSessionFromPayload(await readJson(response));
}

export async function signInSupabaseWithPassword(
  email: string,
  password: string
) {
  const response = await supabaseAuthFetch(
    '/token?grant_type=password',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  return validateSession(await readJson(response));
}

export async function getSupabaseUserFromAccessToken(
  accessToken: string
) {
  const response = await supabaseAuthFetch(
    '/user',
    { method: 'GET' },
    accessToken
  );

  return validateUser(await readJson(response));
}

export async function refreshSupabaseSession(
  refreshToken: string
) {
  const response = await supabaseAuthFetch(
    '/token?grant_type=refresh_token',
    {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    }
  );

  return validateSession(await readJson(response));
}
