export type SpoonacularDefinition = {
  value: string;
  label: string;
  description?: string;
};

export type SpoonacularDefinitions = {
  diets: SpoonacularDefinition[];
  intolerances: SpoonacularDefinition[];
  cuisines: SpoonacularDefinition[];
};

const diets: SpoonacularDefinition[] = [
  {
    value: 'gluten free',
    label: 'Gluten Free',
    description:
      'Avoids wheat, barley, rye, and other gluten-containing grains.'
  },
  {
    value: 'ketogenic',
    label: 'Ketogenic',
    description:
      'Targets high fat, moderate protein, and very low carbohydrate recipes.'
  },
  {
    value: 'vegetarian',
    label: 'Vegetarian',
    description: 'Avoids meat and meat by-products.'
  },
  {
    value: 'lacto-vegetarian',
    label: 'Lacto-Vegetarian',
    description: 'Vegetarian and excludes egg.'
  },
  {
    value: 'ovo-vegetarian',
    label: 'Ovo-Vegetarian',
    description: 'Vegetarian and excludes dairy.'
  },
  {
    value: 'vegan',
    label: 'Vegan',
    description:
      'Avoids meat, meat by-products, eggs, dairy, and honey.'
  },
  {
    value: 'pescetarian',
    label: 'Pescetarian',
    description: 'Allows fish but excludes meat and meat by-products.'
  },
  {
    value: 'paleo',
    label: 'Paleo',
    description:
      'Emphasizes meat, fish, eggs, vegetables, oils, fruit, nuts, and sweet potatoes.'
  },
  {
    value: 'primal',
    label: 'Primal',
    description: 'Similar to Paleo, with dairy allowed.'
  },
  {
    value: 'low fodmap',
    label: 'Low FODMAP',
    description:
      'Avoids foods high in fermentable oligo-, di-, mono-saccharides and polyols.'
  },
  {
    value: 'whole30',
    label: 'Whole30',
    description:
      'Avoids added sweeteners, dairy, alcohol, grains, most legumes, and some additives.'
  }
];

const intolerances: SpoonacularDefinition[] = [
  'Dairy',
  'Egg',
  'Gluten',
  'Grain',
  'Peanut',
  'Seafood',
  'Sesame',
  'Shellfish',
  'Soy',
  'Sulfite',
  'Tree Nut',
  'Wheat'
].map((label) => ({
  value: label.toLowerCase(),
  label
}));

const cuisines: SpoonacularDefinition[] = [
  'African',
  'Asian',
  'American',
  'British',
  'Cajun',
  'Caribbean',
  'Chinese',
  'Eastern European',
  'European',
  'French',
  'German',
  'Greek',
  'Indian',
  'Irish',
  'Italian',
  'Japanese',
  'Jewish',
  'Korean',
  'Latin American',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Nordic',
  'Southern',
  'Spanish',
  'Thai',
  'Vietnamese'
].map((label) => ({
  value: label.toLowerCase(),
  label
}));

export function getSpoonacularDefinitions(): SpoonacularDefinitions {
  return {
    diets,
    intolerances,
    cuisines
  };
}

export function listSpoonacularDietValues(): string[] {
  return diets.map((diet) => diet.value);
}

export function listSpoonacularIntoleranceValues(): string[] {
  return intolerances.map((intolerance) => intolerance.value);
}

export function listSpoonacularCuisineValues(): string[] {
  return cuisines.map((cuisine) => cuisine.value);
}
