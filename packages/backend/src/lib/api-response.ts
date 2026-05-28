import { NextResponse } from 'next/server';
import { ApiError } from './api-error';

// Route handlers call this once in catch blocks so all API errors use the same JSON shape.
export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    const responseBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };

    return NextResponse.json(
      responseBody,
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: { code: 'unexpectedError', message: 'Unexpected server error.' } },
    { status: 500 }
  );
}
