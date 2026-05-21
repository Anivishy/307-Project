import { NextResponse } from 'next/server';
import { ApiError } from './api-error';

// Route handlers call this once in catch blocks so all API errors use the same JSON shape.
export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: 'apiError', message: error.message } },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: { code: 'unexpectedError', message: 'Unexpected server error.' } },
    { status: 500 }
  );
}
