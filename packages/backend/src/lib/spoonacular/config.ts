import { loadBackendEnv } from '../env';

const DEFAULT_COMMON_UNITS = ['g', 'oz', 'cup', 'each'];

export function getDefaultCommonUnits() {
  return DEFAULT_COMMON_UNITS;
}

export function getSpoonacularApiKey(): string | undefined {
  loadBackendEnv();
  const apiKey = process.env.SPOONACULAR_API_KEY?.trim();
  return apiKey || undefined;
}

function readLegacyMockFlag(): boolean | undefined {
  loadBackendEnv();
  const mockFlag = process.env.SPOONACULAR_MOCK?.trim().toLowerCase();

  if (mockFlag === 'true') {
    return true;
  }

  if (mockFlag === 'false') {
    return false;
  }

  return undefined;
}

function readScopedMockFlag(
  scopedName: 'SPOONACULAR_MOCK_CATALOG' | 'SPOONACULAR_MOCK_GENERATION',
  fallbackWhenUnset: boolean
): boolean {
  loadBackendEnv();
  const scopedValue = process.env[scopedName]?.trim().toLowerCase();

  if (scopedValue === 'true') {
    return true;
  }

  if (scopedValue === 'false') {
    return false;
  }

  const legacyMock = readLegacyMockFlag();
  if (legacyMock !== undefined) {
    return legacyMock;
  }

  if (!getSpoonacularApiKey()) {
    return true;
  }

  return fallbackWhenUnset;
}

/** Pantry/profile/staples typeahead. Defaults to mock to preserve API points. */
export function isSpoonacularCatalogMockMode(): boolean {
  return readScopedMockFlag('SPOONACULAR_MOCK_CATALOG', true);
}

/** Recipe bundle generation. Defaults to mock unless explicitly enabled. */
export function isSpoonacularGenerationMockMode(): boolean {
  return readScopedMockFlag('SPOONACULAR_MOCK_GENERATION', true);
}

/** @deprecated Use isSpoonacularCatalogMockMode or isSpoonacularGenerationMockMode */
export function isSpoonacularMockMode(): boolean {
  return isSpoonacularCatalogMockMode();
}

export function getSpoonacularBaseUrl() {
  return 'https://api.spoonacular.com';
}

export function getSpoonacularModeSummary() {
  return {
    catalog: isSpoonacularCatalogMockMode() ? 'mock' : 'live',
    generation: isSpoonacularGenerationMockMode() ? 'mock' : 'live',
    hasApiKey: Boolean(getSpoonacularApiKey())
  };
}
