import { NextRequest, NextResponse } from 'next/server';

import { findMissingIngredientIds } from '@/lib/constraints/ingredients';
import { parseConstraintsPayload } from '@/lib/constraints/normalize';
import type { UserConstraintsInput } from '@/lib/constraints/types';
import { ApiError } from '@/lib/api-error';
import { getCurrentUserId } from '@/lib/http/auth';
import { errorResponse } from '@/lib/http/responses';
import {
  patchProfileConstraints,
  readProfileConstraints,
  replaceProfileConstraints
} from '@/lib/profile-constraints-service';

type JsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false };

async function readJson(
  request: NextRequest
): Promise<JsonReadResult> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

function requireUserId(
  request: NextRequest
): string | NextResponse {
  const userId = getCurrentUserId(request);

  if (!userId) {
    return errorResponse(
      401,
      'unauthenticated',
      'Profile constraints require an authenticated user.'
    );
  }

  return userId;
}

function validateNeverInclude(
  input: UserConstraintsInput
): NextResponse | null {
  const missingIngredientIds = findMissingIngredientIds(
    input.neverIncludeIngredientIds ?? []
  );

  if (missingIngredientIds.length === 0) {
    return null;
  }

  return errorResponse(
    400,
    'invalidIngredientIds',
    'neverIncludeIngredientIds contains ids that do not exist.',
    { invalidIngredientIds: missingIngredientIds }
  );
}

function invalidJsonResponse() {
  return errorResponse(
    400,
    'invalidJson',
    'Request body must be valid JSON.'
  );
}

function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return errorResponse(
      error.statusCode,
      'profileConstraintError',
      error.message
    );
  }

  return errorResponse(
    500,
    'unexpectedError',
    'Unexpected server error.'
  );
}

export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request);

    if (typeof userId !== 'string') {
      return userId;
    }

    return NextResponse.json({
      constraints: await readProfileConstraints(userId)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId(request);

    if (typeof userId !== 'string') {
      return userId;
    }

    const payload = await readJson(request);

    if (!payload.ok) {
      return invalidJsonResponse();
    }

    const parsed = parseConstraintsPayload(
      payload.value,
      { partial: false }
    );

    if (!parsed.ok) {
      return errorResponse(
        400,
        'invalidConstraints',
        'Invalid constraints payload.',
        {
          issues: parsed.issues
        }
      );
    }

    const ingredientError = validateNeverInclude(parsed.value);

    if (ingredientError) {
      return ingredientError;
    }

    return NextResponse.json({
      constraints: await replaceProfileConstraints(
        userId,
        parsed.value
      )
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = requireUserId(request);

    if (typeof userId !== 'string') {
      return userId;
    }

    const payload = await readJson(request);

    if (!payload.ok) {
      return invalidJsonResponse();
    }

    const parsed = parseConstraintsPayload(
      payload.value,
      { partial: true }
    );

    if (!parsed.ok) {
      return errorResponse(
        400,
        'invalidConstraints',
        'Invalid constraints payload.',
        {
          issues: parsed.issues
        }
      );
    }

    const ingredientError = validateNeverInclude(parsed.value);

    if (ingredientError) {
      return ingredientError;
    }

    return NextResponse.json({
      constraints: await patchProfileConstraints(
        userId,
        parsed.value
      )
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
