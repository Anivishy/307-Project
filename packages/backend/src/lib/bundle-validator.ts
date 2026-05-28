import {
  getDefaultStaplesPreset,
  resolveIngredientIds,
  type BundleIngredient,
  type BundleTemplate,
  type GroupRecord,
  type PantryItem
} from './demo-store';
import type {
  ConstraintViolation,
  UserConstraints
} from './constraints/types';
import { validateHardConstraints } from './constraints/validator';
import { convertQuantity } from './unit-conversion';

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
  sourceQuantity: number;
  sourceUnit: string;
};

export type UnsupportedUnitConversion = {
  ingredientId: string;
  name: string;
  requestedUnit: string;
  sourceUnit: string;
  ownerName: string;
};

export type ValidationReport = {
  isValid: boolean;
  reason:
    | 'ok'
    | 'missing_ingredients'
    | 'hard_constraints'
    | 'missing_ingredients_and_hard_constraints';
  missingIngredients: MissingIngredientDisclosure[];
  hardConstraintViolations: ConstraintViolation[];
  unsupportedUnitConversions: UnsupportedUnitConversion[];
};

export type ValidatedBundleCandidate = BundleTemplate & {
  contributorMapping: Record<string, ContributorAllocation[]>;
  missingIngredients: MissingIngredientDisclosure[];
  hardConstraintViolations: ConstraintViolation[];
  unsupportedUnitConversions: UnsupportedUnitConversion[];
  assumedStaples: Array<{ ingredientId: string; name: string }>;
  validationReport: ValidationReport;
};

export type ValidatedCandidateSet = {
  candidates: ValidatedBundleCandidate[];
  filteredOutCandidateCount: number;
  hardConstraintRejectedCount: number;
};

function buildIngredientDisclosure(
  ingredient: BundleIngredient
): MissingIngredientDisclosure {
  return {
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    quantityNeeded: ingredient.quantity,
    unit: ingredient.unit
  };
}

function getEnabledStapleIds(group: GroupRecord) {
  if (!group.staplesEnabled) {
    return new Set<string>();
  }

  const stapleIds = [
    ...getDefaultStaplesPreset().map((item) => item.id),
    ...resolveIngredientIds(group.customStaples).map(
      (item) => item.id
    )
  ];

  return new Set(stapleIds);
}

function buildContributorMapping(
  ingredient: BundleIngredient,
  pantry: PantryItem[],
  enabledStapleIds: Set<string>
) {
  if (enabledStapleIds.has(ingredient.ingredientId)) {
    // Staples are treated as a group-level unlimited source rather than one member's pantry item.
    return [
      {
        userId: 'group-staples',
        userName: 'Group staples',
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        sourceQuantity: ingredient.quantity,
        sourceUnit: ingredient.unit
      }
    ];
  }

  const matchingItems = pantry
    .filter(
      (item) =>
        item.ingredientId === ingredient.ingredientId &&
        convertQuantity(
          item.quantity,
          item.unit,
          ingredient.unit
        ) !== null
    )
    .sort((left, right) =>
      left.ownerName.localeCompare(right.ownerName)
    );

  let remaining = ingredient.quantity;
  const allocations: ContributorAllocation[] = [];

  for (const item of matchingItems) {
    if (remaining <= 0) {
      break;
    }

    const availableQuantity =
      convertQuantity(
        item.quantity,
        item.unit,
        ingredient.unit
      ) ?? 0;
    const allocationQuantity = Math.min(
      availableQuantity,
      remaining
    );
    const sourceQuantity =
      convertQuantity(
        allocationQuantity,
        ingredient.unit,
        item.unit
      ) ?? allocationQuantity;
    allocations.push({
      userId: item.ownerUserId,
      userName: item.ownerName,
      quantity: allocationQuantity,
      unit: ingredient.unit,
      sourceQuantity,
      sourceUnit: item.unit
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
  userConstraints: UserConstraints[]
): { visible: boolean; candidate: ValidatedBundleCandidate } {
  const enabledStapleIds = getEnabledStapleIds(group);
  const contributorMapping = Object.fromEntries(
    template.ingredientList.map((ingredient) => [
      ingredient.ingredientId,
      buildContributorMapping(
        ingredient,
        pantry,
        enabledStapleIds
      )
    ])
  );

  const assumedStaples = template.ingredientList
    .filter((ingredient) =>
      enabledStapleIds.has(ingredient.ingredientId)
    )
    .map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      name: ingredient.name
    }));

  const missingIngredients = template.ingredientList
    .filter((ingredient) => {
      if (enabledStapleIds.has(ingredient.ingredientId)) {
        return false;
      }

      const matchingQuantity = pantry
        .filter(
          (item) =>
            item.ingredientId === ingredient.ingredientId &&
            convertQuantity(
              item.quantity,
              item.unit,
              ingredient.unit
            ) !== null
        )
        .reduce(
          (sum, item) =>
            sum +
            (convertQuantity(
              item.quantity,
              item.unit,
              ingredient.unit
            ) ?? 0),
          0
        );

      return matchingQuantity < ingredient.quantity;
    })
    .map(buildIngredientDisclosure);

  const unsupportedUnitConversions =
    template.ingredientList.flatMap((ingredient) =>
      pantry
        .filter(
          (item) =>
            item.ingredientId === ingredient.ingredientId &&
            convertQuantity(
              item.quantity,
              item.unit,
              ingredient.unit
            ) === null
        )
        .map((item) => ({
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          requestedUnit: ingredient.unit,
          sourceUnit: item.unit,
          ownerName: item.ownerName
        }))
    );

  // Map each actual course from the template so violation reports name the correct course
  // rather than attributing everything to a synthetic bundle-level course.
  const hardConstraintResult = validateHardConstraints(
    {
      id: template.id,
      courses: template.courses.map((course, index) => ({
        id: `${template.id}-course-${index}`,
        name: course.title,
        ingredients: template.ingredientList.map(
          (ingredient) => ({
            id: ingredient.ingredientId,
            name: ingredient.name
          })
        )
      }))
    },
    userConstraints
  );

  const hasMissingIngredients = missingIngredients.length > 0;
  const hasHardConstraintViolations =
    !hardConstraintResult.allowed;
  const isVisible =
    (allowMissingIngredients || !hasMissingIngredients) &&
    !hasHardConstraintViolations;

  const validationReport: ValidationReport = {
    isValid: isVisible,
    reason:
      hasMissingIngredients && hasHardConstraintViolations
        ? 'missing_ingredients_and_hard_constraints'
        : hasHardConstraintViolations
          ? 'hard_constraints'
          : hasMissingIngredients
            ? 'missing_ingredients'
            : 'ok',
    missingIngredients,
    hardConstraintViolations: hardConstraintResult.violations,
    unsupportedUnitConversions
  };

  const candidate: ValidatedBundleCandidate = {
    ...template,
    contributorMapping,
    missingIngredients,
    hardConstraintViolations: hardConstraintResult.violations,
    unsupportedUnitConversions,
    assumedStaples,
    validationReport,
    rationale: [
      template.rationale,
      assumedStaples.length > 0
        ? `Assumed staples: ${assumedStaples.map((item) => item.name).join(', ')}.`
        : '',
      allowMissingIngredients && missingIngredients.length > 0
        ? 'Missing items are disclosed so the group can decide whether shopping is worth it.'
        : ''
    ]
      .filter(Boolean)
      .join(' ')
  };

  return {
    visible: isVisible,
    candidate
  };
}

export function buildValidatedCandidateSet(
  group: GroupRecord,
  templates: BundleTemplate[],
  pantry: PantryItem[],
  userConstraints: UserConstraints[] = []
): ValidatedCandidateSet {
  const results = templates.map((template) =>
    validateBundleCandidate(
      group,
      template,
      pantry,
      group.allowMissingIngredients,
      userConstraints
    )
  );

  return {
    candidates: results
      .filter((result) => result.visible)
      .map((result) => result.candidate),
    filteredOutCandidateCount: results.filter(
      (result) => !result.visible
    ).length,
    // Only count bundles where hard constraints are the sole reason for rejection,
    // so this number does not overlap with filteredOutCandidateCount.
    hardConstraintRejectedCount: results.filter(
      (result) =>
        result.candidate.hardConstraintViolations.length > 0 &&
        result.candidate.missingIngredients.length === 0
    ).length
  };
}
