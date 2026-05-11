import { emptyConstraints } from "./normalize.ts";
import type { UserConstraints, UserConstraintsInput } from "./types";

const constraintsByUserId = new Map<string, UserConstraints>();

function nowIso(): string {
  return new Date().toISOString();
}

export function getUserConstraints(userId: string): UserConstraints {
  return constraintsByUserId.get(userId) ?? emptyConstraints(userId);
}

export function replaceUserConstraints(
  userId: string,
  input: UserConstraintsInput,
): UserConstraints {
  const constraints: UserConstraints = {
    userId,
    allergies: input.allergies ?? [],
    medicalRestrictions: input.medicalRestrictions ?? [],
    neverIncludeIngredientIds: input.neverIncludeIngredientIds ?? [],
    updatedAt: nowIso(),
  };

  constraintsByUserId.set(userId, constraints);
  return constraints;
}

export function patchUserConstraints(
  userId: string,
  input: UserConstraintsInput,
): UserConstraints {
  const current = getUserConstraints(userId);
  const next: UserConstraints = {
    ...current,
    ...input,
    updatedAt: nowIso(),
  };

  constraintsByUserId.set(userId, next);
  return next;
}

export function listConstraintsForUsers(userIds: string[]): UserConstraints[] {
  return Array.from(new Set(userIds)).map(getUserConstraints);
}

export function resetConstraintStoreForTests(): void {
  constraintsByUserId.clear();
}
