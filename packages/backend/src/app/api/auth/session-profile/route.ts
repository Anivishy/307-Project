import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/api-response';
import { createSessionProfile } from '../../../../lib/auth-service';

export async function POST(request: Request) {
  try {
    const payload = await createSessionProfile(
      await request.json(),
      request.headers.get('authorization')
    );
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
