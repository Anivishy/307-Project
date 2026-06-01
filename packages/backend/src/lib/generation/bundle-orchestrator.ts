import type { BundleCourseType, BundleTemplate } from '../demo-store';
import { isSpoonacularGenerationMockMode } from '../spoonacular/config';
import { assembleBundleTemplate } from '../spoonacular/recipe-mapper';
import {
  COURSE_TYPE_TO_SPOONACULAR,
  getMockGenerationTemplates,
  getRecipesInformationBulk,
  searchRecipes,
  type SpoonacularRecipeInformation
} from '../spoonacular/recipe-client';
import type { BundleGenerationRequest } from './bundle-candidate-store';
import type { AggregatedMemberPreferences } from './constraints-loader';

const DEFAULT_COURSE_TYPES: BundleCourseType[] = [
  'appetizer',
  'main',
  'side',
  'dessert'
];

const INITIAL_BUNDLE_COUNT = 3;

const EMPTY_MEMBER_PREFERENCES: AggregatedMemberPreferences = {
  diets: [],
  intolerances: [],
  preferredCuisines: [],
  excludedCuisines: [],
  dislikedIngredients: [],
  spiceLevels: []
};

function normalizeCourseTypes(
  courseTypes: BundleCourseType[] | undefined
) {
  const selected =
    courseTypes && courseTypes.length > 0
      ? courseTypes
      : DEFAULT_COURSE_TYPES;

  return [...new Set(selected)];
}

function pickRecipe(
  recipes: SpoonacularRecipeInformation[],
  bundleIndex: number,
  courseIndex: number
) {
  if (recipes.length === 0) {
    return undefined;
  }

  const recipeIndex = (bundleIndex + courseIndex) % recipes.length;
  return recipes[recipeIndex];
}

function joinSearchValues(values: string[]) {
  return values.length > 0 ? values.join(',') : undefined;
}

function resolveCuisine(
  request: BundleGenerationRequest,
  preferences: AggregatedMemberPreferences
) {
  const requestedCuisine = request.cuisine?.trim();

  if (requestedCuisine) {
    return requestedCuisine;
  }

  return joinSearchValues(preferences.preferredCuisines);
}

async function searchCourseRecipes(input: {
  courseType: BundleCourseType;
  pantryIngredientNames: string[];
  excludeIngredients: string[];
  preferences: AggregatedMemberPreferences;
  cuisine?: string;
  query?: string;
}) {
  const response = await searchRecipes({
    type: COURSE_TYPE_TO_SPOONACULAR[input.courseType],
    includeIngredients: input.pantryIngredientNames,
    excludeIngredients: input.excludeIngredients,
    diet: joinSearchValues(input.preferences.diets),
    intolerances: joinSearchValues(input.preferences.intolerances),
    cuisine: input.cuisine,
    excludeCuisine: joinSearchValues(input.preferences.excludedCuisines),
    query: input.query,
    number: 10,
    sort: 'max-used-ingredients'
  });

  if (response.results.length === 0) {
    return [];
  }

  const recipeDetails = await getRecipesInformationBulk(
    response.results.map((recipe) => recipe.id)
  );

  return recipeDetails;
}

export async function generateBundleTemplates(
  groupId: string,
  request: BundleGenerationRequest,
  pantryIngredientNames: string[],
  excludeIngredients: string[] = [],
  preferences: AggregatedMemberPreferences = EMPTY_MEMBER_PREFERENCES
): Promise<BundleTemplate[]> {
  if (isSpoonacularGenerationMockMode()) {
    return getMockGenerationTemplates(groupId).slice(0, INITIAL_BUNDLE_COUNT);
  }

  const courseTypes = normalizeCourseTypes(request.courseTypes);
  const cuisine = resolveCuisine(request, preferences);
  const recipesByCourse = new Map<
    BundleCourseType,
    SpoonacularRecipeInformation[]
  >();

  for (const courseType of courseTypes) {
    const recipes = await searchCourseRecipes({
      courseType,
      pantryIngredientNames,
      excludeIngredients,
      preferences,
      cuisine,
      query: request.query
    });
    recipesByCourse.set(courseType, recipes);
  }

  const bundles: BundleTemplate[] = [];

  for (let bundleIndex = 0; bundleIndex < INITIAL_BUNDLE_COUNT; bundleIndex++) {
    const selectedCourses: Array<{
      courseType: BundleCourseType;
      recipe: SpoonacularRecipeInformation;
    }> = [];

    for (const [courseIndex, courseType] of courseTypes.entries()) {
      const recipe = pickRecipe(
        recipesByCourse.get(courseType) ?? [],
        bundleIndex,
        courseIndex
      );

      if (!recipe) {
        continue;
      }

      selectedCourses.push({ courseType, recipe });
    }

    if (selectedCourses.length === 0) {
      continue;
    }

    bundles.push(
      assembleBundleTemplate({
        bundleIndex,
        courses: selectedCourses,
        pantryIngredientNames,
        cuisine
      })
    );
  }

  return bundles;
}

export async function generateOneMoreBundleTemplate(
  groupId: string,
  request: BundleGenerationRequest,
  pantryIngredientNames: string[],
  existingCount: number,
  excludeIngredients: string[] = [],
  preferences: AggregatedMemberPreferences = EMPTY_MEMBER_PREFERENCES
): Promise<BundleTemplate | undefined> {
  if (isSpoonacularGenerationMockMode()) {
    const templates = getMockGenerationTemplates(groupId);
    return templates[existingCount] ?? templates.at(-1);
  }

  const courseTypes = normalizeCourseTypes(request.courseTypes);
  const cuisine = resolveCuisine(request, preferences);
  const selectedCourses: Array<{
    courseType: BundleCourseType;
    recipe: SpoonacularRecipeInformation;
  }> = [];

  for (const [courseIndex, courseType] of courseTypes.entries()) {
    const recipes = await searchCourseRecipes({
      courseType,
      pantryIngredientNames,
      excludeIngredients,
      preferences,
      cuisine,
      query: request.query
    });
    const recipe = pickRecipe(recipes, existingCount, courseIndex);

    if (recipe) {
      selectedCourses.push({ courseType, recipe });
    }
  }

  if (selectedCourses.length === 0) {
    return undefined;
  }

  return assembleBundleTemplate({
    bundleIndex: existingCount,
    courses: selectedCourses,
    pantryIngredientNames,
    cuisine
  });
}
