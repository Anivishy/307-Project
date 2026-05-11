import { NextResponse } from "next/server";
import { ApiError } from "../../../../../lib/api-error";
import { DEMO_ADMIN_USER_ID } from "../../../../../lib/demo-store";
import { readGroupSettings, saveGroupSettings } from "../../../../../lib/group-service";

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
    const payload = readGroupSettings(groupId, getRequestUserId(request));
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const { groupId } = await params;
    const body = (await request.json()) as {
      allowMissingIngredients?: unknown;
      staplesEnabled?: unknown;
      customStaples?: unknown;
    };

    if (
      body.allowMissingIngredients !== undefined &&
      typeof body.allowMissingIngredients !== "boolean"
    ) {
      return NextResponse.json({ error: "allowMissingIngredients must be a boolean." }, { status: 400 });
    }

    if (body.staplesEnabled !== undefined && typeof body.staplesEnabled !== "boolean") {
      return NextResponse.json({ error: "staplesEnabled must be a boolean." }, { status: 400 });
    }

    if (
      body.customStaples !== undefined &&
      (!Array.isArray(body.customStaples) ||
        body.customStaples.some((item) => typeof item !== "string"))
    ) {
      return NextResponse.json({ error: "customStaples must be an array of ingredient ids." }, { status: 400 });
    }

    if (
      body.allowMissingIngredients === undefined &&
      body.staplesEnabled === undefined &&
      body.customStaples === undefined
    ) {
      return NextResponse.json({ error: "No supported settings were provided." }, { status: 400 });
    }

    const payload = saveGroupSettings(groupId, getRequestUserId(request), {
      allowMissingIngredients:
        typeof body.allowMissingIngredients === "boolean" ? body.allowMissingIngredients : undefined,
      staplesEnabled: typeof body.staplesEnabled === "boolean" ? body.staplesEnabled : undefined,
      customStaples: Array.isArray(body.customStaples) ? body.customStaples : undefined,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
