import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/lib/api-error';
import { findMissingCatalogIngredientIds } from '@/lib/ingredient-catalog-service';
import { parseConstraintsPayload } from '@/lib/constraints/normalize';
import type { UserConstraintsInput } from '@/lib/constraints/types';
import { getCurrentUserId } from '@/lib/http/auth';
import { errorResponse } from '@/lib/http/responses';
import {
  patchProfileConstraints,
  readProfileConstraints,
  replaceProfileConstraints
} from '@/lib/profile-constraints-service';
import {
  listSpoonacularCuisineValues,
  listSpoonacularDietValues,
  listSpoonacularIntoleranceValues
} from '@/lib/spoonacular/definitions';

async function readJson(
  request: NextRequest
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function requireUserId(
  request: NextRequest
): Promise<string | NextResponse> {
  const userId = await getCurrentUserId(request);

  if (!userId) {
    return errorResponse(
      401,
      'unauthenticated',
      'Profile constraints require an authenticated user.'
    );
  }

  return userId;
}

async function validateNeverInclude(
  input: UserConstraintsInput
): Promise<NextResponse | null> {
  const missingIngredientIds = await findMissingCatalogIngredientIds(
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

function findUnsupportedValues(
  values: string[] | undefined,
  supportedValues: string[]
) {
  if (!values || values.length === 0) {
    return [];
  }

  const supported = new Set(supportedValues);
  return values.filter((value) => !supported.has(value));
}

function validateSpoonacularDefinitions(
  input: UserConstraintsInput
): NextResponse | null {
  const invalidDiets = findUnsupportedValues(
    input.diets,
    listSpoonacularDietValues()
  );
  const invalidIntolerances = findUnsupportedValues(
    input.intolerances,
    listSpoonacularIntoleranceValues()
  );
  const invalidPreferredCuisines = findUnsupportedValues(
    input.preferredCuisines,
    listSpoonacularCuisineValues()
  );
  const invalidExcludedCuisines = findUnsupportedValues(
    input.excludedCuisines,
    listSpoonacularCuisineValues()
  );

  if (
    invalidDiets.length === 0 &&
    invalidIntolerances.length === 0 &&
    invalidPreferredCuisines.length === 0 &&
    invalidExcludedCuisines.length === 0
  ) {
    return null;
  }

  return errorResponse(
    400,
    'invalidSpoonacularDefinitions',
    'Profile preferences contain unsupported Spoonacular definition values.',
    {
      invalidDiets,
      invalidIntolerances,
      invalidPreferredCuisines,
      invalidExcludedCuisines
    }
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
    const userId = await requireUserId(request);

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
    const userId = await requireUserId(request);

    if (typeof userId !== 'string') {
      return userId;
    }

    const parsed = parseConstraintsPayload(
      await readJson(request),
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

    const ingredientError = await validateNeverInclude(parsed.value);

    if (ingredientError) {
      return ingredientError;
    }

    const definitionError = validateSpoonacularDefinitions(parsed.value);

    if (definitionError) {
      return definitionError;
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
    const userId = await requireUserId(request);

    if (typeof userId !== 'string') {
      return userId;
    }

    const parsed = parseConstraintsPayload(
      await readJson(request),
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

    const ingredientError = await validateNeverInclude(parsed.value);

    if (ingredientError) {
      return ingredientError;
    }

    const definitionError = validateSpoonacularDefinitions(parsed.value);

    if (definitionError) {
      return definitionError;
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
