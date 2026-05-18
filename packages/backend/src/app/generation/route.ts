import { NextRequest, NextResponse } from "next/server";

import { filterCandidatesByHardConstraints } from "@/lib/constraints/validator";
import type { CandidateBundle } from "@/lib/constraints/types";
import { getGroupRecord } from "@/lib/demo-store";
import { getCurrentUserId } from "@/lib/http/auth";
import { errorResponse } from "@/lib/http/responses";
import { listProfileConstraintsForUsers } from "@/lib/profile-constraints-service";

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

function hasOwnProperty(value: object, property: string) {
  return Object.prototype.hasOwnProperty.call(value, property);
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

  if (hasOwnProperty(payload, "groupMemberIds")) {
    return errorResponse(
      400,
      "unsafeConstraintScope",
      "groupMemberIds cannot be supplied by the client; pass groupId so the server can resolve group members.",
    );
  }

  let constraintUserIds = [currentUserId];

  if (typeof payload.groupId === "string") {
    const group = getGroupRecord(payload.groupId);

    if (!group) {
      return errorResponse(404, "groupNotFound", "Group not found.");
    }

    if (!group.members.some((member) => member.userId === currentUserId)) {
      return errorResponse(
        403,
        "notGroupMember",
        "Generation requires membership in the requested group.",
      );
    }

    constraintUserIds = group.members.map((member) => member.userId);
  }

  const { accepted, rejected } = filterCandidatesByHardConstraints(
    payload.candidates,
    await listProfileConstraintsForUsers(constraintUserIds),
  );

  return NextResponse.json({
    candidates: accepted,
    rejectedCandidateCount: rejected.length,
    rejectedCandidates: rejected.map((rejectedCandidate) => ({
      candidateId: rejectedCandidate.candidate.id ?? null,
      reason: "hard_constraints",
      violationCount: rejectedCandidate.violations.length,
    })),
  });
}
