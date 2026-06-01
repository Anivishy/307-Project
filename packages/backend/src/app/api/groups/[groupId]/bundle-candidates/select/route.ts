import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-response';
import { DEMO_ADMIN_USER_ID } from '@/lib/demo-store';
import { selectGeneratedBundleCandidate } from '@/lib/generation/bundle-generation-service';
import { parseBearerToken } from '@/lib/request-user';
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
    const payload = await selectGeneratedBundleCandidate(
      groupId,
      await getDemoOrAuthenticatedUserId(request),
      await request.json()
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
