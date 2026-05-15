import {
  getDefaultStaples,
  getIngredientsById,
  type IngredientNeed,
  type Bundle,
  type DemoGroup,
  type PantryItem
} from './demo-store';

// Candidate validation for US7/US8: apply group missing-ingredient and staples settings
// before returning bundles to the UI.
export type MissingIngredient = {
  ingredientId: string;
  name: string;
  quantityNeeded: number;
  unit: string;
};

export type Contribution = {
  userId: string;
  userName: string;
  quantity: number;
  unit: string;
};

export type CandidateCheck = {
  isValid: boolean;
  reason: 'ok' | 'missing_ingredients';
  missingIngredients: MissingIngredient[];
};

export type BundleCandidate = Bundle & {
  contributorMapping: Record<string, Contribution[]>;
  missingIngredients: MissingIngredient[];
  assumedStaples: Array<{ ingredientId: string; name: string }>;
  validationReport: CandidateCheck;
};

export type CandidateList = {
  candidates: BundleCandidate[];
  filteredOutCandidateCount: number;
};

function missingIngredientFrom(
  need: IngredientNeed
): MissingIngredient {
  return {
    ingredientId: need.ingredientId,
    name: need.name,
    quantityNeeded: need.quantity,
    unit: need.unit
  };
}

function getStapleIds(group: DemoGroup) {
  if (!group.staplesEnabled) {
    return new Set<string>();
  }

  const stapleIds = [
    ...getDefaultStaples().map((item) => item.id),
    ...getIngredientsById(group.customStaples).map(
      (item) => item.id
    )
  ];

  return new Set(stapleIds);
}

function findContributors(
  need: IngredientNeed,
  pantry: PantryItem[],
  stapleIds: Set<string>
) {
  if (stapleIds.has(need.ingredientId)) {
    // Staples are treated as a group-level unlimited source rather than one member's pantry item.
    return [
      {
        userId: 'group-staples',
        userName: 'Group staples',
        quantity: need.quantity,
        unit: need.unit
      }
    ];
  }

  const matchingPantry = pantry
    .filter(
      (item) =>
        item.ingredientId === need.ingredientId &&
        item.unit === need.unit
    )
    .sort((left, right) =>
      left.ownerName.localeCompare(right.ownerName)
    );

  let remaining = need.quantity;
  const contributors: Contribution[] = [];

  for (const item of matchingPantry) {
    if (remaining <= 0) {
      break;
    }

    const amount = Math.min(item.quantity, remaining);
    contributors.push({
      userId: item.ownerUserId,
      userName: item.ownerName,
      quantity: amount,
      unit: item.unit
    });
    remaining -= amount;
  }

  return contributors;
}

function checkBundle(
  group: DemoGroup,
  bundle: Bundle,
  pantry: PantryItem[],
  allowMissingIngredients: boolean
): { visible: boolean; candidate: BundleCandidate } {
  const stapleIds = getStapleIds(group);
  const contributorMapping = Object.fromEntries(
    bundle.ingredientList.map((need) => [
      need.ingredientId,
      findContributors(need, pantry, stapleIds)
    ])
  );

  const assumedStaples = bundle.ingredientList
    .filter((need) => stapleIds.has(need.ingredientId))
    .map((need) => ({
      ingredientId: need.ingredientId,
      name: need.name
    }));

  const missingIngredients = bundle.ingredientList
    .filter((need) => {
      if (stapleIds.has(need.ingredientId)) {
        return false;
      }

      const available = pantry
        .filter(
          (item) =>
            item.ingredientId === need.ingredientId &&
            item.unit === need.unit
        )
        .reduce((sum, item) => sum + item.quantity, 0);

      return available < need.quantity;
    })
    .map(missingIngredientFrom);

  const check: CandidateCheck = {
    isValid:
      allowMissingIngredients ||
      missingIngredients.length === 0,
    reason:
      missingIngredients.length === 0
        ? 'ok'
        : 'missing_ingredients',
    missingIngredients
  };

  const candidate: BundleCandidate = {
    ...bundle,
    contributorMapping,
    missingIngredients,
    assumedStaples,
    validationReport: check,
    rationale: [
      bundle.rationale,
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
    visible:
      allowMissingIngredients ||
      missingIngredients.length === 0,
    candidate
  };
}

export function buildCandidateList(
  group: DemoGroup,
  bundles: Bundle[],
  pantry: PantryItem[]
): CandidateList {
  const checkedBundles = bundles.map((bundle) =>
    checkBundle(
      group,
      bundle,
      pantry,
      group.allowMissingIngredients
    )
  );

  return {
    candidates: checkedBundles
      .filter((result) => result.visible)
      .map((result) => result.candidate),
    filteredOutCandidateCount: checkedBundles.filter(
      (result) => !result.visible
    ).length
  };
}
