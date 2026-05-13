import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import { readProfile } from '../../../../lib/profile-service';

// GET /api/profiles/[profileId] is a direct lookup route; [profileId] comes from the folder name.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    const profile = await readProfile(profileId);

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
