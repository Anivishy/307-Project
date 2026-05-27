import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { DEMO_ADMIN_USER_ID } from '@/lib/demo-store';
import {
  readGroupSettings,
  saveGroupSettings
} from '@/lib/group-service';
import { isUuid, parseBearerToken } from '@/lib/request-user';
import { getSupabaseUserFromAccessToken } from '@/lib/supabase-auth';

async function getDemoOrAuthenticatedUserId(request: Request) {
  const token = parseBearerToken(
    request.headers.get('authorization')
  );

  if (token) {
    const user = await getSupabaseUserFromAccessToken(token);
    return user.id;
  }

  // Demo-only fallback: the restored US7/US8 prototype can run without a real session.
  return (
    request.headers.get('x-demo-user-id') ?? DEMO_ADMIN_USER_ID
  );
}

async function getPersistedUserId(request: Request) {
  const token = parseBearerToken(
    request.headers.get('authorization')
  );
  return token
    ? (await getSupabaseUserFromAccessToken(token)).id
    : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const persistedUserId = await getPersistedUserId(request);

    if (persistedUserId && isUuid(groupId)) {
      const { readPersistedGroupSettings } =
        await import('@/lib/group-settings-service');
      const payload = await readPersistedGroupSettings(
        groupId,
        persistedUserId
      );
      return NextResponse.json(payload);
    }

    const payload = readGroupSettings(
      groupId,
      await getDemoOrAuthenticatedUserId(request)
    );
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
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
      typeof body.allowMissingIngredients !== 'boolean'
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'invalidInput',
            message:
              'allowMissingIngredients must be a boolean.'
          }
        },
        { status: 400 }
      );
    }

    if (
      body.staplesEnabled !== undefined &&
      typeof body.staplesEnabled !== 'boolean'
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'invalidInput',
            message: 'staplesEnabled must be a boolean.'
          }
        },
        { status: 400 }
      );
    }

    if (
      body.customStaples !== undefined &&
      (!Array.isArray(body.customStaples) ||
        body.customStaples.some(
          (item) => typeof item !== 'string'
        ))
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'invalidInput',
            message:
              'customStaples must be an array of ingredient ids.'
          }
        },
        { status: 400 }
      );
    }

    if (
      body.allowMissingIngredients === undefined &&
      body.staplesEnabled === undefined &&
      body.customStaples === undefined
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'invalidInput',
            message: 'No supported settings were provided.'
          }
        },
        { status: 400 }
      );
    }

    const persistedUserId = await getPersistedUserId(request);
    const updates = {
      allowMissingIngredients:
        typeof body.allowMissingIngredients === 'boolean'
          ? body.allowMissingIngredients
          : undefined,
      staplesEnabled:
        typeof body.staplesEnabled === 'boolean'
          ? body.staplesEnabled
          : undefined,
      customStaples: Array.isArray(body.customStaples)
        ? body.customStaples
        : undefined
    };

    if (persistedUserId && isUuid(groupId)) {
      const { savePersistedGroupSettings } =
        await import('@/lib/group-settings-service');
      const payload = await savePersistedGroupSettings(
        groupId,
        persistedUserId,
        updates
      );
      return NextResponse.json(payload);
    }

    // Only pass fields that survived validation; undefined means "do not change this setting."
    const payload = saveGroupSettings(
      groupId,
      await getDemoOrAuthenticatedUserId(request),
      updates
    );

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
