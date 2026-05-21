import { ApiError } from './api-error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown) {
  if (
    typeof value !== 'string' ||
    !EMAIL_REGEX.test(value.trim())
  ) {
    throw new ApiError(
      400,
      'email must be a valid email address.'
    );
  }

  return value.trim().toLowerCase();
}

function assertMaxLength(
  value: string,
  fieldName: string,
  maxLength: number
) {
  if (value.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer.`
    );
  }
}

export function normalizeRequiredText(
  value: unknown,
  fieldName: string,
  maxLength: number
) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  const trimmed = value.trim();
  assertMaxLength(trimmed, fieldName, maxLength);
  return trimmed;
}

export function normalizeOptionalText(
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
  assertMaxLength(trimmed, fieldName, maxLength);
  return trimmed || undefined;
}

export function normalizeNullableText(
  value: unknown,
  fieldName: string,
  maxLength: number
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, `${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  assertMaxLength(trimmed, fieldName, maxLength);
  return trimmed || null;
}
