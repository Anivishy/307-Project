import type { NextRequest } from 'next/server';
import { parseBearerToken } from '../request-user';
import { getSupabaseUserFromAccessToken } from '../supabase-auth';

export async function getCurrentUserId(
  request: NextRequest
): Promise<string | null> {
  const token = parseBearerToken(
    request.headers.get('authorization')
  );

  if (!token) {
    return null;
  }

  const user = await getSupabaseUserFromAccessToken(token);
  return user.id;
}
