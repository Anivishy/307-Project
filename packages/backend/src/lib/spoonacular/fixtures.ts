import type {
  CatalogIngredient,
  SpoonacularAutocompleteItem,
  SpoonacularIngredientInformation
} from './types';

const fixtureCatalog: CatalogIngredient[] = [
  {
    id: '4053',
    spoonacularId: 4053,
    name: 'Olive Oil',
    category: 'oil',
    commonUnits: ['tsp', 'tbsp', 'ml']
  },
  {
    id: '1001',
    spoonacularId: 1001,
    name: 'Butter',
    category: 'dairy',
    commonUnits: ['tbsp', 'g', 'oz']
  },
  {
    id: '2047',
    spoonacularId: 2047,
    name: 'Salt',
    category: 'seasoning',
    commonUnits: ['tsp', 'tbsp', 'g']
  },
  {
    id: '1002030',
    spoonacularId: 1002030,
    name: 'Pepper',
    category: 'seasoning',
    commonUnits: ['tsp', 'tbsp', 'g']
  },
  {
    id: '1123367',
    spoonacularId: 1123367,
    name: 'Rice',
    category: 'grain',
    commonUnits: ['g', 'oz', 'cup']
  },
  {
    id: '11529',
    spoonacularId: 11529,
    name: 'Tomatoes',
    category: 'produce',
    commonUnits: ['g', 'oz', 'each', 'cup']
  },
  {
    id: '5062',
    spoonacularId: 5062,
    name: 'Chicken',
    category: 'protein',
    commonUnits: ['g', 'oz', 'lb']
  },
  {
    id: '11215',
    spoonacularId: 11215,
    name: 'Garlic',
    category: 'produce',
    commonUnits: ['clove', 'g', 'tsp']
  },
  {
    id: '11282',
    spoonacularId: 11282,
    name: 'Onion',
    category: 'produce',
    commonUnits: ['g', 'oz', 'each', 'cup']
  },
  {
    id: '15152',
    spoonacularId: 15152,
    name: 'Shrimp',
    category: 'seafood',
    commonUnits: ['g', 'oz', 'lb']
  },
  {
    id: '16058',
    spoonacularId: 16058,
    name: 'Peanuts',
    category: 'nuts',
    commonUnits: ['g', 'oz', 'cup']
  },
  {
    id: '1077',
    spoonacularId: 1077,
    name: 'Milk',
    category: 'dairy',
    commonUnits: ['ml', 'fl oz', 'cup']
  },
  {
    id: '20081',
    spoonacularId: 20081,
    name: 'Wheat Flour',
    category: 'baking',
    commonUnits: ['g', 'oz', 'cup']
  },
  {
    id: '1123',
    spoonacularId: 1123,
    name: 'Egg',
    category: 'protein',
    commonUnits: ['each']
  },
  {
    id: '2044',
    spoonacularId: 2044,
    name: 'Pasta',
    category: 'grain',
    commonUnits: ['g', 'oz', 'box']
  }
];

const catalogById = new Map(
  fixtureCatalog.map((item) => [item.id, item])
);

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function listFixtureCatalog(limit = 25): CatalogIngredient[] {
  return [...catalogById.values()].slice(0, Math.max(1, limit));
}

export function searchFixtureCatalog(
  query: string,
  limit = 15
): CatalogIngredient[] {
  const normalizedQuery = normalizeSearch(query);
  const boundedLimit = Math.max(1, Math.min(limit, 25));

  if (!normalizedQuery) {
    return listFixtureCatalog(boundedLimit);
  }

  return [...catalogById.values()]
    .filter((item) => {
      const searchableText = [item.id, item.name, item.category]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .slice(0, boundedLimit);
}

export function findFixtureCatalogIngredientById(
  id: string
): CatalogIngredient | undefined {
  return catalogById.get(id.trim());
}

export function findMissingFixtureCatalogIds(ids: string[]) {
  return ids.filter((id) => !catalogById.has(id.trim()));
}

export function toFixtureAutocompleteItems(
  ingredients: CatalogIngredient[]
): SpoonacularAutocompleteItem[] {
  return ingredients.map((ingredient) => ({
    id: ingredient.spoonacularId,
    name: ingredient.name
  }));
}

export function toFixtureIngredientInformation(
  ingredient: CatalogIngredient
): SpoonacularIngredientInformation {
  return {
    id: ingredient.spoonacularId,
    name: ingredient.name,
    aisle: ingredient.category,
    category: ingredient.category,
    possibleUnits: ingredient.commonUnits
  };
}
