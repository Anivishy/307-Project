// Deprecated static ingredient catalog. Use ingredient-catalog-service instead.
// Kept temporarily for bundle validation demos that still reference slug ids/tags.

import type { Ingredient, IngredientSummary } from './types';

const ingredients: Ingredient[] = [
  {
    id: '15152',
    name: 'Shrimp',
    category: 'seafood',
    commonUnits: ['g', 'oz', 'lb'],
    tags: ['shellfish', 'seafood']
  },
  {
    id: '16058',
    name: 'Peanuts',
    category: 'nuts',
    commonUnits: ['g', 'oz', 'cup'],
    tags: ['peanut', 'nuts', 'legume']
  },
  {
    id: '20081',
    name: 'Wheat Flour',
    category: 'baking',
    commonUnits: ['g', 'oz', 'cup'],
    tags: ['gluten', 'wheat']
  },
  {
    id: '1077',
    name: 'Milk',
    category: 'dairy',
    commonUnits: ['ml', 'fl oz', 'cup'],
    tags: ['dairy', 'lactose']
  },
  {
    id: '1123367',
    name: 'Rice',
    category: 'grain',
    commonUnits: ['g', 'oz', 'cup'],
    tags: ['grain', 'gluten free']
  },
  {
    id: '2044',
    name: 'Pasta',
    category: 'grain',
    commonUnits: ['box', 'g', 'oz'],
    tags: ['wheat', 'gluten']
  }
];

function summarizeIngredient(
  ingredient: Ingredient
): IngredientSummary {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    commonUnits: ingredient.commonUnits
  };
}

export function listIngredients(): IngredientSummary[] {
  return ingredients.map(summarizeIngredient);
}

export function findIngredientById(
  id: string
): IngredientSummary | undefined {
  const ingredient = ingredients.find((item) => item.id === id.trim());
  return ingredient ? summarizeIngredient(ingredient) : undefined;
}
