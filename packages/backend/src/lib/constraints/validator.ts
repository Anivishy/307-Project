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
import { normalizeConstraintToken } from './normalize';

function matchVariants(value: string): string[] {
  const normalized = normalizeConstraintToken(value);
  const variants = [normalized];

  if (normalized.endsWith('s')) {
    variants.push(normalized.slice(0, -1));
  }

  return variants;
}

function ingredientTerms(
  ingredient: CandidateIngredient
): Set<string> {
  const terms = [
    ingredient.id,
    ingredient.name,
    ...(ingredient.tags ?? [])
  ].flatMap(matchVariants);
  return new Set(terms.filter(Boolean));
}

function ingredientMatchesText(
  ingredient: CandidateIngredient,
  constraint: string
): boolean {
  const normalizedConstraint = normalizeConstraintToken(constraint);
  const terms = ingredientTerms(ingredient);
  const normalizedName = normalizeConstraintToken(ingredient.name);

  return (
    terms.has(normalizedConstraint) ||
    normalizedName.includes(normalizedConstraint) ||
    Array.from(terms).some((term) =>
      term.includes(normalizedConstraint)
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
              normalizeConstraintToken(ingredientId) ===
                normalizeConstraintToken(ingredient.id) ||
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
