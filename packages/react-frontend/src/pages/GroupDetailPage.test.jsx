import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import { GroupDetailPage } from "./GroupDetailPage.jsx";

const groupPayload = {
  id: "dorm-dinner-crew",
  name: "Dorm Dinner Crew",
  description: "Weekend cooking group.",
  role: "Admin",
  inviteCode: "DINNER42"
};

const membersPayload = {
  members: [
    {
      profileId: "profile-avery",
      displayName: "Avery Cook",
      email: "avery@example.com",
      role: "Admin",
      ingredients: [
        {
          id: "rice",
          name: "Rice",
          quantity: 2,
          unit: "cups"
        },
        {
          id: "tomato",
          name: "Tomato",
          quantity: 4,
          unit: "pcs"
        }
      ]
    },
    {
      profileId: "profile-sam",
      displayName: "Sam Prep",
      email: "sam@example.com",
      role: "Member",
      ingredients: []
    }
  ]
};

const groupSettingsPayload = {
  groupId: "dorm-dinner-crew",
  groupName: "Dorm Dinner Crew",
  allowMissingIngredients: true,
  staplesEnabled: true,
  defaultStaplesPreset: [
    { id: "olive-oil", name: "Olive oil" },
    { id: "butter", name: "Butter" },
    { id: "salt", name: "Salt" },
    { id: "pepper", name: "Pepper" }
  ],
  customStaples: [{ id: "basil-leaves", name: "Basil leaves" }],
  ingredientCatalog: [
    { id: "olive-oil", name: "Olive oil" },
    { id: "butter", name: "Butter" },
    { id: "salt", name: "Salt" },
    { id: "pepper", name: "Pepper" },
    { id: "basil-leaves", name: "Basil leaves" },
    { id: "thyme", name: "Fresh thyme" }
  ],
  updatedAt: "2026-05-11T07:00:00.000Z",
  viewerRole: "admin"
};

const bundleCandidatesPayload = {
  groupId: "dorm-dinner-crew",
  groupName: "Dorm Dinner Crew",
  candidateSetId: "dorm-dinner-crew:3:1",
  pantrySnapshotVersion: 3,
  activeBundleVersion: 1,
  selectedBundleId: null,
  candidates: [
    {
      id: "bundle-creamy-tuscan-night",
      title: "Creamy Tuscan Night",
      rationale: "Fits a cozy shared dinner using ingredients already in the group pantry.",
      courses: [
        { type: "appetizer", title: "Garlic Tomato Toasts" },
        { type: "main", title: "Creamy Tuscan Chicken" }
      ],
      ingredientList: [
        {
          ingredientId: "tomatoes",
          name: "Tomatoes",
          quantity: 2,
          unit: "whole"
        },
        {
          ingredientId: "cream",
          name: "Cream",
          quantity: 1,
          unit: "cups"
        }
      ],
      pantrySnapshotVersion: 3,
      activeBundleVersion: 1,
      isSelected: false
    }
  ]
};

function renderGroupDetailPage() {
  render(
    <MemoryRouter initialEntries={["/groups/dorm-dinner-crew"]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("GroupDetailPage", () => {
  let fetchMock;
  let rejectNextSelectionAsStale;

  beforeEach(() => {
    rejectNextSelectionAsStale = false;
    fetchMock = vi.fn(async (input, options) => {
      const url = String(input);
      let payload = groupPayload;
      let status = 200;

      if (url.endsWith("/members")) {
        payload = membersPayload;
      }

      if (url.endsWith("/bundle-candidates")) {
        payload = bundleCandidatesPayload;
      }

      if (url.endsWith("/bundle-candidates/select")) {
        const body = JSON.parse(options.body);

        if (rejectNextSelectionAsStale && !body.force) {
          rejectNextSelectionAsStale = false;
          status = 409;
          payload = {
            error: {
              code: "staleCandidate",
              message: "Candidate set is stale. Refresh or explicitly confirm before selecting.",
              details: {
                submitted: {
                  pantrySnapshotVersion: 3,
                  activeBundleVersion: 1
                },
                current: {
                  pantrySnapshotVersion: 4,
                  activeBundleVersion: 2
                },
                stalePantrySnapshot: true,
                staleActiveBundle: true
              }
            }
          };
        } else {
          payload = {
            selectedBundleId: body.bundleId,
            selectedBundleTitle: "Creamy Tuscan Night",
            pantrySnapshotVersion: 4,
            activeBundleVersion: 2,
            reservationCount: 2,
            releasedReservationCount: 0,
            appliedReservationCount: 2,
            forced: Boolean(body.force)
          };
        }
      }

      if (url.endsWith("/settings")) {
        if (options?.method === "PATCH") {
          const body = JSON.parse(options.body);
          payload = {
            ...groupSettingsPayload,
            ...body,
            customStaples: (
              body.customStaples ??
              groupSettingsPayload.customStaples.map((item) => item.id)
            )
              .map((id) =>
                groupSettingsPayload.ingredientCatalog.find(
                  (item) => item.id === id
                )
              )
              .filter(Boolean)
          };
        } else {
          payload = groupSettingsPayload;
        }
      }

      return new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" }
      });
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads group details and member pantry counts", async () => {
    renderGroupDetailPage();

    expect(
      await screen.findByText("Dorm Dinner Crew")
    ).toBeInTheDocument();
    expect(screen.getByText("DINNER42")).toBeInTheDocument();
    expect(screen.getByText("Avery Cook")).toBeInTheDocument();
    expect(screen.getByText("Sam Prep")).toBeInTheDocument();
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("shows the combined pantry tab", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    expect(
      await screen.findByText("Dorm Dinner Crew")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Pantry/i })
    );

    expect(screen.getByText("Combined Pantry")).toBeInTheDocument();
    expect(screen.getByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(screen.getAllByText("Avery Cook").length).toBeGreaterThan(0);
    expect(screen.getByText("2 cups")).toBeInTheDocument();
    expect(screen.getByText("4 pcs")).toBeInTheDocument();
  });

  it("shows the admin settings tab and reflects the current missing-ingredient setting", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /settings/i }));

    const toggle = await screen.findByRole("checkbox", {
      name: "Allow Missing Ingredients"
    });

    expect(toggle).toBeChecked();
  });

  it("saves the missing-ingredient setting from the admin tab", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /settings/i }));
    await user.click(
      await screen.findByRole("checkbox", {
        name: "Allow Missing Ingredients"
      })
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, options]) =>
            String(url).endsWith("/settings") &&
            options?.method === "PATCH" &&
            JSON.parse(options.body).allowMissingIngredients === false
        )
      ).toBe(true);
    });
  });

  it("shows default staples and saves a custom staple update", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /settings/i }));

    await screen.findByText("Olive oil");
    expect(screen.getByText("Basil leaves")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Search ingredient suggestions"),
      "Fresh thyme"
    );
    await user.click(screen.getByRole("button", { name: "Add Staple" }));
    await user.click(screen.getByRole("button", { name: /Save Staples/i }));

    const settingsPatchCall = fetchMock.mock.calls.find(
      ([url, options]) =>
        String(url).endsWith("/settings") && options?.method === "PATCH"
    );

    expect(settingsPatchCall).toBeDefined();
    expect(JSON.parse(settingsPatchCall[1].body)).toMatchObject({
      staplesEnabled: true,
      customStaples: ["basil-leaves", "thyme"]
    });
  });

  it("shows stale warning and proceeds with explicit confirmation", async () => {
    rejectNextSelectionAsStale = true;
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /recipes/i }));
    await screen.findByText("Creamy Tuscan Night");
    await user.click(screen.getByRole("button", { name: /select bundle/i }));

    const dialog = await screen.findByRole("dialog", {
      name: /stale candidate set/i
    });
    expect(
      within(dialog).getByText(
        /Pantry or active bundle data changed since this candidate list was generated/i
      )
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: /proceed anyway/i })
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url, options]) => {
          if (!String(url).endsWith("/bundle-candidates/select")) return false;
          return JSON.parse(options.body).force === true;
        })
      ).toBe(true);
    });

    expect(
      await screen.findByText("Creamy Tuscan Night selected.")
    ).toBeInTheDocument();
  });

  it("refreshes candidates from the stale warning", async () => {
    rejectNextSelectionAsStale = true;
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /recipes/i }));
    await screen.findByText("Creamy Tuscan Night");
    await user.click(screen.getByRole("button", { name: /select bundle/i }));

    const dialog = await screen.findByRole("dialog", {
      name: /stale candidate set/i
    });
    await user.click(
      within(dialog).getByRole("button", { name: /refresh candidates/i })
    );

    await waitFor(() => {
      const candidateRefreshCalls = fetchMock.mock.calls.filter(
        ([url, options]) =>
          String(url).endsWith("/bundle-candidates") && !options?.method
      );
      expect(candidateRefreshCalls.length).toBeGreaterThanOrEqual(2);
    });

    expect(
      screen.queryByRole("dialog", { name: /stale candidate set/i })
    ).not.toBeInTheDocument();
  });
});
