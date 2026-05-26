import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getGroupPreviewByInviteCode } from '@/lib/group-membership-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;
    const preview = await getGroupPreviewByInviteCode(inviteCode);
    return NextResponse.json(preview);
  } catch (error) {
    return handleApiError(error);
  }
}
