import { NextResponse } from "next/server";
import { ApiError } from "../../../../../lib/api-error";
import { DEMO_ADMIN_USER_ID } from "../../../../../lib/demo-store";
import { readBundleCandidates } from "../../../../../lib/group-service";

function getRequestUserId(request: Request) {
  return request.headers.get("x-user-id") ?? DEMO_ADMIN_USER_ID;
}

function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const payload = readBundleCandidates(groupId, getRequestUserId(request));
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
