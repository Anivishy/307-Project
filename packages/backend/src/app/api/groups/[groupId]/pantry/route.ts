import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getGroupPantry } from '@/lib/group-pantry-service';
import { getRequestUserId } from '@/lib/request-user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const ownerId = request.nextUrl.searchParams.get('ownerId');
    const pantry = await getGroupPantry(
      groupId,
      await getRequestUserId(request),
      ownerId
    );

    return NextResponse.json({ pantry });
  } catch (error) {
    return handleApiError(error);
  }
}
