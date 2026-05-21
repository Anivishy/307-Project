import { ApiError } from './api-error';
import { getSupabaseUserFromAccessToken } from './supabase-auth';

// Keeping validation here prevents every route from re-implementing UUID checks.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function assertUuid(value: string, fieldName: string) {
  if (!isUuid(value)) {
    throw new ApiError(
      400,
      `${fieldName} must be a valid UUID.`
    );
  }
}

export function parseBearerToken(authorization: string | null) {
  const header = authorization?.trim();

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(/\s+/, 2);

  if (scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.trim()) {
    throw new ApiError(
      401,
      'Missing Authorization bearer token.'
    );
  }

  const token = parseBearerToken(authorization);

  if (!token) {
    throw new ApiError(
      401,
      'Authorization must use a bearer token.'
    );
  }

  return token;
}

export async function getRequestUserId(request: Request) {
  const user = await getSupabaseUserFromAccessToken(
    getBearerToken(request)
  );

  assertUuid(user.id, 'authenticated user id');
  return user.id;
}
