import { render, screen, waitFor } from "@testing-library/react";
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
import { GroupDetailPage } from "@/pages/GroupDetailPage.jsx";

const catalogLookup = {
  "olive-oil": { id: "olive-oil", name: "Olive oil" },
  butter: { id: "butter", name: "Butter" },
  salt: { id: "salt", name: "Salt" },
  pepper: { id: "pepper", name: "Pepper" },
  "basil-leaves": { id: "basil-leaves", name: "Basil leaves" },
  thyme: { id: "thyme", name: "Fresh thyme" }
};

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
    catalogLookup["olive-oil"],
    catalogLookup.butter,
    catalogLookup.salt,
    catalogLookup.pepper
  ],
  customStaples: [catalogLookup["basil-leaves"]],
  updatedAt: "2026-05-11T07:00:00.000Z",
  viewerRole: "admin"
};

const spoonacularModePayload = {
  catalog: "mock",
  generation: "mock",
  hasApiKey: true
};

function createBundleCandidate(overrides = {}) {
  return {
    id: "bundle-garden-pasta-board",
    title: "Garden Pasta Board",
    rationale: "A pantry-driven pasta board.",
    isSelected: false,
    pantrySnapshotVersion: 3,
    activeBundleVersion: 1,
    courses: [
      { type: "main", title: "Garlic Garden Pasta" },
      { type: "side", title: "Toasted Bread Board" }
    ],
    missingIngredients: [{ name: "Basil leaves" }],
    assumedStaples: [{ ingredientId: "salt", name: "Salt" }],
    ingredientList: [
      {
        ingredientId: "pasta",
        name: "Pasta",
        quantity: 1,
        unit: "boxes"
      }
    ],
    contributorMapping: {
      pasta: [
        {
          userId: "profile-avery",
          userName: "Avery Cook",
          quantity: 1,
          unit: "boxes"
        }
      ]
    },
    instructions: ["Boil the pasta.", "Serve with bread."],
    ...overrides
  };
}

function createBundleCandidatesPayload(overrides = {}) {
  return {
    groupId: "dorm-dinner-crew",
    allowMissingIngredients: true,
    staplesEnabled: true,
    pantrySnapshotVersion: 3,
    activeBundleVersion: 1,
    candidateSetId: "dorm-dinner-crew:3:1",
    filteredOutCandidateCount: 0,
    needsGeneration: false,
    candidates: [createBundleCandidate()],
    ...overrides
  };
}

function renderGroupDetailPage() {
  render(
    <MemoryRouter initialEntries={["/groups/dorm-dinner-crew"]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function openRecipesTab(user) {
  await user.click(await screen.findByRole("button", { name: /recipes/i }));
  expect(
    await screen.findByText(/Spoonacular mode: catalog mock, generation mock/i)
  ).toBeInTheDocument();
}

describe("GroupDetailPage", () => {
  let fetchMock;
  let groupRole;
  let bundleCandidatesPayload;
  let selectResponseStatus;
  let generateResponseStatus;

  beforeEach(() => {
    groupRole = "Admin";
    bundleCandidatesPayload = createBundleCandidatesPayload();
    selectResponseStatus = 200;
    generateResponseStatus = 200;

    fetchMock = vi.fn(async (input, options) => {
      const url = String(input);
      const method = options?.method ?? "GET";

      if (url.includes("/api/ingredients/catalog")) {
        return new Response(
          JSON.stringify({
            ingredients: [catalogLookup.thyme]
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (url.includes("/api/spoonacular/mode")) {
        return new Response(JSON.stringify(spoonacularModePayload), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (url.includes("/bundle-candidates/select") && method === "POST") {
        if (selectResponseStatus === 409) {
          return new Response(
            JSON.stringify({
              error: {
                code: "apiError",
                message:
                  "Candidate set is stale. Refresh or explicitly confirm before selecting."
              }
            }),
            {
              status: 409,
              headers: { "content-type": "application/json" }
            }
          );
        }

        bundleCandidatesPayload = createBundleCandidatesPayload({
          candidates: [
            createBundleCandidate({
              isSelected: true
            })
          ],
          activeBundleVersion: 2
        });

        return new Response(
          JSON.stringify({
            selectedBundleId: "bundle-garden-pasta-board",
            activeBundleVersion: 2
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (url.includes("/bundle-candidates/more") && method === "POST") {
        return new Response(JSON.stringify(bundleCandidatesPayload), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (url.includes("/bundle-candidates") && method === "POST") {
        if (generateResponseStatus === 503) {
          return new Response(
            JSON.stringify({
              error: {
                code: "apiError",
                message:
                  "Spoonacular API quota exceeded. Try again later or enable mock generation."
              }
            }),
            {
              status: 503,
              headers: { "content-type": "application/json" }
            }
          );
        }

        bundleCandidatesPayload = createBundleCandidatesPayload({
          candidateSetId: "dorm-dinner-crew:3:2",
          candidates: [
            createBundleCandidate({ id: "bundle-new-1", title: "New Bundle One" }),
            createBundleCandidate({ id: "bundle-new-2", title: "New Bundle Two" }),
            createBundleCandidate({ id: "bundle-new-3", title: "New Bundle Three" })
          ]
        });

        return new Response(JSON.stringify(bundleCandidatesPayload), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (url.includes("/bundle-candidates")) {
        return new Response(JSON.stringify(bundleCandidatesPayload), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (url.endsWith("/members")) {
        return new Response(JSON.stringify(membersPayload), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (url.endsWith("/settings")) {
        if (method === "PATCH") {
          const body = JSON.parse(options.body);
          const nextSettings = {
            ...groupSettingsPayload,
            ...body,
            customStaples: (
              body.customStaples ??
              groupSettingsPayload.customStaples.map((item) => item.id)
            )
              .map((id) => catalogLookup[id])
              .filter(Boolean)
          };

          return new Response(JSON.stringify(nextSettings), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }

        return new Response(JSON.stringify(groupSettingsPayload), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify({
          ...groupPayload,
          role: groupRole
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
    expect(
      await screen.findByRole("button", { name: /Fresh thyme/i })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Fresh thyme/i })
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

  describe("Recipes tab", () => {
    it("renders candidates, validation summary, and spoonacular mode", async () => {
      const user = userEvent.setup();
      renderGroupDetailPage();

      await openRecipesTab(user);

      expect(screen.getByText("Garden Pasta Board")).toBeInTheDocument();
      expect(screen.getByText("Missing items")).toBeInTheDocument();
      expect(
        screen.getByText(/Validation: missing ingredients allowed; staples enabled/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Generate 3 Bundles/i })
      ).toBeInTheDocument();
    });

    it("hides generation controls for non-admin members", async () => {
      groupRole = "Member";
      const user = userEvent.setup();
      renderGroupDetailPage();

      await openRecipesTab(user);

      expect(screen.getByText("Garden Pasta Board")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Generate 3 Bundles/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Select as active bundle/i })
      ).not.toBeInTheDocument();
    });

    it("generates bundles after confirming replacement", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const user = userEvent.setup();
      renderGroupDetailPage();

      await openRecipesTab(user);
      await user.click(
        screen.getByRole("button", { name: /Generate 3 Bundles/i })
      );

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(screen.getByText("New Bundle One")).toBeInTheDocument();
      });

      expect(
        fetchMock.mock.calls.some(
          ([url, options]) =>
            String(url).includes("/bundle-candidates") &&
            options?.method === "POST" &&
            !String(url).includes("/select") &&
            !String(url).includes("/more")
        )
      ).toBe(true);
    });

    it("shows quota guidance when generation returns 503", async () => {
      generateResponseStatus = 503;
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const user = userEvent.setup();
      renderGroupDetailPage();

      await openRecipesTab(user);
      await user.click(
        screen.getByRole("button", { name: /Generate 3 Bundles/i })
      );

      expect(
        await screen.findByText(/Spoonacular API quota exceeded/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/SPOONACULAR_MOCK_GENERATION=true/i)
      ).toBeInTheDocument();
      expect(confirmSpy).toHaveBeenCalled();
    });

    it("selects a bundle and marks it active", async () => {
      const user = userEvent.setup();
      renderGroupDetailPage();

      await openRecipesTab(user);
      await user.click(
        screen.getByRole("button", { name: /Select as active bundle/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });

      expect(
        fetchMock.mock.calls.some(
          ([url, options]) =>
            String(url).includes("/bundle-candidates/select") &&
            options?.method === "POST"
        )
      ).toBe(true);
    });

    it("shows stale selection UI on 409 responses", async () => {
      selectResponseStatus = 409;
      const user = userEvent.setup();
      renderGroupDetailPage();

      await openRecipesTab(user);
      await user.click(
        screen.getByRole("button", { name: /Select as active bundle/i })
      );

      expect(await screen.findByText("Stale candidate set")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Refresh candidates/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Select anyway/i })
      ).toBeInTheDocument();
    });
  });
});
