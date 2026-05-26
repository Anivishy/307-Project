import type { Ingredient, IngredientSummary } from './types';

const ingredients: Ingredient[] = [
  {
    id: 'peanuts',
    name: 'Peanuts',
    category: 'nuts',
    commonUnits: ['g', 'oz', 'cup'],
    tags: ['peanut', 'nuts', 'legume']
  },
  {
    id: 'almonds',
    name: 'Almonds',
    category: 'nuts',
    commonUnits: ['g', 'oz', 'cup'],
    tags: ['tree nut', 'nuts']
  },
  {
    id: 'shrimp',
    name: 'Shrimp',
    category: 'seafood',
    commonUnits: ['g', 'oz', 'lb'],
    tags: ['shellfish', 'seafood']
  },
  {
    id: 'wheat-flour',
    name: 'Wheat Flour',
    category: 'baking',
    commonUnits: ['g', 'oz', 'cup'],
    tags: ['gluten', 'wheat']
  },
  {
    id: 'milk',
    name: 'Milk',
    category: 'dairy',
    commonUnits: ['ml', 'fl oz', 'cup'],
    tags: ['dairy', 'lactose']
  },
  {
    id: 'soy-sauce',
    name: 'Soy Sauce',
    category: 'condiment',
    commonUnits: ['ml', 'tbsp', 'tsp'],
    tags: ['soy', 'sodium']
  },
  {
    id: 'eggs',
    name: 'Eggs',
    category: 'protein',
    commonUnits: ['each'],
    tags: ['egg']
  },
  {
    id: 'chicken',
    name: 'Chicken',
    category: 'protein',
    commonUnits: ['g', 'oz', 'lb'],
    tags: ['poultry', 'meat']
  },
  {
    id: 'chicken-fillets',
    name: 'Chicken Fillets',
    category: 'protein',
    commonUnits: ['fillets', 'g', 'oz', 'lb'],
    tags: ['chicken', 'poultry', 'meat']
  },
  {
    id: 'mushrooms',
    name: 'Mushrooms',
    category: 'produce',
    commonUnits: ['cup', 'g', 'oz'],
    tags: ['mushroom', 'vegetable']
  },
  {
    id: 'cream',
    name: 'Cream',
    category: 'dairy',
    commonUnits: ['cup', 'ml', 'fl oz'],
    tags: ['dairy', 'lactose']
  },
  {
    id: 'rice',
    name: 'Rice',
    category: 'grain',
    commonUnits: ['g', 'oz', 'cup'],
    tags: ['grain', 'gluten free']
  },
  {
    id: 'tomato',
    name: 'Tomato',
    category: 'produce',
    commonUnits: ['g', 'oz', 'each', 'cup'],
    tags: ['vegetable']
  },
  {
    id: 'tomatoes',
    name: 'Tomatoes',
    category: 'produce',
    commonUnits: ['g', 'oz', 'each', 'cup'],
    tags: ['tomato', 'vegetable']
  },
  {
    id: 'onion',
    name: 'Onion',
    category: 'produce',
    commonUnits: ['g', 'oz', 'each', 'cup'],
    tags: ['vegetable']
  },
  {
    id: 'garlic',
    name: 'Garlic',
    category: 'produce',
    commonUnits: ['clove', 'g', 'tsp'],
    tags: ['allium']
  },
  {
    id: 'garlic-cloves',
    name: 'Garlic Cloves',
    category: 'produce',
    commonUnits: ['clove', 'g', 'tsp'],
    tags: ['garlic', 'allium']
  },
  {
    id: 'pasta',
    name: 'Pasta',
    category: 'grain',
    commonUnits: ['box', 'g', 'oz'],
    tags: ['wheat', 'gluten']
  },
  {
    id: 'bread-loaf',
    name: 'Bread Loaf',
    category: 'bakery',
    commonUnits: ['loaf', 'slice'],
    tags: ['bread', 'wheat', 'gluten']
  },
  {
    id: 'salt',
    name: 'Salt',
    category: 'seasoning',
    commonUnits: ['tsp', 'tbsp', 'g'],
    tags: ['sodium']
  },
  {
    id: 'pepper',
    name: 'Pepper',
    category: 'seasoning',
    commonUnits: ['tsp', 'tbsp', 'g'],
    tags: ['black pepper', 'spice']
  },
  {
    id: 'olive-oil',
    name: 'Olive Oil',
    category: 'oil',
    commonUnits: ['tsp', 'tbsp', 'ml'],
    tags: ['fat']
  },
  {
    id: 'butter',
    name: 'Butter',
    category: 'dairy',
    commonUnits: ['tbsp', 'g', 'oz'],
    tags: ['fat', 'dairy']
  },
  {
    id: 'basil-leaves',
    name: 'Basil Leaves',
    category: 'produce',
    commonUnits: ['leaf', 'leaves', 'g'],
    tags: ['basil', 'herb']
  },
  {
    id: 'thyme',
    name: 'Fresh Thyme',
    category: 'produce',
    commonUnits: ['sprig', 'tsp', 'g'],
    tags: ['thyme', 'herb']
  }
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

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

export function searchIngredients(
  query: string,
  limit = 15
): IngredientSummary[] {
  const normalizedQuery = normalizeSearch(query);
  const boundedLimit = Math.max(1, Math.min(limit, 25));

  if (!normalizedQuery) {
    return listIngredients().slice(0, boundedLimit);
  }

  return ingredients
    .filter((ingredient) => {
      const searchableText = [
        ingredient.id,
        ingredient.name,
        ingredient.category,
        ...ingredient.tags
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .slice(0, boundedLimit)
    .map(summarizeIngredient);
}

export function findIngredientById(
  id: string
): IngredientSummary | undefined {
  const ingredient = ingredients.find(
    (item) => item.id === normalizeSearch(id)
  );
  return ingredient
    ? summarizeIngredient(ingredient)
    : undefined;
}

export function findMissingIngredientIds(
  ids: string[]
): string[] {
  const validIds = new Set(
    ingredients.map((ingredient) => ingredient.id)
  );
  return ids.filter((id) => !validIds.has(id));
}
