import { NextResponse } from 'next/server';
import { handleApiError } from '../../../lib/api-response';
import {
  createUserGroup,
  listUserGroups
} from '../../../lib/group-membership-service';
import { getRequestUserId } from '../../../lib/request-user';

export async function GET(request: Request) {
  try {
    const groups = await listUserGroups(
      await getRequestUserId(request)
    );
    return NextResponse.json({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const group = await createUserGroup(
      await getRequestUserId(request),
      await request.json()
    );

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
