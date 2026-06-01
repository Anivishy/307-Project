import { beforeEach, describe, expect, it } from "vitest";
import { GET as getBundleCandidates, POST as generateInitial } from "../app/api/groups/[groupId]/bundle-candidates/route";
import { POST as generateOneMore } from "../app/api/groups/[groupId]/bundle-candidates/more/route";
import {
  DEMO_ADMIN_USER_ID,
  DEMO_MEMBER_USER_ID,
  resetDemoState,
  updateGroupRecord,
} from "./demo-store";
import { resetCandidateStoreForTests } from "./generation/bundle-candidate-store";

const GROUP_ID = "dorm-dinner-crew";

type Candidate = {
  id: string;
  title: string;
  missingIngredients: unknown[];
  validationReport: { isValid: boolean; reason: string };
};

type CandidateSetResponse = {
  candidates: Candidate[];
  candidateSetId: string;
};

function createRouteContext(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function createGenerateInitialRequest(userId: string) {
  return new Request(
    `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": userId,
      },
      body: JSON.stringify({ courseTypes: ["main", "side"] }),
    },
  );
}

function createGenerateOneMoreRequest(userId: string) {
  return new Request(
    `http://localhost/api/groups/${GROUP_ID}/bundle-candidates/more`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": userId,
      },
    },
  );
}

async function listCandidateIds(userId: string) {
  const response = await getBundleCandidates(
    new Request(
      `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
      {
        headers: { "x-demo-user-id": userId },
      },
    ),
    createRouteContext(GROUP_ID),
  );

  const payload = (await response.json()) as CandidateSetResponse;
  return payload.candidates.map((candidate) => candidate.id);
}

async function seedInitialCandidates() {
  const response = await generateInitial(
    createGenerateInitialRequest(DEMO_ADMIN_USER_ID),
    createRouteContext(GROUP_ID),
  );
  expect(response.status).toBe(200);
  const payload = (await response.json()) as CandidateSetResponse;
  return payload.candidates.map((candidate) => candidate.id);
}

describe("US11 generate one more bundle", () => {
  beforeEach(() => {
    resetDemoState();
    resetCandidateStoreForTests();
    updateGroupRecord(GROUP_ID, { allowMissingIngredients: true });
  });

  it("returns the full candidate set with exactly one new bundle appended", async () => {
    const priorIds = await seedInitialCandidates();
    expect(priorIds.length).toBeGreaterThanOrEqual(1);

    const response = await generateOneMore(
      createGenerateOneMoreRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as CandidateSetResponse;

    expect(payload.candidates).toBeDefined();
    expect(payload.candidates.length).toBe(priorIds.length + 1);

    const returnedIds = payload.candidates.map((c) => c.id);
    for (const priorId of priorIds) {
      expect(returnedIds).toContain(priorId);
    }

    const newCandidate = payload.candidates.find(
      (c) => !priorIds.includes(c.id),
    );
    expect(newCandidate).toBeDefined();
  });

  it("appends the new bundle to the candidate list without resetting prior candidates", async () => {
    const priorIds = await seedInitialCandidates();

    await generateOneMore(
      createGenerateOneMoreRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );

    const updatedIds = await listCandidateIds(DEMO_ADMIN_USER_ID);

    expect(updatedIds.length).toBe(priorIds.length + 1);
    for (const priorId of priorIds) {
      expect(updatedIds).toContain(priorId);
    }
  });

  it("keeps the new bundle accessible and validated via the candidate list", async () => {
    const priorIds = await seedInitialCandidates();

    const response = await generateOneMore(
      createGenerateOneMoreRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );
    const { candidates } = (await response.json()) as CandidateSetResponse;
    const newCandidate = candidates.find((c) => !priorIds.includes(c.id));
    expect(newCandidate).toBeDefined();

    const candidatesResponse = await getBundleCandidates(
      new Request(
        `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
        { headers: { "x-demo-user-id": DEMO_ADMIN_USER_ID } },
      ),
      createRouteContext(GROUP_ID),
    );
    const readPayload = (await candidatesResponse.json()) as CandidateSetResponse;

    const appended = readPayload.candidates.find(
      (item) => item.id === newCandidate!.id,
    );

    expect(appended).toBeDefined();
    expect(appended?.validationReport.isValid).toBe(true);
  });

  it("blocks non-admin members and leaves the candidate list unchanged", async () => {
    const priorIds = await seedInitialCandidates();

    const response = await generateOneMore(
      createGenerateOneMoreRequest(DEMO_MEMBER_USER_ID),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        message: "Only admins can generate additional bundle candidates.",
      },
    });

    const updatedIds = await listCandidateIds(DEMO_ADMIN_USER_ID);
    expect(updatedIds).toEqual(priorIds);
  });

  it("appended bundle is distinct from all prior candidates", async () => {
    const priorIds = await seedInitialCandidates();

    const response = await generateOneMore(
      createGenerateOneMoreRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(200);
    const { candidates } = (await response.json()) as CandidateSetResponse;

    const newIds = candidates
      .map((c) => c.id)
      .filter((id) => !priorIds.includes(id));

    expect(newIds.length).toBe(1);
    expect(priorIds).not.toContain(newIds[0]);

    const allIds = candidates.map((c) => c.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
