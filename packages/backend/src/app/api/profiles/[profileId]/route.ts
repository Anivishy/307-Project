import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import { getProfile } from '../../../../lib/profile-service';

// GET /api/profiles/[profileId] is a direct lookup route; [profileId] comes from the folder name.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const profile = await getProfile(profileId);

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
