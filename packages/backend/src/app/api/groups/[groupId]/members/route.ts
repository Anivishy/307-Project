import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getGroupMembers } from '@/lib/group-membership-service';
import { getRequestUserId } from '@/lib/request-user';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const members = await getGroupMembers(
      groupId,
      await getRequestUserId(request)
    );
    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}
