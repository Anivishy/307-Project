# Testing

_Last updated: June 5, 2026_

RecipeCollab is tested at three levels. We use **Vitest** (Jest-compatible API)
for unit and component tests and **Cypress** for an end-to-end happy-path test.

| Level | Target | Tool | Location |
| --- | --- | --- | --- |
| Backend model/services | `*-service` modules + domain logic (the **M**) | Vitest (node) | `packages/backend/src/**/*.test.ts` |
| React component | Stateful components & pages (the **V**) | Vitest + Testing Library (jsdom) | `packages/react-frontend/src/**/*.test.{js,jsx}` |
| End-to-end | Full app happy path across every view | Cypress | `packages/react-frontend/cypress/e2e/` |

## 1. Backend model & service tests (Vitest)

Route handlers in `src/app/api/**/route.ts` are intentionally thin; all database
logic is factored into `src/lib/*-service.ts` modules, which are the unit-test
target. Existing suites cover the services and domain rules, e.g.
`profile-service`, `group-settings-service`, `ingredient-catalog-service`,
`notification-service`, `bundle-generation-service`, the `constraints` validator,
the `spoonacular` client/mappers, and the user-story regression tests
(`us1`–`us16`).

Run them:

```bash
npm test --prefix packages/backend
```

Coverage report (text + HTML in `packages/backend/coverage/`):

```bash
npm run test:coverage --prefix packages/backend
```

> The services use a mocked Prisma client, so no live database is required to run
> the backend tests. The suite is also hermetic with respect to Spoonacular:
> `src/test/setup.ts` forces mock mode so a developer's local `.env.local`
> (which may hold a real API key) cannot flip tests into live mode. Tests that
> exercise the live path override this with `vi.stubEnv(...)`.

## 2. React component tests (Vitest + Testing Library)

We test non-trivial, stateful components — each holds `useState` and has several
inputs/buttons — including `PantryPage`, `GroupsPage`, `GroupDetailPage`,
`ProfilePage`, `SignInPage`, `AuthCallbackPage`, `BundleCandidateCard`, and
`NotificationBell`.

Run them:

```bash
npm test --prefix packages/react-frontend
```

Coverage report (text + HTML in `packages/react-frontend/coverage/`):

```bash
npm run test:coverage --prefix packages/react-frontend
```

## 3. End-to-end test (Cypress)

[`cypress/e2e/happy-path.cy.js`](../packages/react-frontend/cypress/e2e/happy-path.cy.js)
walks a new user through the main flow and **visits every view** of the app:
landing → sign up → sign in → groups → group detail → pantry → approvals →
favorites → profile → recipes → recipe detail → add recipe.

The backend is stubbed with `cy.intercept()` (see
[`cypress/support/commands.js`](../packages/react-frontend/cypress/support/commands.js)),
so the suite runs against just the Vite dev server — no database or running
backend required.

### Run it

One command boots the dev server, waits for it, runs Cypress headless, then
shuts the server down:

```bash
npm run e2e --prefix packages/react-frontend
```

Or interactively, with the dev server already running (`npm run dev`):

```bash
npm run cy:open --prefix packages/react-frontend
```

> First run downloads the Cypress binary, so run `npm install` in
> `packages/react-frontend` beforehand and allow extra time.

## Continuous integration

[.github/workflows/ci-testing.yml](../.github/workflows/ci-testing.yml) runs the
backend and frontend Vitest suites (plus lint and build) on every push and pull
request to `main`.
