import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import {
  readProfile,
  updateProfileIdentity
} from '@/lib/profile-service';
import { getRequestUserId } from '@/lib/request-user';
import { ApiError } from '@/lib/api-error';

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(
      400,
      'Request body must be valid JSON.'
    );
  }
}

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

export async function PATCH(request: Request) {
  try {
    const profile = await updateProfileIdentity(
      await getRequestUserId(request),
      await readJson(request)
    );

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
