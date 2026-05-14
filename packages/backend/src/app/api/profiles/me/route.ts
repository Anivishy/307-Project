import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import { readProfile } from '../../../../lib/profile-service';
import { getRequestUserId } from '../../../../lib/request-user';

// GET /api/profiles/me reads the caller from x-user-id until the SRD's OTP session flow exists.
export async function GET(request: Request) {
  try {
    const profile = await readProfile(
      getRequestUserId(request)
    );

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
