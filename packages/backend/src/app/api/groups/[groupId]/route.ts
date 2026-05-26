import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getGroupById } from '@/lib/group-membership-service';
import { getRequestUserId } from '@/lib/request-user';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const group = await getGroupById(
      groupId,
      await getRequestUserId(request)
    );
    return NextResponse.json(group);
  } catch (error) {
    return handleApiError(error);
  }
}
