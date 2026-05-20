import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { joinUserGroup } from '@/lib/group-membership-service';
import { getRequestUserId } from '@/lib/request-user';

export async function POST(request: Request) {
  try {
    const group = await joinUserGroup(
      await getRequestUserId(request),
      await request.json()
    );

    return NextResponse.json(group);
  } catch (error) {
    return handleApiError(error);
  }
}
