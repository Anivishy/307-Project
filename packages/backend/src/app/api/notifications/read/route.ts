import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { markUserNotificationsRead } from '@/lib/notification-service';
import { getRequestUserId } from '@/lib/request-user';

export async function PATCH(request: Request) {
  try {
    const payload = await markUserNotificationsRead(
      await getRequestUserId(request)
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
