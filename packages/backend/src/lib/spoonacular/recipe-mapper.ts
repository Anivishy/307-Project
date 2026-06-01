import type {
  BundleCourse,
  BundleCourseType,
  BundleIngredient,
  BundleTemplate
} from '../demo-store';
import type { SpoonacularRecipeInformation } from './recipe-client';

function slugifyIngredientId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mapExtendedIngredients(
  recipe: SpoonacularRecipeInformation
): BundleIngredient[] {
  const ingredients = recipe.extendedIngredients ?? [];

  return ingredients.map((ingredient) => ({
    ingredientId: ingredient.id
      ? String(ingredient.id)
      : slugifyIngredientId(ingredient.name),
    name: ingredient.name,
    quantity:
      typeof ingredient.amount === 'number' &&
      Number.isFinite(ingredient.amount)
        ? ingredient.amount
        : 1,
    unit: ingredient.unit?.trim() || 'each'
  }));
}

export function mapRecipeInstructions(
  recipe: SpoonacularRecipeInformation
): string[] {
  const analyzedSteps =
    recipe.analyzedInstructions?.flatMap(
      (section) =>
        section.steps?.map((step) => step.step?.trim() ?? '') ?? []
    ) ?? [];

  const cleanedSteps = analyzedSteps.filter(Boolean);

  if (cleanedSteps.length > 0) {
    return cleanedSteps;
  }

  if (recipe.instructions?.trim()) {
    return [recipe.instructions.replace(/<[^>]+>/g, ' ').trim()];
  }

  return [`Follow the steps for ${recipe.title}.`];
}

export function mapRecipeToCourse(
  recipe: SpoonacularRecipeInformation,
  courseType: BundleCourseType
): BundleCourse {
  return {
    type: courseType,
    title: recipe.title
  };
}

export function assembleBundleTemplate(input: {
  bundleIndex: number;
  courses: Array<{
    courseType: BundleCourseType;
    recipe: SpoonacularRecipeInformation;
  }>;
  pantryIngredientNames: string[];
  cuisine?: string;
}): BundleTemplate {
  const courseTitles = input.courses.map(({ recipe }) => recipe.title);
  const ingredientList = input.courses.flatMap(({ recipe }) =>
    mapExtendedIngredients(recipe)
  );
  const instructions = input.courses.flatMap(({ recipe }) =>
    mapRecipeInstructions(recipe)
  );
  const usedRecipeIds = input.courses
    .map(({ recipe }) => recipe.id)
    .join('-');

  const title =
    courseTitles.length === 1
      ? courseTitles[0]
      : `${courseTitles[0]} + ${courseTitles.length - 1} more`;

  return {
    id: `bundle-spoonacular-${usedRecipeIds}-${input.bundleIndex}`,
    title,
    courses: input.courses.map(({ courseType, recipe }) =>
      mapRecipeToCourse(recipe, courseType)
    ),
    ingredientList,
    instructions,
    rationale: [
      input.cuisine
        ? `Cuisine direction: ${input.cuisine}.`
        : '',
      input.pantryIngredientNames.length > 0
        ? `Built from group pantry ingredients: ${input.pantryIngredientNames.slice(0, 8).join(', ')}.`
        : 'Built from Spoonacular recipe search.',
      `Bundle option ${input.bundleIndex + 1}.`
    ]
      .filter(Boolean)
      .join(' ')
  };
}
