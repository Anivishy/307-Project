// Custom Cypress commands shared across specs.

// Stubs every backend `/api/**` call with sensible defaults so the end-to-end
// happy path can run without a live backend or database. Individual specs can
// still override these with more specific cy.intercept() calls.
Cypress.Commands.add("stubBackend", () => {
  const profileId = "11111111-1111-1111-1111-111111111111";

  // NOTE: when several intercepts match a request, Cypress runs the most
  // recently registered one first. So the broad catch-all is registered FIRST
  // and the specific stubs below override it.
  cy.intercept("GET", "/api/**", { statusCode: 200, body: {} });

  cy.intercept("POST", "/api/auth/password/signin", {
    statusCode: 200,
    body: {
      session: {
        profileId,
        email: "tester@example.com",
        displayName: "Casey Tester",
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        // Far-future expiry so the client never tries to refresh mid-test.
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
      },
    },
  }).as("signin");

  cy.intercept("GET", "/api/groups", {
    statusCode: 200,
    body: {
      groups: [
        {
          id: "group-1",
          name: "Saturday Dinner Club",
          description: "Shared pantry group.",
          role: "Admin",
          members: 3,
          inviteCode: "DINNER-AB12",
        },
      ],
    },
  }).as("groups");

  cy.intercept("GET", "/api/groups/*", {
    statusCode: 200,
    body: {
      id: "group-1",
      name: "Saturday Dinner Club",
      description: "Shared pantry group.",
      role: "OWNER",
      inviteCode: "DINNER-AB12",
      members: [],
    },
  });

  cy.intercept("GET", "/api/groups/*/members", {
    statusCode: 200,
    body: { members: [] },
  });

  cy.intercept("GET", "/api/ingredients*", {
    statusCode: 200,
    body: { ingredients: [] },
  });

  cy.intercept("GET", "/api/ingredients/catalog*", {
    statusCode: 200,
    body: { ingredients: [] },
  });

  cy.intercept("GET", "/api/profiles/me", {
    statusCode: 200,
    body: { profile: { id: profileId, email: "tester@example.com" } },
  });

  cy.intercept("GET", "/api/profile/constraints", {
    statusCode: 200,
    body: { constraints: {} },
  });

  cy.intercept("GET", "/api/notifications*", {
    statusCode: 200,
    body: { notifications: [], unreadCount: 0 },
  });
});
