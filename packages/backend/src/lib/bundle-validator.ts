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
  reason:
    | 'ok'
    | 'missing_ingredients'
    | 'hard_constraints'
    | 'missing_ingredients_and_hard_constraints';
  missingIngredients: MissingIngredientDisclosure[];
  hardConstraintViolations: ConstraintViolation[];
};

export type ValidatedBundleCandidate = BundleTemplate & {
  contributorMapping: Record<string, ContributorAllocation[]>;
  missingIngredients: MissingIngredientDisclosure[];
  hardConstraintViolations: ConstraintViolation[];
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
        unit: ingredient.unit
      }
    ];
  }

  const matchingItems = pantry
    .filter(
      (item) =>
        item.ingredientId === ingredient.ingredientId &&
        item.unit === ingredient.unit
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

    const allocationQuantity = Math.min(
      item.quantity,
      remaining
    );
    allocations.push({
      userId: item.ownerUserId,
      userName: item.ownerName,
      quantity: allocationQuantity,
      unit: item.unit
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
            item.unit === ingredient.unit
        )
        .reduce((sum, item) => sum + item.quantity, 0);

      return matchingQuantity < ingredient.quantity;
    })
    .map(buildIngredientDisclosure);

  const hardConstraintResult = validateHardConstraints(
    {
      id: template.id,
      courses: [
        {
          id: template.id,
          name: template.title,
          ingredients: template.ingredientList.map(
            (ingredient) => ({
              id: ingredient.ingredientId,
              name: ingredient.name
            })
          )
        }
      ]
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
    hardConstraintViolations: hardConstraintResult.violations
  };

  const candidate: ValidatedBundleCandidate = {
    ...template,
    contributorMapping,
    missingIngredients,
    hardConstraintViolations: hardConstraintResult.violations,
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
    hardConstraintRejectedCount: results.filter(
      (result) =>
        result.candidate.hardConstraintViolations.length > 0
    ).length
  };
}
