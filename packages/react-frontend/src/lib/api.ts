export type IngredientSummary = {
  id: string;
  name: string;
  category: string;
  commonUnits: string[];
};

export type UserConstraints = {
  userId: string;
  allergies: string[];
  medicalRestrictions: string[];
  neverIncludeIngredientIds: string[];
  updatedAt: string;
};

export type ConstraintInput = {
  allergies: string[];
  medicalRestrictions: string[];
  neverIncludeIngredientIds: string[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const demoUserId = import.meta.env.VITE_DEMO_USER_ID ?? 'demo-user';

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-user-id': demoUserId,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return (await response.json()) as T
}

export async function fetchConstraints(): Promise<UserConstraints> {
  const payload = await requestJson<{ constraints: UserConstraints }>('/profile/constraints')
  return payload.constraints
}

export async function saveConstraints(input: ConstraintInput): Promise<UserConstraints> {
  const payload = await requestJson<{ constraints: UserConstraints }>('/profile/constraints', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return payload.constraints
}

export async function searchIngredients(query: string): Promise<IngredientSummary[]> {
  const params = new URLSearchParams({ q: query, limit: '15' })
  const payload = await requestJson<{ ingredients: IngredientSummary[] }>(
    `/ingredients?${params.toString()}`,
  )
  return payload.ingredients
}

export async function fetchIngredientsByIds(ids: string[]): Promise<IngredientSummary[]> {
  if (ids.length === 0) {
    return []
  }

  const params = new URLSearchParams({ ids: ids.join(',') })
  const payload = await requestJson<{ ingredients: IngredientSummary[] }>(
    `/ingredients?${params.toString()}`,
  )
  return payload.ingredients
}
