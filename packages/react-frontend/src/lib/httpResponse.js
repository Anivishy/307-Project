export class ApiRequestError extends Error {
  constructor(status, message, payload = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

function formatStatus(response) {
  return [response.status, response.statusText]
    .filter(Boolean)
    .join(' ');
}

function getNonJsonMessage(response) {
  const status = formatStatus(response);

  if (response.status === 404) {
    return `The API endpoint was not found (${status}). Make sure the backend server is running and the Vite proxy target is correct.`;
  }

  return `The API returned ${status || 'a non-JSON response'} instead of JSON. Make sure the backend server is running and the Vite proxy target is correct.`;
}

export async function parseJsonResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const bodyText = await response.text();

  if (bodyText.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error(getNonJsonMessage(response));
  }
}

export function getApiErrorMessage(
  payload,
  fallback = 'Request failed.'
) {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload)
  ) {
    if (
      payload.error &&
      typeof payload.error === 'object' &&
      typeof payload.error.message === 'string'
    ) {
      return payload.error.message;
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }
  }

  return fallback;
}

export async function readJson(response) {
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      getApiErrorMessage(payload),
      payload
    );
  }

  return payload;
}
