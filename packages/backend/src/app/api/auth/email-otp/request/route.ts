import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../../lib/api-response';
import { requestEmailOtp } from '../../../../../lib/auth-service';

export async function POST(request: Request) {
  try {
    const payload = requestEmailOtp(await request.json());
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
