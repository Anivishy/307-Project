import { describe, expect, it } from 'vitest';
import { ApiRequestError, readJson } from '@/lib/httpResponse.js';

describe('readJson', () => {
  it('returns parsed JSON for successful responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

    await expect(readJson(response)).resolves.toEqual({ ok: true });
  });

  it('uses API error messages from JSON responses', async () => {
    const response = new Response(
      JSON.stringify({
        error: { message: 'Invalid email or password.' }
      }),
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'content-type': 'application/json' }
      }
    );

    await expect(readJson(response)).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 401,
      message: 'Invalid email or password.'
    });
  });

  it('throws ApiRequestError with status and backend message', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'apiError',
          message:
            'Candidate set is stale. Refresh or explicitly confirm before selecting.'
        }
      }),
      {
        status: 409,
        statusText: 'Conflict',
        headers: { 'content-type': 'application/json' }
      }
    );

    await expect(readJson(response)).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 409,
      message:
        'Candidate set is stale. Refresh or explicitly confirm before selecting.'
    });
  });

  it('preserves error.message for generic catch blocks', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          message:
            'Spoonacular API quota exceeded. Try again later or enable mock generation.'
        }
      }),
      {
        status: 503,
        headers: { 'content-type': 'application/json' }
      }
    );

    try {
      await readJson(response);
      throw new Error('Expected readJson to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatch(/quota exceeded/i);
      expect(error.status).toBe(503);
    }
  });

  it('replaces non-JSON 404 responses with a backend proxy hint', async () => {
    const response = new Response('404 Not Found', {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'text/plain' }
    });

    await expect(readJson(response)).rejects.toThrow(
      /backend server is running and the Vite proxy target is correct/i
    );
  });
});
