export type SpoonacularAutocompleteItem = {
  id: number;
  name: string;
  image?: string;
  imageType?: string;
};

export type SpoonacularIngredientInformation = {
  id: number;
  name: string;
  image?: string;
  aisle?: string;
  category?: string;
  possibleUnits?: string[];
};

export type CatalogIngredient = {
  id: string;
  spoonacularId: number;
  name: string;
  category: string;
  commonUnits: string[];
  image?: string;
};

export type CatalogSearchResult = {
  ingredients: CatalogIngredient[];
  source: 'spoonacular' | 'mock';
};
