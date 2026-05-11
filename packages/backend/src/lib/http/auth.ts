import type { NextRequest } from "next/server";

export function getCurrentUserId(request: NextRequest): string | null {
  const explicitUserId = request.headers.get("x-user-id")?.trim();

  if (explicitUserId) {
    return explicitUserId;
  }

  return null;
}
