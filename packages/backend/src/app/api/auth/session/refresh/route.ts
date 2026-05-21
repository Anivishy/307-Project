import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { refreshSession } from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const payload = await refreshSession(await request.json());
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
