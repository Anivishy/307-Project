import { NextResponse } from 'next/server';
import { ApiError } from './api-error';

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: 'Unexpected server error.' },
    { status: 500 }
  );
}
