import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-response';
import { DEMO_ADMIN_USER_ID } from '@/lib/demo-store';
import { appendGeneratedBundleCandidate } from '@/lib/generation/bundle-generation-service';
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const token = parseBearerToken(request.headers.get('authorization'));

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

    const payload = await appendGeneratedBundleCandidate(
      groupId,
      await getDemoOrAuthenticatedUserId(request)
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
