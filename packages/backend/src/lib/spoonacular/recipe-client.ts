import { ApiError } from '../api-error';
import {
  getSpoonacularApiKey,
  getSpoonacularBaseUrl,
  isSpoonacularGenerationMockMode
} from './config';
import type { BundleTemplate } from '../demo-store';
import { getBundleTemplates } from '../demo-store';

export type SpoonacularRecipeSearchResult = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
};

export type SpoonacularRecipeSearchResponse = {
  results: SpoonacularRecipeSearchResult[];
  offset: number;
  number: number;
  totalResults: number;
};

export type SpoonacularExtendedIngredient = {
  id?: number;
  name: string;
  original?: string;
  amount?: number;
  unit?: string;
};

export type SpoonacularAnalyzedInstruction = {
  name?: string;
  steps?: Array<{ number?: number; step?: string }>;
};

export type SpoonacularRecipeInformation = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  summary?: string;
  cuisines?: string[];
  dishTypes?: string[];
  extendedIngredients?: SpoonacularExtendedIngredient[];
  analyzedInstructions?: SpoonacularAnalyzedInstruction[];
  instructions?: string;
};

export type RecipeSearchParams = {
  type?: string;
  includeIngredients?: string[];
  excludeIngredients?: string[];
  diet?: string;
  intolerances?: string;
  cuisine?: string;
  excludeCuisine?: string;
  query?: string;
  number?: number;
  offset?: number;
  sort?: string;
};

type SpoonacularRequestOptions = {
  path: string;
  searchParams?: Record<string, string | number | undefined>;
};

async function spoonacularFetch<T>(
  options: SpoonacularRequestOptions
): Promise<T> {
  const apiKey = getSpoonacularApiKey();

  if (!apiKey) {
    throw new ApiError(
      503,
      'Spoonacular API key is not configured.'
    );
  }

  const url = new URL(`${getSpoonacularBaseUrl()}${options.path}`);

  for (const [key, value] of Object.entries(
    options.searchParams ?? {}
  )) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set('apiKey', apiKey);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(15_000)
  });

  if (response.status === 402) {
    throw new ApiError(
      503,
      'Spoonacular API quota exceeded. Try again later or enable mock generation.'
    );
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      `Spoonacular request failed with status ${response.status}.`
    );
  }

  return (await response.json()) as T;
}

export async function searchRecipes(
  params: RecipeSearchParams
): Promise<SpoonacularRecipeSearchResponse> {
  if (isSpoonacularGenerationMockMode()) {
    return {
      results: [],
      offset: 0,
      number: 0,
      totalResults: 0
    };
  }

  return spoonacularFetch<SpoonacularRecipeSearchResponse>({
    path: '/recipes/complexSearch',
    searchParams: {
      type: params.type,
      includeIngredients: params.includeIngredients?.join(','),
      excludeIngredients: params.excludeIngredients?.join(','),
      diet: params.diet,
      intolerances: params.intolerances,
      cuisine: params.cuisine,
      excludeCuisine: params.excludeCuisine,
      query: params.query,
      number: params.number ?? 10,
      offset: params.offset ?? 0,
      sort: params.sort ?? 'max-used-ingredients',
      addRecipeInformation: 'false',
      fillIngredients: 'false',
      instructionsRequired: 'true'
    }
  });
}

export async function getRecipesInformationBulk(
  recipeIds: number[]
): Promise<SpoonacularRecipeInformation[]> {
  const uniqueIds = [
    ...new Set(recipeIds.filter((id) => Number.isFinite(id) && id > 0))
  ];

  if (uniqueIds.length === 0) {
    return [];
  }

  if (isSpoonacularGenerationMockMode()) {
    return [];
  }

  return spoonacularFetch<SpoonacularRecipeInformation[]>({
    path: '/recipes/informationBulk',
    searchParams: {
      ids: uniqueIds.join(','),
      includeNutrition: 'false'
    }
  });
}

export function getMockGenerationTemplates(
  groupId: string
): BundleTemplate[] {
  const demoTemplates = getBundleTemplates(groupId);

  if (demoTemplates.length > 0) {
    return demoTemplates;
  }

  return getBundleTemplates('dorm-dinner-crew');
}

export const COURSE_TYPE_TO_SPOONACULAR: Record<
  string,
  string
> = {
  appetizer: 'appetizer',
  main: 'main course',
  side: 'side dish',
  dessert: 'dessert'
};
