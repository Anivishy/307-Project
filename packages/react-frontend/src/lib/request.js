export const REQUEST_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(path, init = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), {
        once: true
      });
    }
  }

  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error('Request timed out. Please try again.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
