import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GroupDetailPage } from "./GroupDetailPage.jsx";

const groupSettingsPayload = {
  groupId: "dorm-dinner-crew",
  groupName: "Dorm Dinner Crew",
  allowMissingIngredients: true,
  updatedAt: "2026-05-11T07:00:00.000Z",
  viewerRole: "admin",
};

const bundleCandidatePayload = {
  groupId: "dorm-dinner-crew",
  groupName: "Dorm Dinner Crew",
  allowMissingIngredients: true,
  viewerRole: "admin",
  filteredOutCandidateCount: 0,
  candidates: [
    {
      id: "bundle-saffron-pasta-night",
      title: "Saffron Pasta Night",
      courses: [{ type: "main", title: "Saffron Tomato Pasta" }],
      rationale: "Missing items are disclosed so the group can decide whether shopping is worth it.",
      missingIngredients: [
        {
          ingredientId: "saffron-threads",
          name: "Saffron threads",
          quantityNeeded: 1,
          unit: "tbsp",
        },
      ],
    },
  ],
};

function renderGroupDetailPage() {
  render(
    <MemoryRouter initialEntries={["/groups/dorm-dinner-crew"]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GroupDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input) => {
        const url = String(input);
        const payload = url.endsWith("/settings") ? groupSettingsPayload : bundleCandidatePayload;

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reflects the current allowMissingIngredients setting on load", async () => {
    renderGroupDetailPage();

    const toggle = await screen.findByRole("checkbox", {
      name: "Allow Missing Ingredients",
    });

    expect(toggle).toBeChecked();
  });

  it("shows missing ingredient disclosures on bundle cards when enabled", async () => {
    renderGroupDetailPage();

    await screen.findByText("Saffron Pasta Night");

    expect(screen.getByText("Missing Items")).toBeInTheDocument();
    expect(screen.getByText("1 tbsp Saffron threads")).toBeInTheDocument();
  });
});
