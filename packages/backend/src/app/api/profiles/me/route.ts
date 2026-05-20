import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import { readProfile } from '../../../../lib/profile-service';
import { getRequestUserId } from '../../../../lib/request-user';

export async function GET(request: Request) {
  try {
    const profile = await readProfile(
      await getRequestUserId(request)
    );

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
