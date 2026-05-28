import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { DEMO_ADMIN_USER_ID } from '@/lib/demo-store';
import { readGroupActivity } from '@/lib/group-service';
import { parseBearerToken } from '@/lib/request-user';
import { getSupabaseUserFromAccessToken } from '@/lib/supabase-auth';

async function getDemoOrAuthenticatedUserId(request: Request) {
  const token = parseBearerToken(
    request.headers.get('authorization')
  );

  if (token) {
    const user = await getSupabaseUserFromAccessToken(token);
    return user.id;
  }

  return (
    request.headers.get('x-demo-user-id') ?? DEMO_ADMIN_USER_ID
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const activity = readGroupActivity(
      groupId,
      await getDemoOrAuthenticatedUserId(request)
    );

    return NextResponse.json({ activity });
  } catch (error) {
    return handleApiError(error);
  }
}
