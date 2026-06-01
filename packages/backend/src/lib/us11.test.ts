import { beforeEach, describe, expect, it } from "vitest";
import { GET as getBundleCandidates } from "../app/api/groups/[groupId]/bundle-candidates/route";
import { POST as generateOne } from "../app/api/groups/[groupId]/bundle-candidates/generate-one/route";
import {
  DEMO_ADMIN_USER_ID,
  DEMO_MEMBER_USER_ID,
  resetDemoState,
} from "./demo-store";

const GROUP_ID = "dorm-dinner-crew";

type Candidate = {
  id: string;
  title: string;
  missingIngredients: unknown[];
  validationReport: { isValid: boolean; reason: string };
};

function createRouteContext(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function createRequest(userId: string, init?: RequestInit) {
  return new Request(
    `http://localhost/api/groups/${GROUP_ID}/bundle-candidates/generate-one`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-user-id": userId,
        ...(init?.headers ?? {}),
      },
      ...init,
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

  const payload = (await response.json()) as { candidates: Candidate[] };
  return payload.candidates.map((candidate) => candidate.id);
}

describe("US11 generate one more bundle", () => {
  beforeEach(() => {
    resetDemoState();
  });

  it("returns exactly one new validated bundle", async () => {
    const priorIds = await listCandidateIds(DEMO_ADMIN_USER_ID);

    const response = await generateOne(
      createRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      candidate?: Candidate;
      candidates?: unknown;
    };

    // The endpoint returns a single new bundle, not the whole candidate set.
    expect(payload.candidates).toBeUndefined();
    expect(payload.candidate).toBeDefined();
    expect(priorIds).not.toContain(payload.candidate?.id);
    expect(payload.candidate?.validationReport.isValid).toBe(true);
    expect(payload.candidate?.validationReport.reason).toBe("ok");
    expect(payload.candidate?.missingIngredients).toEqual([]);
  });

  it("appends the new bundle to the candidate list without resetting prior candidates", async () => {
    const priorIds = await listCandidateIds(DEMO_ADMIN_USER_ID);

    const response = await generateOne(
      createRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );
    const { candidate } = (await response.json()) as { candidate: Candidate };

    const updatedIds = await listCandidateIds(DEMO_ADMIN_USER_ID);

    // Prior candidates remain present and in their original order, with the new
    // bundle appended to the end of the list.
    expect(updatedIds).toEqual([...priorIds, candidate.id]);
  });

  it("keeps the new bundle accessible and validated via the candidate list", async () => {
    const response = await generateOne(
      createRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );
    const { candidate } = (await response.json()) as { candidate: Candidate };

    const candidatesResponse = await getBundleCandidates(
      new Request(
        `http://localhost/api/groups/${GROUP_ID}/bundle-candidates`,
        { headers: { "x-demo-user-id": DEMO_ADMIN_USER_ID } },
      ),
      createRouteContext(GROUP_ID),
    );
    const payload = (await candidatesResponse.json()) as {
      candidates: Candidate[];
    };

    const appended = payload.candidates.find(
      (item) => item.id === candidate.id,
    );

    // The appended bundle passes the same validation pipeline as full generation.
    expect(appended).toBeDefined();
    expect(appended?.validationReport.isValid).toBe(true);
    expect(appended?.missingIngredients).toEqual([]);
  });

  it("blocks non-admin members and leaves the candidate list unchanged", async () => {
    const priorIds = await listCandidateIds(DEMO_ADMIN_USER_ID);

    const response = await generateOne(
      createRequest(DEMO_MEMBER_USER_ID),
      createRouteContext(GROUP_ID),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        message: "Only admins can generate additional bundles.",
      },
    });

    const updatedIds = await listCandidateIds(DEMO_ADMIN_USER_ID);
    expect(updatedIds).toEqual(priorIds);
  });

  it("appends distinct bundles on repeated calls and reports when the pool is exhausted", async () => {
    const generatedIds: string[] = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await generateOne(
        createRequest(DEMO_ADMIN_USER_ID),
        createRouteContext(GROUP_ID),
      );

      expect(response.status).toBe(200);
      const { candidate } = (await response.json()) as { candidate: Candidate };
      generatedIds.push(candidate.id);
    }

    // Each generate-one call yields a brand-new, distinct bundle.
    expect(new Set(generatedIds).size).toBe(generatedIds.length);

    const exhaustedResponse = await generateOne(
      createRequest(DEMO_ADMIN_USER_ID),
      createRouteContext(GROUP_ID),
    );

    expect(exhaustedResponse.status).toBe(409);
    await expect(exhaustedResponse.json()).resolves.toMatchObject({
      error: {
        message: "No additional bundles are available to generate.",
      },
    });
  });
});
