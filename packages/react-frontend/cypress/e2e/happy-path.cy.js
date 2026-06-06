/**
 * End-to-end "happy path" for RecipeCollab.
 *
 * Walks a new user through the main flow and visits every view of the app:
 * landing -> sign up -> sign in -> recipes -> recipe detail -> pantry ->
 * groups -> group detail -> approvals -> favorites -> profile -> add recipe.
 *
 * The backend is stubbed via cy.intercept() (see cypress/support/commands.js)
 * so the suite runs against just the Vite dev server, no database required.
 */
describe("RecipeCollab happy path", () => {
  beforeEach(() => {
    cy.stubBackend();
  });

  it("walks a user through every view of the app", () => {
    // 1. Landing page
    cy.visit("/");
    cy.contains("RecipeCollab").should("be.visible");
    cy.contains("smarter dinners").should("be.visible");

    // 2. Sign-up view (reachable from the landing CTA)
    cy.contains("a", "Create Account").click();
    cy.location("pathname").should("eq", "/signup");
    cy.contains("Start cooking together.").should("be.visible");

    // 3. Sign-in view
    cy.contains("a", "RecipeCollab").click(); // back to landing
    cy.contains("a", "Sign In").click();
    cy.location("pathname").should("eq", "/signin");
    cy.contains("Your group dinner starts here.").should("be.visible");

    // 4. Sign in (stubbed auth) -> redirected to Groups
    cy.get('input[name="email"]').type("tester@example.com");
    cy.get('input[name="password"]').type("supersecret");
    cy.get('form').submit();
    cy.wait("@signin");
    cy.location("pathname").should("eq", "/groups");

    // 5. Groups view
    cy.contains("Your Groups").should("be.visible");
    cy.contains("Saturday Dinner Club").should("be.visible");

    // 6. Group detail view
    cy.visit("/groups/group-1");
    cy.contains("Saturday Dinner Club").should("be.visible");

    // 7. Pantry view
    cy.visit("/pantry");
    cy.contains("My Pantry").should("be.visible");
    cy.contains("Add from Database").should("be.visible");

    // 8. Approvals view
    cy.visit("/approvals");
    cy.contains("Approvals").should("be.visible");

    // 9. Favorites view
    cy.visit("/favorites");
    cy.contains("Favorites").should("be.visible");

    // 10. Profile view
    cy.visit("/profile");
    cy.contains("Profile").should("be.visible");

    // 11. Recipes list view
    cy.visit("/recipes");
    cy.contains("What's cooking").should("be.visible");
    cy.contains("Trending Recipes").should("be.visible");

    // 12. Recipe detail view (static recipe data)
    cy.visit("/recipes/creamy-tuscan-chicken");
    cy.contains("Creamy Tuscan Chicken").should("be.visible");
    cy.contains("Ingredients").should("be.visible");

    // 13. Add recipe view
    cy.visit("/add-recipe");
    cy.contains("Add Recipe").should("be.visible");
  });
});
