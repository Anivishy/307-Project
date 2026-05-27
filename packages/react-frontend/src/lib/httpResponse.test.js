import { describe, expect, it } from 'vitest';
import { readJson } from './httpResponse.js';

describe('readJson', () => {
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

    await expect(readJson(response)).rejects.toThrow(
      'Invalid email or password.'
    );
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
