import type { IngredientSummary } from './constraints/types';
import {
  autocompleteIngredients,
  getIngredientInformationByIds,
  mapAutocompleteItemsToCatalog
} from './spoonacular/client';
import { isSpoonacularCatalogMockMode } from './spoonacular/config';
import {
  findFixtureCatalogIngredientById,
  findMissingFixtureCatalogIds,
  listFixtureCatalog,
  searchFixtureCatalog
} from './spoonacular/fixtures';
import type { CatalogSearchResult } from './spoonacular/types';

const searchCache = new Map<
  string,
  { expiresAt: number; result: CatalogSearchResult }
>();

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 15;
  }

  return Math.max(1, Math.min(Math.trunc(limit), 25));
}

function toIngredientSummary(
  ingredient: CatalogSearchResult['ingredients'][number]
): IngredientSummary {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    commonUnits: ingredient.commonUnits
  };
}

function getCachedSearch(cacheKey: string) {
  const cached = searchCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    searchCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

function setCachedSearch(cacheKey: string, result: CatalogSearchResult) {
  searchCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    result
  });
}

export function resetIngredientCatalogCacheForTests() {
  searchCache.clear();
}

export function parseCatalogIngredientId(id: string): number | null {
  const trimmedId = id.trim();
  const numericId = Number.parseInt(trimmedId, 10);

  if (
    Number.isFinite(numericId) &&
    numericId > 0 &&
    String(numericId) === trimmedId
  ) {
    return numericId;
  }

  return null;
}

export async function searchCatalogIngredients(
  query: string,
  limit = 15
): Promise<CatalogSearchResult> {
  const boundedLimit = normalizeLimit(limit);
  const trimmedQuery = query.trim();
  const cacheKey = `${trimmedQuery}:${boundedLimit}`;
  const cached = getCachedSearch(cacheKey);

  if (cached) {
    return cached;
  }

  if (!trimmedQuery) {
    if (isSpoonacularCatalogMockMode()) {
      const result: CatalogSearchResult = {
        ingredients: listFixtureCatalog(boundedLimit),
        source: 'mock'
      };
      setCachedSearch(cacheKey, result);
      return result;
    }

    return {
      ingredients: [],
      source: 'spoonacular'
    };
  }

  if (isSpoonacularCatalogMockMode()) {
    const result: CatalogSearchResult = {
      ingredients: searchFixtureCatalog(trimmedQuery, boundedLimit),
      source: 'mock'
    };
    setCachedSearch(cacheKey, result);
    return result;
  }

  const autocompleteItems = await autocompleteIngredients(
    trimmedQuery,
    boundedLimit
  );

  const result: CatalogSearchResult = {
    ingredients: await mapAutocompleteItemsToCatalog(
      autocompleteItems
    ),
    source: 'spoonacular'
  };

  setCachedSearch(cacheKey, result);
  return result;
}

export async function findCatalogIngredientsByIds(
  ids: string[]
): Promise<IngredientSummary[]> {
  const uniqueIds = [
    ...new Set(
      ids
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  ];

  if (uniqueIds.length === 0) {
    return [];
  }

  if (isSpoonacularCatalogMockMode()) {
    return uniqueIds
      .map((id) => findFixtureCatalogIngredientById(id))
      .filter((ingredient) => ingredient !== undefined)
      .map(toIngredientSummary);
  }

  const ingredients = await getIngredientInformationByIds(uniqueIds);
  return ingredients.map(toIngredientSummary);
}

export async function findMissingCatalogIngredientIds(
  ids: string[]
): Promise<string[]> {
  const uniqueIds = [
    ...new Set(
      ids
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  ];

  if (uniqueIds.length === 0) {
    return [];
  }

  if (isSpoonacularCatalogMockMode()) {
    return findMissingFixtureCatalogIds(uniqueIds);
  }

  const resolved = await findCatalogIngredientsByIds(uniqueIds);
  const resolvedIds = new Set(resolved.map((ingredient) => ingredient.id));

  return uniqueIds.filter((id) => !resolvedIds.has(id));
}

export async function findCatalogIngredientById(
  id: string
): Promise<IngredientSummary | undefined> {
  const ingredients = await findCatalogIngredientsByIds([id]);
  return ingredients[0];
}

export async function searchCatalogIngredientSummaries(
  query: string,
  limit = 15
): Promise<IngredientSummary[]> {
  const result = await searchCatalogIngredients(query, limit);
  return result.ingredients.map(toIngredientSummary);
}
