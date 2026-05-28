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

const groupPantryPayload = {
  pantry: [
    {
      ingredientId: "rice",
      name: "Rice",
      quantity: 5,
      unit: "cups",
      owners: [
        {
          userId: "profile-avery",
          displayName: "Avery Cook",
          initials: "AC",
          avatarUrl: null,
          quantity: 2,
          unit: "cups"
        },
        {
          userId: "profile-sam",
          displayName: "Sam Prep",
          initials: "SP",
          avatarUrl: null,
          quantity: 3,
          unit: "cups"
        }
      ]
    },
    {
      ingredientId: "tomato",
      name: "Tomato",
      quantity: 4,
      unit: "pcs",
      owners: [
        {
          userId: "profile-avery",
          displayName: "Avery Cook",
          initials: "AC",
          avatarUrl: null,
          quantity: 4,
          unit: "pcs"
        }
      ]
    }
  ]
};

const samPantryPayload = {
  pantry: [
    {
      ingredientId: "rice",
      name: "Rice",
      quantity: 3,
      unit: "cups",
      owners: [
        {
          userId: "profile-sam",
          displayName: "Sam Prep",
          initials: "SP",
          avatarUrl: null,
          quantity: 3,
          unit: "cups"
        }
      ]
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

  beforeEach(() => {
    fetchMock = vi.fn(async (input, options) => {
      const url = String(input);
      const parsedUrl = new URL(url, "http://localhost");
      let payload = groupPayload;

      if (url.endsWith("/members")) {
        payload = membersPayload;
      }

      if (parsedUrl.pathname.endsWith("/pantry")) {
        payload =
          parsedUrl.searchParams.get("ownerId") === "profile-sam"
            ? samPantryPayload
            : groupPantryPayload;
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
        status: 200,
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
    expect(await screen.findByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Owners: Avery Cook, Sam Prep")
    ).toBeInTheDocument();
    expect(screen.getAllByText("AC").length).toBeGreaterThan(0);
    expect(screen.getByText("SP")).toBeInTheDocument();
    expect(screen.getByText("5 cups")).toBeInTheDocument();
    expect(screen.getByText("4 pcs")).toBeInTheDocument();
  });

  it("filters the combined pantry by owner", async () => {
    const user = userEvent.setup();
    renderGroupDetailPage();

    await user.click(await screen.findByRole("button", { name: /Pantry/i }));
    await screen.findByText("Tomato");

    await user.selectOptions(
      screen.getByLabelText("Filter pantry by owner"),
      "profile-sam"
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("/pantry?ownerId=profile-sam")
        )
      ).toBe(true);
    });

    expect(await screen.findByText("3 cups")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Tomato")).not.toBeInTheDocument();
    });
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
});
