import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-response';
import { DEMO_ADMIN_USER_ID } from '@/lib/demo-store';
import { readGeneratedBundleCandidates } from '@/lib/generation/bundle-generation-service';
import { isUuid, parseBearerToken } from '@/lib/request-user';
import { getSupabaseUserFromAccessToken } from '@/lib/supabase-auth';

async function getDemoOrAuthenticatedUserId(request: Request) {
  const token = parseBearerToken(request.headers.get('authorization'));

  if (token) {
    const user = await getSupabaseUserFromAccessToken(token);
    return user.id;
  }

  return request.headers.get('x-demo-user-id') ?? DEMO_ADMIN_USER_ID;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const payload = await readGeneratedBundleCandidates(
      groupId,
      await getDemoOrAuthenticatedUserId(request)
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const token = parseBearerToken(request.headers.get('authorization'));
    const userId = token
      ? (await getSupabaseUserFromAccessToken(token)).id
      : request.headers.get('x-demo-user-id') ?? DEMO_ADMIN_USER_ID;

    if (isUuid(groupId) && !token) {
      return NextResponse.json(
        {
          error: {
            code: 'unauthenticated',
            message: 'Bundle generation requires an authenticated user.'
          }
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      courseTypes?: unknown;
      servings?: unknown;
      cuisine?: unknown;
      query?: unknown;
    };

    const courseTypes = Array.isArray(body.courseTypes)
      ? body.courseTypes.filter(
          (value): value is 'appetizer' | 'main' | 'side' | 'dessert' =>
            value === 'appetizer' ||
            value === 'main' ||
            value === 'side' ||
            value === 'dessert'
        )
      : undefined;

    const { createBundleGenerationRequest } = await import(
      '@/lib/generation/bundle-generation-service'
    );

    const payload = await createBundleGenerationRequest(
      groupId,
      userId,
      {
        courseTypes,
        servings:
          typeof body.servings === 'number'
            ? body.servings
            : undefined,
        cuisine:
          typeof body.cuisine === 'string'
            ? body.cuisine
            : undefined,
        query:
          typeof body.query === 'string' ? body.query : undefined
      }
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
