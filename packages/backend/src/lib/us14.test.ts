import { beforeEach, describe, expect, it } from "vitest";
import { GET as getBundleCandidates } from "../app/api/groups/[groupId]/bundle-candidates/route";
import { POST as selectBundleCandidate } from "../app/api/groups/[groupId]/bundle-candidates/select/route";
import {
  bumpPantrySnapshotVersion,
  DEMO_ADMIN_USER_ID,
  DEMO_MEMBER_USER_ID,
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
      "x-user-id": userId,
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
    pantrySnapshotVersion: number;
    activeBundleVersion: number;
    candidates: Array<{ id: string; title: string }>;
  }>;
}

describe("US14 admin concurrency", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("stamps candidate sets with pantry and active-bundle versions", async () => {
    const payload = await readCandidateSet();

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

    const response = await selectBundleCandidate(
      createRequest(`http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`, DEMO_ADMIN_USER_ID, {
        method: "POST",
        body: JSON.stringify({
          bundleId,
          pantrySnapshotVersion: payload.pantrySnapshotVersion,
          activeBundleVersion: payload.activeBundleVersion,
        }),
      }),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      selectedBundleId: bundleId,
      activeBundleVersion: payload.activeBundleVersion + 1,
      reservationCount: expect.any(Number),
    });
  });

  it("rejects a second admin using stale active-bundle tokens", async () => {
    const payload = await readCandidateSet();
    const bundleId = payload.candidates[0].id;
    const body = {
      bundleId,
      pantrySnapshotVersion: payload.pantrySnapshotVersion,
      activeBundleVersion: payload.activeBundleVersion,
    };

    await selectBundleCandidate(
      createRequest(`http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`, DEMO_ADMIN_USER_ID, {
        method: "POST",
        body: JSON.stringify(body),
      }),
      createRouteContext(GROUP_ID),
    );

    const staleResponse = await selectBundleCandidate(
      createRequest(`http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`, DEMO_ADMIN_USER_ID, {
        method: "POST",
        body: JSON.stringify(body),
      }),
      createRouteContext(GROUP_ID),
    );

    expect(staleResponse.status).toBe(409);
    await expect(staleResponse.json()).resolves.toMatchObject({
      error: "Candidate set is stale. Refresh or explicitly confirm before selecting.",
    });
  });

  it("rejects stale pantry snapshots before selection", async () => {
    const payload = await readCandidateSet();
    bumpPantrySnapshotVersion(GROUP_ID);

    const response = await selectBundleCandidate(
      createRequest(`http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`, DEMO_ADMIN_USER_ID, {
        method: "POST",
        body: JSON.stringify({
          bundleId: payload.candidates[0].id,
          pantrySnapshotVersion: payload.pantrySnapshotVersion,
          activeBundleVersion: payload.activeBundleVersion,
        }),
      }),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(409);
  });

  it("keeps bundle selection admin-only", async () => {
    const payload = await readCandidateSet();

    const response = await selectBundleCandidate(
      createRequest(`http://localhost/api/groups/${GROUP_ID}/bundle-candidates/select`, DEMO_MEMBER_USER_ID, {
        method: "POST",
        body: JSON.stringify({
          bundleId: payload.candidates[0].id,
          pantrySnapshotVersion: payload.pantrySnapshotVersion,
          activeBundleVersion: payload.activeBundleVersion,
        }),
      }),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(403);
  });
});
