import { ApiError } from '../api-error';
import {
  getDefaultCommonUnits,
  getSpoonacularApiKey,
  getSpoonacularBaseUrl,
  isSpoonacularCatalogMockMode
} from './config';
import {
  findFixtureCatalogIngredientById,
  searchFixtureCatalog,
  toFixtureAutocompleteItems,
  toFixtureIngredientInformation
} from './fixtures';
import type {
  SpoonacularAutocompleteItem,
  SpoonacularIngredientInformation
} from './types';

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
    signal: AbortSignal.timeout(10_000)
  });

  if (response.status === 402) {
    throw new ApiError(
      503,
      'Spoonacular API quota exceeded. Try again later or enable mock mode.'
    );
  }

  if (response.status === 404) {
    throw new ApiError(404, 'Spoonacular resource not found.');
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      `Spoonacular request failed with status ${response.status}.`
    );
  }

  return (await response.json()) as T;
}

export async function autocompleteIngredients(
  query: string,
  number = 15
): Promise<SpoonacularAutocompleteItem[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  if (isSpoonacularCatalogMockMode()) {
    return toFixtureAutocompleteItems(
      searchFixtureCatalog(trimmedQuery, number)
    );
  }

  return spoonacularFetch<SpoonacularAutocompleteItem[]>({
    path: '/food/ingredients/autocomplete',
    searchParams: {
      query: trimmedQuery,
      number
    }
  });
}

export async function getIngredientInformation(
  ingredientId: number
): Promise<SpoonacularIngredientInformation> {
  if (isSpoonacularCatalogMockMode()) {
    const fixture = findFixtureCatalogIngredientById(
      String(ingredientId)
    );

    if (!fixture) {
      throw new ApiError(404, 'Ingredient not found.');
    }

    return toFixtureIngredientInformation(fixture);
  }

  return spoonacularFetch<SpoonacularIngredientInformation>({
    path: `/food/ingredients/${ingredientId}/information`
  });
}

export function mapIngredientInformationToCatalog(
  ingredient: SpoonacularIngredientInformation
) {
  return {
    id: String(ingredient.id),
    spoonacularId: ingredient.id,
    name: ingredient.name,
    category:
      ingredient.category ??
      ingredient.aisle ??
      'ingredient',
    commonUnits:
      ingredient.possibleUnits?.length &&
      ingredient.possibleUnits.length > 0
        ? ingredient.possibleUnits
        : getDefaultCommonUnits(),
    image: ingredient.image
  };
}

export async function getIngredientInformationByIds(
  ids: string[]
) {
  const uniqueIds = [
    ...new Set(
      ids
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  ];

  const ingredients = await Promise.all(
    uniqueIds.map(async (id) => {
      const numericId = Number.parseInt(id, 10);

      if (!Number.isFinite(numericId) || numericId <= 0) {
        return null;
      }

      try {
        const information = await getIngredientInformation(
          numericId
        );
        return mapIngredientInformationToCatalog(information);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          return null;
        }

        throw error;
      }
    })
  );

  const byId = new Map(
    ingredients
      .filter((ingredient) => ingredient !== null)
      .map((ingredient) => [ingredient.id, ingredient])
  );

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((ingredient) => ingredient !== undefined);
}

export async function mapAutocompleteItemsToCatalog(
  items: SpoonacularAutocompleteItem[]
) {
  return items.map((item) => ({
    id: String(item.id),
    spoonacularId: item.id,
    name: item.name,
    category: 'ingredient',
    commonUnits: getDefaultCommonUnits(),
    image: item.image
  }));
}
