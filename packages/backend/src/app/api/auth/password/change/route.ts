import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';
import { handleApiError } from '@/lib/api-response';
import { changePassword } from '@/lib/auth-service';
import { getBearerToken } from '@/lib/request-user';

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

export async function POST(request: Request) {
  try {
    const payload = await changePassword(
      getBearerToken(request),
      await readJson(request)
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
