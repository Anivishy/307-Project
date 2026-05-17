import { NextResponse } from "next/server";
import { handleApiError } from "../../../../../../lib/api-response";
import { DEMO_ADMIN_USER_ID } from "../../../../../../lib/demo-store";
import { selectBundleCandidate } from "../../../../../../lib/group-service";

function getDemoRequestUserId(request: Request) {
  // Demo-only fallback: lets the selection flow run before the real OTP session is wired in.
  return request.headers.get("x-user-id") ?? DEMO_ADMIN_USER_ID;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const payload = selectBundleCandidate(
      groupId,
      getDemoRequestUserId(request),
      await request.json(),
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
