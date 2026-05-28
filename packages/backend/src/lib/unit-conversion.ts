const UNIT_ALIASES = new Map<string, string>([
  ['gram', 'g'],
  ['grams', 'g'],
  ['g', 'g'],
  ['kilogram', 'kg'],
  ['kilograms', 'kg'],
  ['kg', 'kg'],
  ['milliliter', 'ml'],
  ['milliliters', 'ml'],
  ['ml', 'ml'],
  ['liter', 'l'],
  ['liters', 'l'],
  ['l', 'l'],
  ['teaspoon', 'tsp'],
  ['teaspoons', 'tsp'],
  ['tsp', 'tsp'],
  ['tablespoon', 'tbsp'],
  ['tablespoons', 'tbsp'],
  ['tbsp', 'tbsp'],
  ['cup', 'cup'],
  ['cups', 'cup']
]);

const UNIT_TO_BASE = new Map<
  string,
  { family: string; factor: number }
>([
  ['g', { family: 'mass', factor: 1 }],
  ['kg', { family: 'mass', factor: 1000 }],
  ['ml', { family: 'volume', factor: 1 }],
  ['l', { family: 'volume', factor: 1000 }],
  ['tsp', { family: 'volume', factor: 4.92892 }],
  ['tbsp', { family: 'volume', factor: 14.7868 }],
  ['cup', { family: 'volume', factor: 236.588 }]
]);

export function normalizeUnit(unit: string) {
  return (
    UNIT_ALIASES.get(unit.trim().toLowerCase()) ??
    unit.trim().toLowerCase()
  );
}

export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string
) {
  const normalizedFromUnit = normalizeUnit(fromUnit);
  const normalizedToUnit = normalizeUnit(toUnit);

  if (normalizedFromUnit === normalizedToUnit) {
    return quantity;
  }

  const from = UNIT_TO_BASE.get(normalizedFromUnit);
  const to = UNIT_TO_BASE.get(normalizedToUnit);

  if (!from || !to || from.family !== to.family) {
    return null;
  }

  return (quantity * from.factor) / to.factor;
}

export function canConvertUnit(
  fromUnit: string,
  toUnit: string
) {
  return convertQuantity(1, fromUnit, toUnit) !== null;
}
