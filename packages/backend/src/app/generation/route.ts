import { NextRequest, NextResponse } from "next/server";

import { filterCandidatesByHardConstraints } from "@/lib/constraints/validator";
import { listConstraintsForUsers } from "@/lib/constraints/store";
import type { CandidateBundle } from "@/lib/constraints/types";
import { getCurrentUserId } from "@/lib/http/auth";
import { errorResponse } from "@/lib/http/responses";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCandidateBundle(value: unknown): value is CandidateBundle {
  if (!isRecord(value) || !Array.isArray(value.courses)) {
    return false;
  }

  return value.courses.every((course) => {
    if (!isRecord(course) || typeof course.name !== "string" || !Array.isArray(course.ingredients)) {
      return false;
    }

    return course.ingredients.every(
      (ingredient) =>
        isRecord(ingredient) &&
        typeof ingredient.id === "string" &&
        typeof ingredient.name === "string",
    );
  });
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const currentUserId = getCurrentUserId(request);

  if (!currentUserId) {
    return errorResponse(401, "unauthenticated", "Generation requires an authenticated user.");
  }

  const payload = await readJson(request);

  if (!isRecord(payload) || !Array.isArray(payload.candidates)) {
    return errorResponse(400, "invalidGenerationPayload", "candidates must be an array.");
  }

  if (!payload.candidates.every(isCandidateBundle)) {
    return errorResponse(
      400,
      "invalidGenerationPayload",
      "Each candidate must include courses with ingredients.",
    );
  }

  const groupMemberIds =
    Array.isArray(payload.groupMemberIds) &&
    payload.groupMemberIds.every((memberId) => typeof memberId === "string")
      ? payload.groupMemberIds
      : [currentUserId];

  const { accepted, rejected } = filterCandidatesByHardConstraints(
    payload.candidates,
    listConstraintsForUsers(groupMemberIds),
  );

  for (const rejectedCandidate of rejected) {
    console.info("hardConstraintRejected", {
      candidateId: rejectedCandidate.candidate.id,
      violations: rejectedCandidate.violations,
    });
  }

  return NextResponse.json({
    candidates: accepted,
    rejectedCandidates: rejected,
  });
}
