import { beforeEach, describe, expect, it } from "vitest";
import { GET as getBundleCandidates } from "../app/api/groups/[groupId]/bundle-candidates/route";
import { POST as selectBundleCandidate } from "../app/api/groups/[groupId]/bundle-candidates/select/route";
import {
  bumpPantrySnapshotVersion,
  DEMO_ADMIN_USER_ID,
  DEMO_MEMBER_USER_ID,
  getGroupRecord,
  replaceActiveBundle,
  resetDemoState,
} from "./demo-store";

const GROUP_ID = "dorm-dinner-crew";

function createRouteContext(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function createRequest(url: string, userId: string, init?: RequestInit) {
  return new Request(url, {
    headers: {
      "content-type": "application/json",
      "x-demo-user-id": userId,
      ...(init?.headers ?? {}),
    },
    ...init,
  });
}

async function readCandidateSet() {
  const response = await getBundleCandidates(
    createRequest(
      `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
      DEMO_ADMIN_USER_ID,
    ),
    createRouteContext(GROUP_ID),
  );

  expect(response.status).toBe(200);
  return response.json() as Promise<{
    candidateSetId: string;
    pantrySnapshotVersion: number;
    activeBundleVersion: number;
    candidates: Array<{
      id: string;
      title: string;
      pantrySnapshotVersion: number;
      activeBundleVersion: number;
    }>;
  }>;
}

function buildSelectionBody(
  payload: Awaited<ReturnType<typeof readCandidateSet>>,
  bundleId = payload.candidates[0].id,
) {
  return {
    bundleId,
    pantrySnapshotVersion: payload.pantrySnapshotVersion,
    activeBundleVersion: payload.activeBundleVersion,
  };
}

function postBundleSelection(
  userId: string,
  body: Record<string, unknown>,
) {
  return selectBundleCandidate(
    createRequest(`http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`, userId, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    createRouteContext(GROUP_ID),
  );
}

describe("US14 admin concurrency", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("stamps candidate sets with pantry and active-bundle versions", async () => {
    const payload = await readCandidateSet();

    expect(payload.candidateSetId).toBe("dorm-dinner-crew:3:1");
    expect(payload.pantrySnapshotVersion).toBe(3);
    expect(payload.activeBundleVersion).toBe(1);
    expect(payload.candidates[0]).toMatchObject({
      pantrySnapshotVersion: 3,
      activeBundleVersion: 1,
    });
  });

  it("selects a fresh bundle and increments the active-bundle version", async () => {
    const payload = await readCandidateSet();
    const bundleId = payload.candidates[0].id;

    const response = await postBundleSelection(
      DEMO_ADMIN_USER_ID,
      buildSelectionBody(payload, bundleId),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      selectedBundleId: bundleId,
      activeBundleVersion: payload.activeBundleVersion + 1,
      reservationCount: expect.any(Number),
      releasedReservationCount: 0,
      appliedReservationCount: expect.any(Number),
    });
  });

  it("accepts one repeated admin selection and rejects the stale twin without double-applying reservations", async () => {
    const payload = await readCandidateSet();
    const bundleId = payload.candidates[0].id;
    const body = buildSelectionBody(payload, bundleId);

    const [firstResponse, secondResponse] = await Promise.all([
      postBundleSelection(DEMO_ADMIN_USER_ID, body),
      postBundleSelection(DEMO_ADMIN_USER_ID, body),
    ]);

    const successResponse = [firstResponse, secondResponse].find(
      (response) => response.status === 200,
    );
    const staleResponse = [firstResponse, secondResponse].find(
      (response) => response.status === 409,
    );

    if (!successResponse || !staleResponse) {
      throw new Error("Expected one successful selection and one stale rejection.");
    }

    const successPayload = await successResponse.json();
    const group = getGroupRecord(GROUP_ID);

    expect(successPayload).toMatchObject({
      selectedBundleId: bundleId,
      activeBundleVersion: payload.activeBundleVersion + 1,
    });
    expect(group?.activeBundleVersion).toBe(payload.activeBundleVersion + 1);
    expect(group?.selectedBundleId).toBe(bundleId);
    expect(group?.activeReservations).toHaveLength(successPayload.reservationCount);
    expect(staleResponse.status).toBe(409);
    await expect(staleResponse.json()).resolves.toMatchObject({
      error: {
        code: "staleCandidate",
        message: "Candidate set is stale. Refresh or explicitly confirm before selecting.",
        details: {
          submitted: {
            pantrySnapshotVersion: payload.pantrySnapshotVersion,
            activeBundleVersion: payload.activeBundleVersion,
          },
          current: {
            pantrySnapshotVersion: payload.pantrySnapshotVersion,
            activeBundleVersion: payload.activeBundleVersion + 1,
          },
          stalePantrySnapshot: false,
          staleActiveBundle: true,
        },
      },
    });
  });

  it("rejects stale pantry snapshots before selection", async () => {
    const payload = await readCandidateSet();
    bumpPantrySnapshotVersion(GROUP_ID);

    const response = await postBundleSelection(
      DEMO_ADMIN_USER_ID,
      buildSelectionBody(payload),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "staleCandidate",
        details: {
          submitted: {
            pantrySnapshotVersion: payload.pantrySnapshotVersion,
            activeBundleVersion: payload.activeBundleVersion,
          },
          current: {
            pantrySnapshotVersion: payload.pantrySnapshotVersion + 1,
            activeBundleVersion: payload.activeBundleVersion,
          },
          stalePantrySnapshot: true,
          staleActiveBundle: false,
        },
      },
    });
  });

  it("allows explicit confirm override after a stale pantry snapshot", async () => {
    const payload = await readCandidateSet();
    const bundleId = payload.candidates[0].id;
    bumpPantrySnapshotVersion(GROUP_ID);

    const response = await postBundleSelection(DEMO_ADMIN_USER_ID, {
      ...buildSelectionBody(payload, bundleId),
      force: true,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      selectedBundleId: bundleId,
      forced: true,
    });
  });

  it("rolls back reservation replacement if applying a new bundle fails", () => {
    const oldReservations = [
      {
        bundleId: "bundle-old",
        ingredientId: "tomatoes",
        name: "Tomatoes",
        quantity: 2,
        unit: "whole",
        sourceUserId: DEMO_ADMIN_USER_ID,
        sourceName: "Vinayak",
      },
    ];

    const initial = replaceActiveBundle(GROUP_ID, "bundle-old", oldReservations);
    expect(initial).toMatchObject({
      releasedBundleId: null,
      releasedReservationCount: 0,
      appliedReservationCount: oldReservations.length,
    });

    const beforeFailure = getGroupRecord(GROUP_ID);

    expect(() =>
      replaceActiveBundle(
        GROUP_ID,
        "bundle-new",
        [
          {
            bundleId: "bundle-new",
            ingredientId: "cream",
            name: "Cream",
            quantity: 1,
            unit: "cups",
            sourceUserId: DEMO_MEMBER_USER_ID,
            sourceName: "Kartik",
          },
        ],
        { simulateFailureAfterRelease: true },
      ),
    ).toThrow("Simulated bundle replacement failure.");

    expect(getGroupRecord(GROUP_ID)).toEqual(beforeFailure);
  });

  it("keeps bundle selection admin-only", async () => {
    const payload = await readCandidateSet();

    const response = await postBundleSelection(
      DEMO_MEMBER_USER_ID,
      buildSelectionBody(payload),
    );

    expect(response.status).toBe(403);
  });
});
