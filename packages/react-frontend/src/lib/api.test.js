import { afterEach, describe, expect, it, vi } from 'vitest';
import { REQUEST_TIMEOUT_MS, apiFetch } from './api.js';

describe('apiFetch request time limit', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('aborts slow issue API calls instead of waiting forever', async () => {
    vi.useFakeTimers();
    let requestSignal;

    vi.stubGlobal(
      'fetch',
      vi.fn((_path, options) => {
        requestSignal = options.signal;

        return new Promise((_resolve, reject) => {
          requestSignal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        });
      })
    );

    const request = apiFetch('/api/groups').catch((error) => error);

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    await expect(request).resolves.toMatchObject({
      message: 'Request timed out. Please try again.'
    });
    expect(requestSignal.aborted).toBe(true);
  });
});
