import {
  getDefaultStaplesPreset,
  resolveIngredientIds,
  type BundleIngredient,
  type BundleTemplate,
  type GroupRecord,
  type PantryItem,
} from "./demo-store";

// Candidate validation for US7/US8: apply group missing-ingredient and staples settings
// before returning bundles to the UI.
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
  assumedStaples: Array<{ ingredientId: string; name: string }>;
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

function getEnabledStapleIds(group: GroupRecord) {
  if (!group.staplesEnabled) {
    return new Set<string>();
  }

  const stapleIds = [
    ...getDefaultStaplesPreset().map((item) => item.id),
    ...resolveIngredientIds(group.customStaples).map((item) => item.id),
  ];

  return new Set(stapleIds);
}

function buildContributorMapping(
  ingredient: BundleIngredient,
  pantry: PantryItem[],
  enabledStapleIds: Set<string>,
) {
  if (enabledStapleIds.has(ingredient.ingredientId)) {
    // Staples are treated as a group-level unlimited source rather than one member's pantry item.
    return [
      {
        userId: "group-staples",
        userName: "Group staples",
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      },
    ];
  }

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
  group: GroupRecord,
  template: BundleTemplate,
  pantry: PantryItem[],
  allowMissingIngredients: boolean,
): { visible: boolean; candidate: ValidatedBundleCandidate } {
  const enabledStapleIds = getEnabledStapleIds(group);
  const contributorMapping = Object.fromEntries(
    template.ingredientList.map((ingredient) => [
      ingredient.ingredientId,
      buildContributorMapping(ingredient, pantry, enabledStapleIds),
    ]),
  );

  const assumedStaples = template.ingredientList
    .filter((ingredient) => enabledStapleIds.has(ingredient.ingredientId))
    .map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      name: ingredient.name,
    }));

  const missingIngredients = template.ingredientList
    .filter((ingredient) => {
      if (enabledStapleIds.has(ingredient.ingredientId)) {
        return false;
      }

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
    assumedStaples,
    validationReport,
    rationale: [
      template.rationale,
      assumedStaples.length > 0
        ? `Assumed staples: ${assumedStaples.map((item) => item.name).join(", ")}.`
        : "",
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

export function buildValidatedCandidateSet(group: GroupRecord, templates: BundleTemplate[], pantry: PantryItem[]): ValidatedCandidateSet {
  const results = templates.map((template) =>
    validateBundleCandidate(group, template, pantry, group.allowMissingIngredients),
  );

  return {
    candidates: results.filter((result) => result.visible).map((result) => result.candidate),
    filteredOutCandidateCount: results.filter((result) => !result.visible).length,
  };
}
