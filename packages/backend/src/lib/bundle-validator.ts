import type {
  BundleIngredient,
  BundleTemplate,
  GroupRecord,
  PantryItem,
} from "./demo-store";

export type MissingIngredientDisclosure = {
  ingredientId: string;
  name: string;
  quantityNeeded: number;
  unit: string;
};

export type ContributorAllocation = {
  userId: string;
  userName: string;
  quantity: number;
  unit: string;
};

export type ValidationReport = {
  isValid: boolean;
  reason: "ok" | "missing_ingredients";
  missingIngredients: MissingIngredientDisclosure[];
};

export type ValidatedBundleCandidate = BundleTemplate & {
  contributorMapping: Record<string, ContributorAllocation[]>;
  missingIngredients: MissingIngredientDisclosure[];
  validationReport: ValidationReport;
};

export type ValidatedCandidateSet = {
  candidates: ValidatedBundleCandidate[];
  filteredOutCandidateCount: number;
};

function buildIngredientDisclosure(ingredient: BundleIngredient): MissingIngredientDisclosure {
  return {
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    quantityNeeded: ingredient.quantity,
    unit: ingredient.unit,
  };
}

function buildContributorMapping(ingredient: BundleIngredient, pantry: PantryItem[]) {
  const matchingItems = pantry
    .filter((item) => item.ingredientId === ingredient.ingredientId && item.unit === ingredient.unit)
    .sort((left, right) => left.ownerName.localeCompare(right.ownerName));

  let remaining = ingredient.quantity;
  const allocations: ContributorAllocation[] = [];

  for (const item of matchingItems) {
    if (remaining <= 0) {
      break;
    }

    const allocationQuantity = Math.min(item.quantity, remaining);
    allocations.push({
      userId: item.ownerUserId,
      userName: item.ownerName,
      quantity: allocationQuantity,
      unit: item.unit,
    });
    remaining -= allocationQuantity;
  }

  return allocations;
}

function validateBundleCandidate(
  template: BundleTemplate,
  pantry: PantryItem[],
  allowMissingIngredients: boolean,
): { visible: boolean; candidate: ValidatedBundleCandidate } {
  const contributorMapping = Object.fromEntries(
    template.ingredientList.map((ingredient) => [
      ingredient.ingredientId,
      buildContributorMapping(ingredient, pantry),
    ]),
  );

  const missingIngredients = template.ingredientList
    .filter((ingredient) => {
      const matchingQuantity = pantry
        .filter((item) => item.ingredientId === ingredient.ingredientId && item.unit === ingredient.unit)
        .reduce((sum, item) => sum + item.quantity, 0);

      return matchingQuantity < ingredient.quantity;
    })
    .map(buildIngredientDisclosure);

  const validationReport: ValidationReport = {
    isValid: allowMissingIngredients || missingIngredients.length === 0,
    reason: missingIngredients.length === 0 ? "ok" : "missing_ingredients",
    missingIngredients,
  };

  const candidate: ValidatedBundleCandidate = {
    ...template,
    contributorMapping,
    missingIngredients,
    validationReport,
    rationale: [
      template.rationale,
      allowMissingIngredients && missingIngredients.length > 0
        ? "Missing items are disclosed so the group can decide whether shopping is worth it."
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };

  return {
    visible: allowMissingIngredients || missingIngredients.length === 0,
    candidate,
  };
}

export function buildValidatedCandidateSet(
  group: GroupRecord,
  templates: BundleTemplate[],
  pantry: PantryItem[],
): ValidatedCandidateSet {
  const results = templates.map((template) =>
    validateBundleCandidate(template, pantry, group.allowMissingIngredients),
  );

  return {
    candidates: results.filter((result) => result.visible).map((result) => result.candidate),
    filteredOutCandidateCount: results.filter((result) => !result.visible).length,
  };
}
