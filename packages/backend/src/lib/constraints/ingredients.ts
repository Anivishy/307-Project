import type { Ingredient, IngredientSummary } from "./types";

const ingredients: Ingredient[] = [
  {
    id: "peanuts",
    name: "Peanuts",
    category: "nuts",
    commonUnits: ["g", "oz", "cup"],
    tags: ["peanut", "nuts", "legume"],
  },
  {
    id: "almonds",
    name: "Almonds",
    category: "nuts",
    commonUnits: ["g", "oz", "cup"],
    tags: ["tree nut", "nuts"],
  },
  {
    id: "shrimp",
    name: "Shrimp",
    category: "seafood",
    commonUnits: ["g", "oz", "lb"],
    tags: ["shellfish", "seafood"],
  },
  {
    id: "wheat-flour",
    name: "Wheat Flour",
    category: "baking",
    commonUnits: ["g", "oz", "cup"],
    tags: ["gluten", "wheat"],
  },
  {
    id: "milk",
    name: "Milk",
    category: "dairy",
    commonUnits: ["ml", "fl oz", "cup"],
    tags: ["dairy", "lactose"],
  },
  {
    id: "soy-sauce",
    name: "Soy Sauce",
    category: "condiment",
    commonUnits: ["ml", "tbsp", "tsp"],
    tags: ["soy", "sodium"],
  },
  {
    id: "eggs",
    name: "Eggs",
    category: "protein",
    commonUnits: ["each"],
    tags: ["egg"],
  },
  {
    id: "chicken",
    name: "Chicken",
    category: "protein",
    commonUnits: ["g", "oz", "lb"],
    tags: ["poultry", "meat"],
  },
  {
    id: "rice",
    name: "Rice",
    category: "grain",
    commonUnits: ["g", "oz", "cup"],
    tags: ["grain", "gluten free"],
  },
  {
    id: "tomato",
    name: "Tomato",
    category: "produce",
    commonUnits: ["g", "oz", "each", "cup"],
    tags: ["vegetable"],
  },
  {
    id: "onion",
    name: "Onion",
    category: "produce",
    commonUnits: ["g", "oz", "each", "cup"],
    tags: ["vegetable"],
  },
  {
    id: "garlic",
    name: "Garlic",
    category: "produce",
    commonUnits: ["clove", "g", "tsp"],
    tags: ["allium"],
  },
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function summarizeIngredient(ingredient: Ingredient): IngredientSummary {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    commonUnits: ingredient.commonUnits,
  };
}

export function listIngredients(): IngredientSummary[] {
  return ingredients.map(summarizeIngredient);
}

export function searchIngredients(query: string, limit = 15): IngredientSummary[] {
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
        ...ingredient.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .slice(0, boundedLimit)
    .map(summarizeIngredient);
}

export function findIngredientById(id: string): IngredientSummary | undefined {
  const ingredient = ingredients.find((item) => item.id === normalizeSearch(id));
  return ingredient ? summarizeIngredient(ingredient) : undefined;
}

export function findMissingIngredientIds(ids: string[]): string[] {
  const validIds = new Set(ingredients.map((ingredient) => ingredient.id));
  return ids.filter((id) => !validIds.has(id));
}
