import type {
  CandidateBundle,
  CandidateCourse,
  CandidateIngredient,
  ConstraintType,
  ConstraintViolation,
  HardConstraintValidationResult,
  RejectedCandidate,
  UserConstraints
} from './types';
import { findIngredientDetailsById } from './ingredients';

function normalizeMatch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function matchVariants(value: string): string[] {
  const normalized = normalizeMatch(value);
  const variants = [normalized];

  if (normalized.endsWith('s')) {
    variants.push(normalized.slice(0, -1));
  }

  return variants;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNegativeConstraintDescriptor(
  term: string,
  constraintTerm: string
): boolean {
  const escapedTerm = escapeRegExp(constraintTerm);
  const boundary = '(?:^|[\\s-])';
  const endBoundary = '(?:$|[\\s-])';
  const negativePrefix = new RegExp(
    `${boundary}(?:no|non|without|free(?:\\s+from)?)` +
      `[\\s-]+${escapedTerm}${endBoundary}`
  );
  const freeSuffix = new RegExp(
    `${boundary}${escapedTerm}[\\s-]+free${endBoundary}`
  );

  return negativePrefix.test(term) || freeSuffix.test(term);
}

const ignoredConstraintWords = new Set([
  'allergic',
  'allergy',
  'avoid',
  'avoiding',
  'diet',
  'free',
  'hard',
  'intolerance',
  'intolerant',
  'low',
  'medical',
  'no',
  'non',
  'restriction',
  'restricted'
]);

const constraintAliases: Record<string, string[]> = {
  'dairy free': ['dairy', 'lactose', 'milk'],
  'gluten free': ['gluten', 'wheat'],
  'lactose intolerance': ['lactose', 'dairy', 'milk'],
  'lactose intolerant': ['lactose', 'dairy', 'milk'],
  'low sodium': ['sodium', 'salt'],
  'no sodium': ['sodium', 'salt'],
  'shellfish allergy': ['shellfish', 'shrimp'],
  'tree nut allergy': ['tree nut', 'nuts']
};

function constraintSearchTerms(constraint: string): string[] {
  const normalized = normalizeMatch(constraint);
  const terms = new Set([
    normalized,
    ...(constraintAliases[normalized] ?? [])
  ]);
  const meaningfulWords = normalized
    .split(' ')
    .filter(
      (word) =>
        word.length > 2 && !ignoredConstraintWords.has(word)
    );
  const meaningfulPhrase = meaningfulWords.join(' ');

  if (meaningfulPhrase) {
    terms.add(meaningfulPhrase);
  }

  for (const word of meaningfulWords) {
    terms.add(word);
  }

  return Array.from(terms).flatMap(matchVariants).filter(Boolean);
}

function ingredientTerms(
  ingredient: CandidateIngredient
): Set<string> {
  const catalogIngredient = findIngredientDetailsById(ingredient.id);
  const terms = [
    ingredient.id,
    ingredient.name,
    catalogIngredient?.name,
    catalogIngredient?.category,
    ...(catalogIngredient?.tags ?? []),
    ...(ingredient.tags ?? [])
  ]
    .filter((term): term is string => Boolean(term))
    .flatMap(matchVariants);
  return new Set(terms);
}

function ingredientMatchesText(
  ingredient: CandidateIngredient,
  constraint: string
): boolean {
  const terms = ingredientTerms(ingredient);
  const normalizedName = normalizeMatch(ingredient.name);

  return constraintSearchTerms(constraint).some(
    (constraintTerm) =>
      terms.has(constraintTerm) ||
      (normalizedName.includes(constraintTerm) &&
        !isNegativeConstraintDescriptor(
          normalizedName,
          constraintTerm
        )) ||
      Array.from(terms).some((term) =>
        term.includes(constraintTerm) &&
        !isNegativeConstraintDescriptor(term, constraintTerm)
      )
  );
}

function makeViolation(
  userId: string,
  constraintType: ConstraintType,
  constraintValue: string,
  ingredient: CandidateIngredient,
  course: CandidateCourse
): ConstraintViolation {
  return {
    userId,
    constraintType,
    constraintValue,
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    courseId: course.id,
    courseName: course.name
  };
}

function collectTextViolations(
  userId: string,
  constraintType: 'allergy' | 'medicalRestriction',
  constraints: string[],
  ingredient: CandidateIngredient,
  course: CandidateCourse
): ConstraintViolation[] {
  return constraints
    .filter((constraint) =>
      ingredientMatchesText(ingredient, constraint)
    )
    .map((constraint) =>
      makeViolation(
        userId,
        constraintType,
        constraint,
        ingredient,
        course
      )
    );
}

export function validateHardConstraints(
  candidate: CandidateBundle,
  userConstraints: UserConstraints[]
): HardConstraintValidationResult {
  const violations: ConstraintViolation[] = [];

  for (const course of candidate.courses) {
    for (const ingredient of course.ingredients) {
      for (const constraints of userConstraints) {
        violations.push(
          ...collectTextViolations(
            constraints.userId,
            'allergy',
            constraints.allergies,
            ingredient,
            course
          ),
          ...collectTextViolations(
            constraints.userId,
            'medicalRestriction',
            constraints.medicalRestrictions,
            ingredient,
            course
          )
        );

        const neverIncludeMatch =
          constraints.neverIncludeIngredientIds.find(
            (ingredientId) =>
              normalizeMatch(ingredientId) ===
                normalizeMatch(ingredient.id) ||
              ingredientMatchesText(ingredient, ingredientId)
          );

        if (neverIncludeMatch) {
          violations.push(
            makeViolation(
              constraints.userId,
              'neverInclude',
              neverIncludeMatch,
              ingredient,
              course
            )
          );
        }
      }
    }
  }

  return {
    allowed: violations.length === 0,
    violations
  };
}

export function filterCandidatesByHardConstraints(
  candidates: CandidateBundle[],
  userConstraints: UserConstraints[]
): {
  accepted: CandidateBundle[];
  rejected: RejectedCandidate[];
} {
  const accepted: CandidateBundle[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const candidate of candidates) {
    const result = validateHardConstraints(
      candidate,
      userConstraints
    );

    if (result.allowed) {
      accepted.push(candidate);
    } else {
      rejected.push({
        candidate,
        violations: result.violations
      });
    }
  }

  return { accepted, rejected };
}
