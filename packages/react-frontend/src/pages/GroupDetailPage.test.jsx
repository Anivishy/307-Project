import { render, screen } from "@testing-library/react";
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
    fetchMock = vi.fn(async (input) => {
      const url = String(input);
      const payload = url.endsWith("/members")
        ? membersPayload
        : groupPayload;

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
    expect(screen.getByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(screen.getAllByText("Avery Cook").length).toBeGreaterThan(0);
    expect(screen.getByText("2 cups")).toBeInTheDocument();
    expect(screen.getByText("4 pcs")).toBeInTheDocument();
  });
});
