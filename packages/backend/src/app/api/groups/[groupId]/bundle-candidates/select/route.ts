import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { DEMO_ADMIN_USER_ID } from "@/lib/demo-store";
import { selectBundleCandidate } from "@/lib/group-service";
import { parseBearerToken } from "@/lib/request-user";
import { getSupabaseUserFromAccessToken } from "@/lib/supabase-auth";

async function getDemoOrAuthenticatedUserId(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));

  if (token) {
    const user = await getSupabaseUserFromAccessToken(token);
    return user.id;
  }

  // Demo-only fallback: keeps the restored selection prototype available without a session.
  return request.headers.get("x-demo-user-id") ?? DEMO_ADMIN_USER_ID;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const payload = selectBundleCandidate(
      groupId,
      await getDemoOrAuthenticatedUserId(request),
      await request.json(),
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
