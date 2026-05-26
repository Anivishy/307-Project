import { render, screen, waitFor } from "@testing-library/react";
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

const groupInfoPayload = {
  id: "dorm-dinner-crew",
  name: "Dorm Dinner Crew",
  description: "Shared pantry group.",
  inviteCode: "DORM-1234",
  role: "Admin",
  members: 1,
  pantrySnapshotVersion: 1,
  activeBundleVersion: 1,
  selectedBundleId: null,
  createdAt: "2026-05-11T07:00:00.000Z",
  updatedAt: "2026-05-11T07:00:00.000Z",
};

const groupMembersPayload = {
  members: [
    {
      profileId: "profile-1",
      displayName: "Vinayak",
      email: "vinayak@example.com",
      role: "Admin",
      joinedAt: "2026-05-11T07:00:00.000Z",
      ingredients: [],
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
    fetchMock = vi.fn(async (input, options) => {
      const url = String(input);
      let payload = groupInfoPayload;

      if (url.endsWith("/members")) {
        payload = groupMembersPayload;
      }

      if (url.endsWith("/settings")) {
        if (options?.method === "PATCH") {
          const body = JSON.parse(options.body);
          payload = {
            ...groupSettingsPayload,
            ...body,
            customStaples: (body.customStaples ?? groupSettingsPayload.customStaples.map((item) => item.id))
              .map((id) => groupSettingsPayload.ingredientCatalog.find((item) => item.id === id))
              .filter(Boolean),
          };
        } else {
          payload = groupSettingsPayload;
        }
      }

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

  it("shows the admin settings tab and reflects the current missing-ingredient setting", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /settings/i }));

    const toggle = await screen.findByRole("checkbox", {
      name: "Allow Missing Ingredients",
    });

    expect(toggle).toBeChecked();
  });

  it("saves the missing-ingredient setting from the admin tab", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /settings/i }));
    await user.click(
      await screen.findByRole("checkbox", {
        name: "Allow Missing Ingredients",
      }),
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, options]) =>
            String(url).endsWith("/settings") &&
            options?.method === "PATCH" &&
            JSON.parse(options.body).allowMissingIngredients === false,
        ),
      ).toBe(true);
    });
  });

  it("shows default staples and saves a custom staple update", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /settings/i }));

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
