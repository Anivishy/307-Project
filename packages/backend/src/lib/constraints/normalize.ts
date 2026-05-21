import type { UserConstraints, UserConstraintsInput } from "./types";

export type ParseConstraintsResult =
  | { ok: true; value: UserConstraintsInput }
  | { ok: false; issues: string[] };

const constraintFields = [
  "allergies",
  "medicalRestrictions",
  "neverIncludeIngredientIds",
] as const;

type ConstraintField = (typeof constraintFields)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeConstraintToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeList(values: string[]): string[] {
  return Array.from(
    new Set(values.map(normalizeConstraintToken).filter(Boolean)),
  );
}

function listIssue(field: ConstraintField): string {
  return `${field} must be an array of strings`;
}

export function normalizeTextConstraints(values: string[] = []): string[] {
  return normalizeList(values);
}

export function normalizeIngredientIds(values: string[] = []): string[] {
  return normalizeList(values);
}

export function emptyConstraints(userId: string): UserConstraints {
  return {
    userId,
    allergies: [],
    medicalRestrictions: [],
    neverIncludeIngredientIds: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function parseConstraintsPayload(
  payload: unknown,
  options: { partial: boolean },
): ParseConstraintsResult {
  if (!isRecord(payload)) {
    return { ok: false, issues: ["Payload must be a JSON object"] };
  }

  const source = isRecord(payload.constraints) ? payload.constraints : payload;
  const value: UserConstraintsInput = {};
  const issues: string[] = [];

  for (const field of constraintFields) {
    const hasField = Object.prototype.hasOwnProperty.call(source, field);

    if (!hasField) {
      if (!options.partial) {
        value[field] = [];
      }
      continue;
    }

    const rawValue = source[field];
    if (!Array.isArray(rawValue) || rawValue.some((item) => typeof item !== "string")) {
      issues.push(listIssue(field));
      continue;
    }

    value[field] =
      field === "neverIncludeIngredientIds"
        ? normalizeIngredientIds(rawValue)
        : normalizeTextConstraints(rawValue);
  }

  if (options.partial && Object.keys(value).length === 0 && issues.length === 0) {
    issues.push("At least one constraint field must be provided");
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value };
}
