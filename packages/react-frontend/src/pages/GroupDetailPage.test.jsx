import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GroupDetailPage } from "./GroupDetailPage.jsx";

const groupSettingsPayload = {
  groupId: "dorm-dinner-crew",
  groupName: "Dorm Dinner Crew",
  allowMissingIngredients: true,
  staplesEnabled: true,
  defaultStaplesPreset: [
    { id: "olive-oil", name: "Olive oil" },
    { id: "butter", name: "Butter" },
    { id: "salt", name: "Salt" },
    { id: "pepper", name: "Pepper" },
  ],
  customStaples: [{ id: "basil-leaves", name: "Basil leaves" }],
  ingredientCatalog: [
    { id: "olive-oil", name: "Olive oil" },
    { id: "butter", name: "Butter" },
    { id: "salt", name: "Salt" },
    { id: "pepper", name: "Pepper" },
    { id: "basil-leaves", name: "Basil leaves" },
    { id: "thyme", name: "Fresh thyme" },
  ],
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
      assumedStaples: [{ ingredientId: "salt", name: "Salt" }],
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
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (input) => {
      const url = String(input);
      const payload = url.endsWith("/settings") ? groupSettingsPayload : bundleCandidatePayload;

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);
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

  it("shows default staples and saves a custom staple update", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await screen.findByText("Olive oil");
    expect(screen.getByText("Basil leaves")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search ingredient suggestions"), "Fresh thyme");
    await user.click(screen.getByRole("button", { name: "Add Staple" }));
    await user.click(screen.getByRole("button", { name: /Save Staples/i }));

    const settingsPatchCall = fetchMock.mock.calls.find(
      ([url, options]) => String(url).endsWith("/settings") && options?.method === "PATCH",
    );

    expect(settingsPatchCall).toBeDefined();
    expect(JSON.parse(settingsPatchCall[1].body)).toMatchObject({
      staplesEnabled: true,
      customStaples: ["basil-leaves", "thyme"],
    });
  });
});
