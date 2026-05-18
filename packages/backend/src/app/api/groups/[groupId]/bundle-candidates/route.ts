import { NextResponse } from "next/server";
import { handleApiError } from "../../../../../lib/api-response";
import { DEMO_ADMIN_USER_ID } from "../../../../../lib/demo-store";
import { readBundleCandidates } from "../../../../../lib/group-service";

function getDemoRequestUserId(request: Request) {
  // Demo-only fallback: lets the candidate endpoint show an admin view before OTP auth exists.
  // The service still checks that the resolved user belongs to the requested group.
  return request.headers.get("x-user-id") ?? DEMO_ADMIN_USER_ID;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const payload = await readBundleCandidates(
      groupId,
      getDemoRequestUserId(request)
    );
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
