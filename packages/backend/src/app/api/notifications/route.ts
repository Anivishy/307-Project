import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { listUserNotifications } from '@/lib/notification-service';
import { getRequestUserId } from '@/lib/request-user';

export async function GET(request: Request) {
  try {
    const payload = await listUserNotifications(
      await getRequestUserId(request)
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
