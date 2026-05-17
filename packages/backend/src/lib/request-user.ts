import { ApiError } from './api-error';

// The database-backed MVP routes use x-user-id as a temporary stand-in for a real OTP session.
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

export function getRequestUserId(request: Request) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    throw new ApiError(401, 'Missing x-user-id header.');
  }

  assertUuid(userId, 'x-user-id');
  return userId;
}
