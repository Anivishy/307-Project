import assert from "node:assert/strict";
import { test } from "node:test";

import { findMissingIngredientIds, searchIngredients } from "../lib/constraints/ingredients.ts";
import { parseConstraintsPayload } from "../lib/constraints/normalize.ts";
import {
  getUserConstraints,
  patchUserConstraints,
  replaceUserConstraints,
  resetConstraintStoreForTests,
} from "../lib/constraints/store.ts";
import type { CandidateBundle } from "../lib/constraints/types.ts";
import {
  filterCandidatesByHardConstraints,
  validateHardConstraints,
} from "../lib/constraints/validator.ts";

test("parseConstraintsPayload normalizes and deduplicates constraint fields", () => {
  const parsed = parseConstraintsPayload(
    {
      allergies: [" Peanuts ", "peanuts", ""],
      medicalRestrictions: ["Low Sodium", " low   sodium "],
      neverIncludeIngredientIds: [" SHRIMP ", "shrimp"],
    },
    { partial: false },
  );

  assert.equal(parsed.ok, true);

  if (parsed.ok) {
    assert.deepEqual(parsed.value.allergies, ["peanuts"]);
    assert.deepEqual(parsed.value.medicalRestrictions, ["low sodium"]);
    assert.deepEqual(parsed.value.neverIncludeIngredientIds, ["shrimp"]);
  }
});

test("constraint store replaces all fields and patches only provided fields", () => {
  resetConstraintStoreForTests();

  replaceUserConstraints("user-1", {
    allergies: ["peanuts"],
    medicalRestrictions: ["gluten"],
    neverIncludeIngredientIds: ["shrimp"],
  });

  patchUserConstraints("user-1", {
    allergies: ["milk"],
  });

  assert.deepEqual(getUserConstraints("user-1").allergies, ["milk"]);
  assert.deepEqual(getUserConstraints("user-1").medicalRestrictions, ["gluten"]);
  assert.deepEqual(getUserConstraints("user-1").neverIncludeIngredientIds, ["shrimp"]);
});

test("ingredient search supports typeahead and invalid id detection", () => {
  assert.equal(searchIngredients("shr").at(0)?.id, "shrimp");
  assert.deepEqual(findMissingIngredientIds(["shrimp", "not-real"]), ["not-real"]);
});

test("validator blocks allergies, medical restrictions, and never-include ingredients", () => {
  const candidate: CandidateBundle = {
    id: "candidate-1",
    courses: [
      {
        name: "Main",
        ingredients: [
          { id: "shrimp", name: "Shrimp", tags: ["shellfish"] },
          { id: "soy-sauce", name: "Soy Sauce", tags: ["soy", "sodium"] },
        ],
      },
    ],
  };

  const result = validateHardConstraints(candidate, [
    {
      userId: "user-1",
      allergies: ["shellfish"],
      medicalRestrictions: ["sodium"],
      neverIncludeIngredientIds: ["shrimp"],
      updatedAt: new Date().toISOString(),
    },
  ]);

  assert.equal(result.allowed, false);
  assert.deepEqual(
    result.violations.map((violation) => violation.constraintType).sort(),
    ["allergy", "medicalRestriction", "neverInclude"],
  );
});

test("filterCandidatesByHardConstraints removes unsafe candidates and keeps safe ones", () => {
  const safeCandidate: CandidateBundle = {
    id: "safe",
    courses: [{ name: "Side", ingredients: [{ id: "rice", name: "Rice" }] }],
  };
  const unsafeCandidate: CandidateBundle = {
    id: "unsafe",
    courses: [{ name: "Main", ingredients: [{ id: "peanuts", name: "Peanuts" }] }],
  };

  const result = filterCandidatesByHardConstraints([safeCandidate, unsafeCandidate], [
    {
      userId: "user-1",
      allergies: ["peanut"],
      medicalRestrictions: [],
      neverIncludeIngredientIds: [],
      updatedAt: new Date().toISOString(),
    },
  ]);

  assert.deepEqual(
    result.accepted.map((candidate) => candidate.id),
    ["safe"],
  );
  assert.deepEqual(
    result.rejected.map((candidate) => candidate.candidate.id),
    ["unsafe"],
  );
});
