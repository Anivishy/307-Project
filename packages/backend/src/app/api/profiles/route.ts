import { NextResponse } from 'next/server';
import { handleApiError } from '../../../lib/api-response';
import { createProfile } from '../../../lib/profile-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile = await createProfile(body);

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
